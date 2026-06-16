"use client";

import { Loader2Icon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { PrimerComparisonResult, PrimerPlayer } from "@/lib/types";
import { Markdown } from "./markdown";
import { SourceLink } from "./source-link";
import { TAG_STYLES, originVariant } from "./tagged-card-grid";

interface Candidate {
  name: string;
  origin?: "Indian" | "Global";
  positioning?: string;
  custom?: boolean;
}

interface QaMessage {
  role: "user" | "assistant";
  content: string;
}

export function PlayerComparison({
  players,
  industryName,
  subsectorName,
  subsectorSlug,
  searchContext,
}: {
  players: PrimerPlayer[];
  industryName: string;
  subsectorName: string;
  subsectorSlug: string;
  searchContext: string;
}) {
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<PrimerComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [qaMessages, qaLoading]);

  if (players.length === 0) return null;

  const candidates: Candidate[] = [
    ...players.map((p) => ({ name: p.name, origin: p.origin, positioning: p.positioning, custom: false })),
    ...customNames.map((name) => ({ name, custom: true })),
  ];

  function resetChat() {
    setQaMessages([]);
    setQaInput("");
    setQaError(null);
  }

  function toggle(name: string) {
    const willBeEmpty = selected.has(name) && selected.size === 1;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < 3) {
        next.add(name);
      }
      return next;
    });
    if (willBeEmpty) resetChat();
    setResult(null);
    setError(null);
  }

  function handleAddCustom(event: FormEvent) {
    event.preventDefault();
    const name = customInput.trim();
    if (!name) return;

    const exists = candidates.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      setCustomNames((prev) => [...prev, name]);
      setSelected((prev) => {
        if (prev.size >= 3) return prev;
        const next = new Set(prev);
        next.add(name);
        return next;
      });
    }
    setCustomInput("");
  }

  function removeCustom(name: string) {
    const willBeEmpty = selected.has(name) && selected.size === 1;
    setCustomNames((prev) => prev.filter((n) => n !== name));
    setSelected((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    if (willBeEmpty) resetChat();
    setResult(null);
    setError(null);
  }

  async function handleAskPlayers(event: FormEvent) {
    event.preventDefault();
    const q = qaInput.trim();
    if (!q || qaLoading || selected.size < 1) return;

    const userMsg: QaMessage = { role: "user", content: q };
    const nextMessages = [...qaMessages, userMsg];
    setQaMessages(nextMessages);
    setQaInput("");
    setQaLoading(true);
    setQaError(null);

    try {
      const res = await fetch("/api/industries/ask-players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryName,
          subsectorName,
          players: Array.from(selected),
          messages: nextMessages,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to get an answer");
      }
      const data = (await res.json()) as { answer: string };
      setQaMessages([...nextMessages, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setQaError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setQaLoading(false);
    }
  }

  async function handleCompare() {
    setLoading(true);
    setError(null);
    resetChat();
    try {
      const chosen = candidates
        .filter((c) => selected.has(c.name))
        .map((c) =>
          c.custom ? { name: c.name } : { name: c.name, origin: c.origin, positioning: c.positioning }
        );
      const res = await fetch("/api/industries/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryName, subsectorName, subsectorSlug, players: chosen }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to generate comparison");
      }
      setResult((await res.json()) as PrimerComparisonResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {candidates.map((candidate) => {
          const checked = selected.has(candidate.name);
          const disabled = !checked && selected.size >= 3;
          return (
            <label
              key={candidate.name}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                checked ? "border-primary/40 bg-accent" : "border-border bg-card"
              } ${disabled ? "opacity-50" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(candidate.name)}
                className="mt-1 size-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <SourceLink query={`${candidate.name} ${searchContext}`}>
                    <p className="text-sm font-semibold text-foreground">{candidate.name}</p>
                  </SourceLink>
                  {candidate.custom ? (
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_STYLES.neutral}`}>
                      Custom
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_STYLES[originVariant(candidate.origin!)]}`}
                    >
                      {candidate.origin}
                    </span>
                  )}
                </div>
                {candidate.positioning ? <p className="mt-1 text-xs text-muted-foreground">{candidate.positioning}</p> : null}
              </div>
              {candidate.custom ? (
                <button
                  type="button"
                  onClick={() => removeCustom(candidate.name)}
                  title="Remove"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </label>
          );
        })}
      </div>

      <form onSubmit={handleAddCustom} className="flex gap-2">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Add another company to compare…"
          className="flex-1 rounded-md border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!customInput.trim()}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground disabled:opacity-50"
        >
          <PlusIcon className="size-4" />
          Add
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCompare}
          disabled={selected.size < 2 || loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Compare Selected ({selected.size})
        </button>
        <p className="text-xs text-muted-foreground">Pick 2-3 players to compare on relevant parameters.</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      {result && result.rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {result.synthesis ? (
            <div className="rounded-lg border border-border bg-muted p-3">
              <Markdown>{result.synthesis}</Markdown>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-xs font-medium text-muted-foreground">Parameter</th>
                  {result.rows.map((row) => (
                    <th key={row.player} className="p-2 text-xs font-semibold text-foreground">
                      {row.player}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.parameters.map((param, i) => (
                  <tr key={param} className="border-t border-border">
                    <td className="p-2 text-xs font-medium text-muted-foreground">{param}</td>
                    {result.rows.map((row) => (
                      <td key={row.player} className="p-2 text-xs text-foreground">
                        {row.values[i] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">
                {selected.size >= 1
                  ? `Ask about ${Array.from(selected).join(" vs ")}`
                  : "Ask about selected companies"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selected.size >= 1
                  ? "McKinsey-style answers scoped to only these companies. Ask follow-ups freely."
                  : "Select at least 1 company above to start asking questions."}
              </p>
            </div>
            {qaMessages.length > 0 ? (
              <button
                type="button"
                onClick={resetChat}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            ) : null}
          </div>

          {qaMessages.length > 0 ? (
            <div ref={chatContainerRef} className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3">
              {qaMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? <Markdown>{msg.content}</Markdown> : msg.content}
                  </div>
                </div>
              ))}
              {qaLoading ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                    <Loader2Icon className="size-3 animate-spin" />
                    Thinking…
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={handleAskPlayers} className="flex gap-2">
            <input
              value={qaInput}
              onChange={(e) => setQaInput(e.target.value)}
              placeholder={
                selected.size < 1
                  ? "Select a company to ask…"
                  : qaMessages.length === 0
                  ? "e.g. Which has a stronger competitive moat and why?"
                  : "Ask a follow-up…"
              }
              disabled={qaLoading || selected.size < 1}
              className="flex-1 rounded-md border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={qaLoading || !qaInput.trim() || selected.size < 1}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {qaLoading ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
              Ask
            </button>
          </form>
          {qaError ? <p className="text-xs text-destructive">{qaError}</p> : null}
        </div>
    </div>
  );
}
