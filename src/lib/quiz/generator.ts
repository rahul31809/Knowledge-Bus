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

  const prompt = `You are an MBA tutor at SPJIMR creating an exam-style quiz from this class material. Two principles: (1) test genuine understanding and application, not just recall — a good question can't be answered by spotting a keyword, it requires following the actual reasoning; (2) fight the illusion of competence — distractors should be plausible enough that guessing without understanding fails.

SUBJECT: ${subject}

MATERIAL:
${content.trim()}

Generate exactly ${counts.easy} easy, ${counts.medium} medium, and ${counts.hard} hard multiple-choice questions (${total} total) grounded only in this material.

DIFFICULTY MEANS:
- easy: recall of a definition, framework name, or fact stated directly in the material
- medium: applying a concept to a short scenario, or distinguishing between two related ideas from the material
- hard: multi-step reasoning, synthesizing across multiple parts of the material, or identifying which framework/approach applies in a non-obvious case

For each question, assign a short "topic" label (2-4 words, e.g. "Capital Structure", "NPV vs IRR") so a learner's wrong answers can later be grouped by topic to reveal where they're weak.

For each option that isn't correct, make it a genuinely tempting distractor — a plausible misconception or a common mix-up with the right answer, not a throwaway wrong option. The wrong-but-tempting option is where the learning is, so the explanation must name it and say specifically why it's wrong.

Output ONLY a valid JSON array, each item shaped exactly like this:
{"topic": "string", "difficulty": "easy"|"medium"|"hard", "question": "string", "options": ["string","string","string","string"], "correctIndex": 0, "explanation": "1-2 sentences: why the correct answer is right, and specifically why the most tempting wrong option is wrong"}

Exactly 4 options per question, exactly one correct (correctIndex 0-3). No markdown, no preamble, no trailing commentary — output the JSON array only.`;

  const result = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: prompt });
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
