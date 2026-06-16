"use client";

import { Loader2Icon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FinancialCompanyResult } from "@/app/api/industries/financials/route";
import type { PrimerComparisonResult, PrimerPlayer } from "@/lib/types";
import { FinancialComparison } from "./financial-comparison";
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
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<PrimerComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [financials, setFinancials] = useState<FinancialCompanyResult[] | null>(null);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [financialsError, setFinancialsError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"compare" | "financials" | null>(null);

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [qaSubtitle] = useState(() => {
    const lines = [
      "No billable hours. Ask anything.",
      "Partner-level answers. Zero slide decks.",
      "Think of it as a senior partner on speed dial.",
      "Straight talk, no deck. Fire away.",
      "Your personal partner. Ask anything — no judgment.",
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  });

  // Sector Q&A state
  const [sectorMessages, setSectorMessages] = useState<QaMessage[]>([]);
  const [sectorInput, setSectorInput] = useState("");
  const [sectorLoading, setSectorLoading] = useState(false);
  const [sectorError, setSectorError] = useState<string | null>(null);
  const sectorChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectorChatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sectorMessages, sectorLoading]);

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
    setFinancials(null);
    setActivePanel(null);
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
    setIsAddingCustom(false);
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
    setFinancials(null);
    setActivePanel(null);
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

  async function handleAskSector(event: FormEvent) {
    event.preventDefault();
    const q = sectorInput.trim();
    if (!q || sectorLoading) return;

    const userMsg: QaMessage = { role: "user", content: q };
    const nextMessages = [...sectorMessages, userMsg];
    setSectorMessages(nextMessages);
    setSectorInput("");
    setSectorLoading(true);
    setSectorError(null);

    try {
      const res = await fetch("/api/industries/ask-sector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryName, subsectorName, messages: nextMessages }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to get an answer");
      }
      const data = (await res.json()) as { answer: string };
      setSectorMessages([...nextMessages, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setSectorError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSectorLoading(false);
    }
  }

  async function handleFinancials() {
    setActivePanel("financials");
    if (financials !== null) return; // already have data — just show it
    setFinancialsLoading(true);
    setFinancialsError(null);
    try {
      const res = await fetch("/api/industries/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryName,
          subsectorName,
          players: Array.from(selected),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to fetch financial data");
      }
      const data = (await res.json()) as { companies: FinancialCompanyResult[] };
      setFinancials(data.companies);
    } catch (err) {
      setFinancialsError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFinancialsLoading(false);
    }
  }

  async function handleCompare() {
    setActivePanel("compare");
    if (result !== null) return; // already have data — just show it
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

        {/* Any Other Company card */}
        {selected.size < 3 ? (() => {
          const disabled = selected.size === 0;
          const hint =
            selected.size === 0
              ? "Select at least 2 companies above before adding a custom one"
              : selected.size === 1
              ? "You have 1 company selected — select 1 more above, or enter a custom company here to complete the comparison"
              : "Optionally add a 3rd company to broaden the comparison";

          return (
            <div
              role={disabled ? undefined : "button"}
              tabIndex={disabled ? undefined : 0}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                disabled
                  ? "cursor-not-allowed border-border bg-card opacity-50"
                  : isAddingCustom
                  ? "border-primary/40 bg-accent"
                  : "cursor-pointer border-border bg-card hover:border-primary/40 hover:bg-accent/10"
              }`}
              onClick={() => { if (!disabled && !isAddingCustom) setIsAddingCustom(true); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !disabled && !isAddingCustom) setIsAddingCustom(true); }}
            >
              {!disabled && isAddingCustom ? (
                <form
                  onSubmit={handleAddCustom}
                  className="flex w-full items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <PlusIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  <input
                    autoFocus
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Type company name and press Enter…"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setIsAddingCustom(false); setCustomInput(""); }
                    }}
                    onBlur={() => { if (!customInput.trim()) setIsAddingCustom(false); }}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!customInput.trim()}
                    className="shrink-0 text-xs font-semibold text-primary disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingCustom(false); setCustomInput(""); }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </form>
              ) : (
                <>
                  <PlusIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Any Other Company</p>
                    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                  </div>
                </>
              )}
            </div>
          );
        })() : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Compare Players — with tooltip */}
          <div className="group relative">
            <button
              type="button"
              onClick={handleCompare}
              disabled={selected.size < 2 || loading}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                activePanel === "compare"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Compare Players{selected.size >= 2 ? ` (${selected.size})` : ""}
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100">
              {selected.size === 0
                ? "Select at least 2 companies to compare"
                : selected.size === 1
                ? "Select one more company — up to 3 may be compared"
                : `Compare ${selected.size} selected companies`}
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinancials}
            disabled={selected.size < 1 || financialsLoading}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              activePanel === "financials"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            {financialsLoading ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Financials Comparison
          </button>
        </div>
        <p className="text-xs italic text-muted-foreground">Compare Players requires 2–3 · Financials Comparison works with 1+.</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {financialsError ? <p className="text-xs text-destructive">{financialsError}</p> : null}
      </div>

      {activePanel === "compare" && result && result.rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {result.synthesis ? (
            <div className="rounded-lg border border-border bg-muted p-3">
              <Markdown>{result.synthesis}</Markdown>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="bg-slate-800 px-4 py-3 text-xs font-medium text-slate-400 w-44">Parameter</th>
                  {result.rows.map((row, idx) => {
                    const borders = ["border-t-[4px] border-t-indigo-400","border-t-[4px] border-t-violet-400","border-t-[4px] border-t-sky-400"];
                    return (
                      <th key={row.player}
                        className={`bg-slate-800 px-4 py-3 text-sm font-bold text-white ${borders[idx % borders.length]} ${idx > 0 ? "border-l border-slate-600" : ""}`}
                      >
                        {row.player}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {result.parameters.map((param, i) => (
                  <tr key={param} className="border-t border-border/40 transition-colors hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{param}</td>
                    {result.rows.map((row) => (
                      <td key={row.player} className="px-4 py-2.5 text-xs text-foreground">
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

      {activePanel === "financials" && financials ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">Financials Comparison</p>
          <FinancialComparison companies={financials} />
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
                  ? qaSubtitle
                  : "Pick a company. The partner is waiting."}
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

      {/* ── Sector Q&A ── */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Ask about {subsectorName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sector-level strategy, competitive dynamics, macro trends — no company selection needed.
            </p>
          </div>
          {sectorMessages.length > 0 ? (
            <button
              type="button"
              onClick={() => { setSectorMessages([]); setSectorInput(""); setSectorError(null); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          ) : null}
        </div>

        {sectorMessages.length > 0 ? (
          <div ref={sectorChatRef} className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3">
            {sectorMessages.map((msg, i) => (
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
            {sectorLoading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3 animate-spin" />
                  Thinking…
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleAskSector} className="flex gap-2">
          <input
            value={sectorInput}
            onChange={(e) => setSectorInput(e.target.value)}
            placeholder={
              sectorMessages.length === 0
                ? `e.g. What are the structural tailwinds in ${subsectorName}?`
                : "Ask a follow-up…"
            }
            disabled={sectorLoading}
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sectorLoading || !sectorInput.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {sectorLoading ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
            Ask
          </button>
        </form>
        {sectorError ? <p className="text-xs text-destructive">{sectorError}</p> : null}
      </div>
    </div>
  );
}
