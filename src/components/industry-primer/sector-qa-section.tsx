"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Markdown } from "./markdown";

interface QaMessage {
  role: "user" | "assistant";
  content: string;
}

export function SectorQaSection({
  industryName,
  subsectorName,
}: {
  industryName: string;
  subsectorName: string;
}) {
  const [messages, setMessages] = useState<QaMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: QaMessage = { role: "user", content: q };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/industries/ask-sector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryName, subsectorName, messages: nextMessages }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { error?: string })?.error ?? "Failed to get an answer");
      }
      const data = (await res.json()) as { answer: string };
      setMessages([...nextMessages, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Ask about {subsectorName}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sector-level strategy, competitive dynamics, macro trends — no company selection needed.
          </p>
        </div>
        {messages.length > 0 ? (
          <button
            type="button"
            onClick={() => { setMessages([]); setInput(""); setError(null); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      {messages.length > 0 ? (
        <div ref={chatRef} className="mt-3 flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3">
          {messages.map((msg, i) => (
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
          {loading ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                <Loader2Icon className="size-3 animate-spin" />
                Thinking…
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleAsk} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            messages.length === 0
              ? `e.g. What are the structural tailwinds in ${subsectorName}?`
              : "Ask a follow-up…"
          }
          disabled={loading}
          className="flex-1 rounded-md border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
          Ask
        </button>
      </form>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
