"use client";

import { ChevronDownIcon, ChevronUpIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import type { FrameworkInsight } from "@/lib/types";
import { Markdown } from "./markdown";
import { SourceLink } from "./source-link";

const RATING_LEVEL: Record<FrameworkInsight["factors"][number]["rating"], number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

export function FrameworkInsightCard({
  title,
  description,
  industryName,
  subsectorName,
  searchContext,
}: {
  title: string;
  description: string;
  industryName: string;
  subsectorName: string;
  searchContext: string;
}) {
  const [insight, setInsight] = useState<FrameworkInsight | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/industries/framework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryName, subsectorName, frameworkName: title, context: description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to generate insight");
      }
      setInsight((await res.json()) as FrameworkInsight);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <SourceLink query={`${title} ${searchContext}`}>
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </SourceLink>
        {insight ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse" : "Expand"}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>

      {!insight ? (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
          Generate Insight
        </button>
      ) : null}

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      {insight && expanded ? (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          {insight.summary ? <Markdown>{insight.summary}</Markdown> : null}
          {insight.factors.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {insight.factors.map((factor) => (
                <div key={factor.name} className="rounded-lg border border-border bg-muted p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{factor.name}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((dot) => (
                        <span
                          key={dot}
                          className={`size-1.5 rounded-full ${
                            dot <= RATING_LEVEL[factor.rating] ? "bg-foreground" : "bg-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{factor.description}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
