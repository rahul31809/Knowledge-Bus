import Anthropic from "@anthropic-ai/sdk";

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

export type FilePart =
  | { type: "pdf"; name: string; pdfBase64: string }
  | { type: "text"; name: string; text: string };

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

export async function generateQuizQuestions(
  subject: string,
  parts: FilePart[],
  counts: DifficultyCounts
): Promise<QuizQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!parts.length) throw new Error("No files provided");

  const total = counts.easy + counts.medium + counts.hard;
  if (total <= 0) throw new Error("At least one question must be requested");

  const client = new Anthropic({ apiKey });

  const prompt = `You are an MBA professor at SPJIMR helping a student prepare for exams. You have been given the actual session presentation slides above — study them fully including all diagrams, tables, frameworks, and visual content.

SUBJECT: ${subject}

STEP 1 — UNDERSTAND (keep in your reasoning, do NOT output):
Go through every slide carefully. For each concept, framework, or model you see: understand what it means, how it works mechanically, why it matters, a realistic scenario where it applies, and the most common misconceptions about it. You have full visual context — use all of it, not just text that appears in bullet points.

STEP 2 — GENERATE:
From that deep understanding, generate exactly ${counts.easy} easy, ${counts.medium} medium, and ${counts.hard} hard multiple-choice questions (${total} total).

DIFFICULTY MEANS:
- easy: understanding a definition or core mechanism shown in the slides
- medium: applying a concept to a scenario, or distinguishing between two related ideas from the slides
- hard: multi-step reasoning, synthesising across multiple slides/concepts, or identifying which framework applies in a non-obvious case

Two non-negotiable principles:
1. A good question cannot be answered by spotting a keyword — it requires following the actual reasoning
2. Distractors must be plausible misconceptions a student would genuinely consider, not throwaway wrong options — the wrong-but-tempting option is where the learning is

For each question assign a short "topic" label (2–4 words, e.g. "Capital Structure", "NPV vs IRR").
The explanation must name the most tempting wrong option and say specifically why it is wrong.

Output ONLY a valid JSON array, each item shaped exactly like this:
{"topic": "string", "difficulty": "easy"|"medium"|"hard", "question": "string", "options": ["string","string","string","string"], "correctIndex": 0, "explanation": "1-2 sentences: why the correct answer is right, and specifically why the most tempting wrong option is wrong"}

Exactly 4 options per question, exactly one correct (correctIndex 0-3). No markdown, no preamble, no trailing commentary — output the JSON array only.`;

  const contentBlocks: Anthropic.MessageParam["content"] = [];

  for (const part of parts) {
    if (part.type === "pdf") {
      contentBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: part.pdfBase64,
        },
        title: part.name,
      } as Anthropic.DocumentBlockParam);
    } else if (part.text) {
      contentBlocks.push({
        type: "text",
        text: `[Slides: ${part.name}]\n${part.text}`,
      });
    }
  }

  contentBlocks.push({ type: "text", text: prompt });

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const raw = response.content.find((b) => b.type === "text");
  const text = raw?.type === "text" ? raw.text : "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Claude did not return a parseable question set");

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("Claude returned malformed JSON for the question set");
  }
  if (!Array.isArray(parsed)) throw new Error("Claude's response was not a list of questions");

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
