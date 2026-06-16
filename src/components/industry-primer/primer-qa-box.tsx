"use client";

import { BookmarkCheckIcon, BookmarkIcon, Loader2Icon, SendIcon } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { deleteQaNote, saveQaNote } from "@/app/(app)/industries/[industry]/[subsector]/actions";
import type { IndustryPrimerNote, QaSource } from "@/lib/types";
import { Markdown } from "./markdown";

interface QaPair {
  id: string;
  question: string;
  answer: string;
  sources: QaSource[];
  saved: boolean;
  savedId?: string;
}

export function PrimerQaBox({
  industrySlug,
  subsectorSlug,
  industryName,
  subsectorName,
  initialNotes,
}: {
  industrySlug: string;
  subsectorSlug: string;
  industryName: string;
  subsectorName: string;
  initialNotes: IndustryPrimerNote[];
}) {
  const [question, setQuestion] = useState("");
  const [pairs, setPairs] = useState<QaPair[]>(() =>
    initialNotes.map((note) => ({
      id: note.id,
      question: note.question,
      answer: note.answer,
      sources: note.sources,
      saved: true,
      savedId: note.id,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/industries/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryName, subsectorName, question: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to get an answer");
      }
      const data = (await res.json()) as { answer: string; sources: QaSource[] };
      setPairs((prev) => [
        { id: crypto.randomUUID(), question: trimmed, answer: data.answer, sources: data.sources ?? [], saved: false },
        ...prev,
      ]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSave(pair: QaPair) {
    if (pair.saved && pair.savedId) {
      const savedId = pair.savedId;
      setPairs((prev) => prev.map((p) => (p.id === pair.id ? { ...p, saved: false, savedId: undefined } : p)));
      try {
        await deleteQaNote(savedId, industrySlug, subsectorSlug);
      } catch {
        setPairs((prev) => prev.map((p) => (p.id === pair.id ? { ...p, saved: true, savedId } : p)));
      }
      return;
    }

    const result = await saveQaNote(industrySlug, subsectorSlug, pair.question, pair.answer, pair.sources);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPairs((prev) => prev.map((p) => (p.id === pair.id ? { ...p, saved: true, savedId: result.id } : p)));
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Ask About This Sub-Sector</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Ask Gemini a follow-up question about {subsectorName}. Save the answers worth keeping — the rest disappear on
        reload.
      </p>

      <form onSubmit={handleAsk} className="mt-3 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask anything about ${subsectorName}…`}
          disabled={loading}
          className="flex-1 rounded-md border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          Ask
        </button>
      </form>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      {pairs.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {pairs.map((pair) => (
            <div key={pair.id} className="rounded-lg border border-border bg-muted p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{pair.question}</p>
                <button
                  type="button"
                  onClick={() => handleToggleSave(pair)}
                  title={pair.saved ? "Remove from saved notes" : "Save this answer"}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {pair.saved ? <BookmarkCheckIcon className="size-4 text-emerald-600" /> : <BookmarkIcon className="size-4" />}
                </button>
              </div>
              <Markdown>{pair.answer}</Markdown>
              {pair.sources.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  {pair.sources.map((source) => (
                    <a
                      key={source.uri}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {source.title || source.uri}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
