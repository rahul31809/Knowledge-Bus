"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Loader2Icon, MessageCircleIcon, SendIcon, XIcon } from "lucide-react";
import { Markdown } from "@/components/industry-primer/markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: q }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to get an answer");
      }
      const data = (await res.json()) as { answer: string };
      setMessages([...nextMessages, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessages([]);
    setError(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90"
        aria-label="Open assistant"
      >
        <MessageCircleIcon className="size-5" />
        Ask
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 left-5 z-50 flex h-[32rem] max-h-[calc(100vh-7rem)] w-auto max-w-96 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:left-auto sm:w-96">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Knowledge Base Assistant</p>
          <p className="text-xs text-muted-foreground">Searches subjects, news, industries &amp; readings</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 ? (
            <button type="button" onClick={handleClear} className="text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          ) : null}
          <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close assistant">
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      <div ref={chatRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-muted/20 p-3">
        {messages.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            Try: &ldquo;What&apos;s the pre-read for Strategy session 3?&rdquo; or &ldquo;Latest news on EV battery costs&rdquo;.
          </p>
        ) : null}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
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
              Looking that up…
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="px-3 pt-2 text-xs text-destructive">{error}</p> : null}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your knowledge base…"
          aria-label="Ask the assistant"
          disabled={loading}
          className="flex-1 rounded-md border border-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
        </button>
      </form>
    </div>
  );
}
