import { GoogleGenAI } from "@google/genai";

export interface QuizQuestion {
  id: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DifficultyCounts {
  easy: number;
  medium: number;
  hard: number;
}

interface RawQuestion {
  topic?: unknown;
  difficulty?: unknown;
  question?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
}

interface ValidatedQuestion {
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function isValidQuestion(q: RawQuestion): q is ValidatedQuestion {
  return (
    typeof q.topic === "string" &&
    (q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard") &&
    typeof q.question === "string" &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every((o) => typeof o === "string") &&
    typeof q.correctIndex === "number" &&
    q.correctIndex >= 0 &&
    q.correctIndex <= 3 &&
    typeof q.explanation === "string"
  );
}

// Mirrors the tutor skill's two driving principles (relational over
// instrumental understanding; fighting the illusion of competence) applied
// to exam-style MCQ generation rather than a taught lesson — questions test
// application/reasoning, not keyword-spotting, and distractors are plausible
// enough that guessing without understanding fails.
export async function generateQuizQuestions(
  subject: string,
  content: string,
  counts: DifficultyCounts
): Promise<QuizQuestion[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  if (!content.trim()) throw new Error("No extractable text content from the selected files");

  const total = counts.easy + counts.medium + counts.hard;
  if (total <= 0) throw new Error("At least one question must be requested");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an MBA professor at SPJIMR helping a student prepare for exams.

The input below is raw text extracted from PowerPoint lecture slides — bullet points, framework names, and sparse notes exactly as they appear on slides, without the verbal explanations given in class.

SUBJECT: ${subject}

SLIDE CONTENT:
${content.trim()}

STEP 1 — RECONSTRUCT (keep in your reasoning, do NOT output):
For each concept, framework, or model mentioned in the slides, expand it as you would explain it to students: what it means, how it works mechanically, why it matters, a concrete example or scenario where it applies, and the most common misconceptions about it. Use your expert knowledge to fill the gaps the bullet points leave — the slides are the curriculum anchor (what topics to cover), not the limit of what you know.

STEP 2 — GENERATE:
From that reconstructed understanding, generate exactly ${counts.easy} easy, ${counts.medium} medium, and ${counts.hard} hard multiple-choice questions (${total} total).

DIFFICULTY MEANS:
- easy: understanding a definition or core mechanism of a concept from the slides
- medium: applying a concept to a scenario, or distinguishing between two related ideas
- hard: multi-step reasoning, synthesising across concepts, or identifying which framework applies in a non-obvious case

Two non-negotiable principles: (1) a good question can't be answered by spotting a keyword from the slides — it requires following the actual reasoning; (2) distractors must be plausible misconceptions, not throwaway wrong options — the wrong-but-tempting option is where the learning is.

For each question assign a short "topic" label (2–4 words, e.g. "Capital Structure", "NPV vs IRR").

The explanation must name the most tempting wrong option and say specifically why it's wrong.

Output ONLY a valid JSON array, each item shaped exactly like this:
{"topic": "string", "difficulty": "easy"|"medium"|"hard", "question": "string", "options": ["string","string","string","string"], "correctIndex": 0, "explanation": "1-2 sentences: why the correct answer is right, and specifically why the most tempting wrong option is wrong"}

Exactly 4 options per question, exactly one correct (correctIndex 0-3). No markdown, no preamble, no trailing commentary — output the JSON array only.`;

  const result = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
  const text = result.text ?? "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Gemini did not return a parseable question set");

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("Gemini returned malformed JSON for the question set");
  }
  if (!Array.isArray(parsed)) throw new Error("Gemini's response was not a list of questions");

  const questions = parsed
    .filter((q): q is RawQuestion => typeof q === "object" && q !== null)
    .filter(isValidQuestion)
    .map(
      (q, i): QuizQuestion => ({
        id: `q${i}`,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })
    );

  if (questions.length === 0) throw new Error("No valid questions were generated");
  return questions;
}
