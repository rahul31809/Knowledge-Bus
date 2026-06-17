"use client";

import { ChevronRightIcon, ExternalLinkIcon, ImageIcon, Loader2Icon, NewspaperIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FinancialCompanyResult } from "@/app/api/industries/financials/route";
import type { CompanyNewsResult } from "@/app/api/industries/company-news/route";
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
  imageUrl?: string; // data URL, only for display in the chat bubble
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
  const [news, setNews] = useState<CompanyNewsResult[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"compare" | "financials" | "news" | null>(null);

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaImage, setQaImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    setQaImage(null);
  }

  function loadImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const commaIdx = dataUrl.indexOf(",");
      const base64 = dataUrl.slice(commaIdx + 1);
      const mimeMatch = dataUrl.slice(0, commaIdx).match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      setQaImage({ base64, mimeType, previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    loadImageFile(file);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) loadImageFile(file);
  }

  function toggle(name: string) {
    const isDeselecting = selected.has(name);
    const willBeEmpty = isDeselecting && selected.size === 1;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < 3) {
        next.add(name);
      }
      return next;
    });
    if (willBeEmpty) {
      resetChat();
      setFinancials(null);
      setNews(null);
      setActivePanel(null);
    } else if (isDeselecting) {
      // Remove only this company from cached data; keep panel open
      setFinancials((prev) => prev ? prev.filter((c) => c.name !== name) : null);
      setNews((prev) => prev ? prev.filter((c) => c.company !== name) : null);
    } else {
      // Adding a new company — clear so re-fetch includes it
      setFinancials(null);
      setNews(null);
    }
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
    if (willBeEmpty) {
      resetChat();
      setFinancials(null);
      setNews(null);
      setActivePanel(null);
    } else {
      setFinancials((prev) => prev ? prev.filter((c) => c.name !== name) : null);
      setNews((prev) => prev ? prev.filter((c) => c.company !== name) : null);
    }
    setResult(null);
    setError(null);
  }

  async function handleAskPlayers(event: FormEvent) {
    event.preventDefault();
    const q = qaInput.trim();
    if ((!q && !qaImage) || qaLoading || selected.size < 1) return;

    const currentImage = qaImage;
    const userMsg: QaMessage = {
      role: "user",
      content: q || "(image)",
      imageUrl: currentImage?.previewUrl,
    };
    const nextMessages = [...qaMessages, userMsg];
    setQaMessages(nextMessages);
    setQaInput("");
    setQaImage(null);
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
          // Strip imageUrl from history — only send base64 for the current message
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          imageBase64: currentImage?.base64,
          imageMimeType: currentImage?.mimeType,
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

  async function handleNews() {
    setActivePanel("news");
    if (news !== null) return;
    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetch("/api/industries/company-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companies: Array.from(selected),
          industryName,
          subsectorName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to fetch news");
      }
      const data = (await res.json()) as { companies: CompanyNewsResult[] };
      setNews(data.companies);
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setNewsLoading(false);
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

        {/* Any Other Company card — always enabled */}
        {selected.size < 3 ? (() => {
          const hint =
            selected.size === 0
              ? "Enter any company name to look up financials or add to comparison"
              : selected.size === 1
              ? "Enter a custom company to complete the 2-player comparison"
              : "Optionally add a 3rd company to broaden the comparison";

          return (
            <div
              role="button"
              tabIndex={0}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                isAddingCustom
                  ? "border-primary/40 bg-accent"
                  : "cursor-pointer border-border bg-card hover:border-primary/40 hover:bg-accent/10"
              }`}
              onClick={() => { if (!isAddingCustom) setIsAddingCustom(true); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !isAddingCustom) setIsAddingCustom(true); }}
            >
              {isAddingCustom ? (
                <form onSubmit={handleAddCustom} className="flex w-full items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

          <button
            type="button"
            onClick={handleNews}
            disabled={selected.size < 1 || newsLoading}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              activePanel === "news"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            {newsLoading ? <Loader2Icon className="size-4 animate-spin" /> : <NewspaperIcon className="size-4" />}
            Latest News
          </button>
        </div>
        <p className="text-xs italic text-muted-foreground">Compare Players requires 2–3 · Financials &amp; News work with 1+.</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {financialsError ? <p className="text-xs text-destructive">{financialsError}</p> : null}
        {newsError ? <p className="text-xs text-destructive">{newsError}</p> : null}
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

      {activePanel === "news" ? (
        <div className="flex flex-col gap-4">
          {newsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Fetching latest news…
            </div>
          ) : news && news.length > 0 ? (
            <>
              {news.map((companyNews) => (
                <div key={companyNews.company} className="flex flex-col gap-2">
                  {news.length > 1 ? (
                    <p className="text-sm font-semibold text-foreground">{companyNews.company}</p>
                  ) : null}
                  {companyNews.error ? (
                    <p className="text-xs text-destructive">{companyNews.error}</p>
                  ) : companyNews.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No recent news found.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {companyNews.items.map((item, i) => (
                        <details key={i} className="group rounded-lg border border-border bg-card">
                          <summary className="flex cursor-pointer list-none items-start gap-2.5 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                            <ChevronRightIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{item.source}{item.date ? ` · ${item.date}` : ""}</p>
                            </div>
                          </summary>
                          <div className="border-t border-border px-4 py-3">
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
                            {item.url && item.url.startsWith("http") ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                              >
                                Read full article <ExternalLinkIcon className="size-3" />
                              </a>
                            ) : null}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">AI-generated summaries via web search · verify before citing.</p>
            </>
          ) : null}
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
                    {msg.role === "assistant" ? (
                      <Markdown>{msg.content}</Markdown>
                    ) : (
                      <>
                        {msg.imageUrl ? (
                          <img src={msg.imageUrl} alt="Screenshot" className="mb-1.5 max-h-40 rounded object-contain" />
                        ) : null}
                        {msg.content !== "(image)" ? <span>{msg.content}</span> : null}
                      </>
                    )}
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

          <form onSubmit={handleAskPlayers} className="flex flex-col gap-2">
            {qaImage ? (
              <div className="relative w-fit">
                <img src={qaImage.previewUrl} alt="Attachment preview" className="h-20 rounded-md border border-border object-contain" />
                <button
                  type="button"
                  onClick={() => setQaImage(null)}
                  className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-card p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={qaLoading || selected.size < 1}
                title="Attach screenshot"
                className="inline-flex items-center justify-center rounded-md border border-input px-2.5 py-2 text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                <ImageIcon className="size-4" />
              </button>
              <input
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                  selected.size < 1
                    ? "Select a company to ask…"
                    : qaMessages.length === 0
                    ? "e.g. Which has a stronger competitive moat and why? (or paste a screenshot)"
                    : "Ask a follow-up… (or paste a screenshot)"
                }
                disabled={qaLoading || selected.size < 1}
                className="flex-1 rounded-md border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={qaLoading || (!qaInput.trim() && !qaImage) || selected.size < 1}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {qaLoading ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
                Ask
              </button>
            </div>
          </form>
          {qaError ? <p className="text-xs text-destructive">{qaError}</p> : null}
        </div>

    </div>
  );
}
