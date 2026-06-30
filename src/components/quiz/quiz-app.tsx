"use client";

import { useState } from "react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SourceFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  sessionLabel: string | null;
}

interface QuizQuestion {
  id: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface DifficultyCounts {
  easy: number;
  medium: number;
  hard: number;
}

const DIFFICULTY_CLASSES: Record<QuizQuestion["difficulty"], string> = {
  easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

function DifficultyBadge({ difficulty }: { difficulty: QuizQuestion["difficulty"] }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize", DIFFICULTY_CLASSES[difficulty])}>
      {difficulty}
    </span>
  );
}

type Stage = "setup" | "taking" | "results";

export function QuizApp({ subjects }: { subjects: string[] }) {
  const [stage, setStage] = useState<Stage>("setup");

  const [subject, setSubject] = useState("");
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<DifficultyCounts>({ easy: 3, medium: 4, hard: 3 });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());

  async function handleSubjectChange(next: string) {
    setSubject(next);
    setSources([]);
    setSelectedIds(new Set());
    setError(null);
    if (!next) return;
    setSourcesLoading(true);
    try {
      const res = await fetch(`/api/quiz/sources?subject=${encodeURIComponent(next)}`);
      const data = (await res.json()) as { files?: SourceFile[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load files");
      setSources(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setSourcesLoading(false);
    }
  }

  function toggleFile(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalQuestions = counts.easy + counts.medium + counts.hard;
  const canGenerate = subject && selectedIds.size > 0 && totalQuestions > 0 && !generating;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const selectedFiles = sources.filter((f) => selectedIds.has(f.id));
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, files: selectedFiles, counts }),
      });
      const data = (await res.json()) as { questions?: QuizQuestion[]; error?: string };
      if (!res.ok || !data.questions) throw new Error(data.error ?? "Failed to generate quiz");
      setQuestions(data.questions);
      setAnswers(new Map());
      setStage("taking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  }

  function selectAnswer(questionId: string, optionIndex: number) {
    setAnswers((prev) => new Map(prev).set(questionId, optionIndex));
  }

  function handleRestart() {
    setStage("setup");
    setQuestions([]);
    setAnswers(new Map());
  }

  if (stage === "taking") {
    return (
      <TakingView
        questions={questions}
        answers={answers}
        onSelect={selectAnswer}
        onSubmit={() => setStage("results")}
      />
    );
  }

  if (stage === "results") {
    return <ResultsView questions={questions} answers={answers} onRestart={handleRestart} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="quiz-subject">
          Subject
        </label>
        <select
          id="quiz-subject"
          value={subject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">Choose a subject…</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {sourcesLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Looking for session PPTs…
        </p>
      ) : subject && sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">No PPTs or session PDFs found in this subject&apos;s Drive folder.</p>
      ) : sources.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Session PPTs ({selectedIds.size} selected)</span>
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-2">
            {sources.map((file) => (
              <label
                key={file.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(file.id)}
                  onChange={() => toggleFile(file.id)}
                  className="size-4 shrink-0"
                />
                <span className="truncate text-sm text-foreground">{file.name}</span>
                {file.sessionLabel ? (
                  <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {file.sessionLabel}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {sources.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Question mix ({totalQuestions} total)</span>
          <div className="flex flex-wrap gap-3">
            {(["easy", "medium", "hard"] as const).map((level) => (
              <div key={level} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <DifficultyBadge difficulty={level} />
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={counts[level]}
                  onChange={(e) => setCounts((prev) => ({ ...prev, [level]: Math.max(0, Number(e.target.value) || 0) }))}
                  className="w-14 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {sources.length > 0 ? (
        <Button onClick={handleGenerate} disabled={!canGenerate} className="w-fit">
          {generating ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {generating ? "Generating…" : "Generate Quiz"}
        </Button>
      ) : null}
    </div>
  );
}

function TakingView({
  questions,
  answers,
  onSelect,
  onSubmit,
}: {
  questions: QuizQuestion[];
  answers: Map<string, number>;
  onSelect: (questionId: string, optionIndex: number) => void;
  onSubmit: () => void;
}) {
  const answeredCount = answers.size;

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:border-border sm:bg-card sm:px-4">
        <span className="text-sm text-muted-foreground">
          {answeredCount} of {questions.length} answered
        </span>
        <Button onClick={onSubmit} size="sm">
          Submit Quiz
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-start gap-2">
              <span className="shrink-0 text-sm font-semibold text-muted-foreground">{i + 1}.</span>
              <p className="flex-1 text-sm font-medium text-foreground">{q.question}</p>
              <DifficultyBadge difficulty={q.difficulty} />
            </div>
            <div className="flex flex-col gap-1.5 pl-6">
              {q.options.map((opt, optIdx) => (
                <label
                  key={optIdx}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    answers.get(q.id) === optIdx
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers.get(q.id) === optIdx}
                    onChange={() => onSelect(q.id, optIdx)}
                    className="size-3.5 shrink-0"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onSubmit} className="w-fit">
        Submit Quiz
      </Button>
    </div>
  );
}

function ResultsView({
  questions,
  answers,
  onRestart,
}: {
  questions: QuizQuestion[];
  answers: Map<string, number>;
  onRestart: () => void;
}) {
  const correctCount = questions.filter((q) => answers.get(q.id) === q.correctIndex).length;
  const percent = Math.round((correctCount / questions.length) * 100);

  const byTopic = new Map<string, { correct: number; total: number }>();
  for (const q of questions) {
    const entry = byTopic.get(q.topic) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (answers.get(q.id) === q.correctIndex) entry.correct += 1;
    byTopic.set(q.topic, entry);
  }
  const topicRows = [...byTopic.entries()].sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-5 text-center">
        <p className="text-3xl font-semibold text-foreground">
          {correctCount}/{questions.length}
        </p>
        <p className="text-sm text-muted-foreground">{percent}% correct</p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Where to focus next</h2>
        <div className="flex flex-col gap-1.5">
          {topicRows.map(([topic, { correct, total }]) => (
            <div key={topic} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
              <span className="flex-1 truncate text-sm text-foreground">{topic}</span>
              <span
                className={cn(
                  "shrink-0 text-xs font-medium",
                  correct === total ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                )}
              >
                {correct}/{total}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Review</h2>
        {questions.map((q, i) => {
          const yourAnswer = answers.get(q.id);
          const isCorrect = yourAnswer === q.correctIndex;
          return (
            <div key={q.id} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-start gap-2">
                {isCorrect ? (
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : (
                  <XIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <p className="flex-1 text-sm font-medium text-foreground">
                  {i + 1}. {q.question}
                </p>
                <DifficultyBadge difficulty={q.difficulty} />
              </div>
              <div className="flex flex-col gap-1 pl-6 text-sm">
                {q.options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className={cn(
                      "rounded-md px-3 py-1.5",
                      optIdx === q.correctIndex
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : optIdx === yourAnswer
                          ? "bg-destructive/10 text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {opt}
                  </div>
                ))}
              </div>
              <p className="mt-2 pl-6 text-xs text-muted-foreground">{q.explanation}</p>
            </div>
          );
        })}
      </div>

      <Button onClick={onRestart} variant="outline" className="w-fit">
        Take Another Quiz
      </Button>
    </div>
  );
}
