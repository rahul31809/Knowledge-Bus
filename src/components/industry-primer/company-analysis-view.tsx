"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CompanyAnalysis, CompanyAnalysisSection } from "@/lib/types";
import { Markdown } from "./markdown";

function splitTitle(title: string): { number: string; label: string } {
  const dotIdx = title.indexOf(". ");
  if (dotIdx === -1) return { number: "", label: title };
  return { number: title.slice(0, dotIdx), label: title.slice(dotIdx + 2) };
}

export function CompanyAnalysisView({
  analysis,
  layout = "grid",
}: {
  analysis: CompanyAnalysis;
  layout?: "grid" | "sidebar";
}) {
  const sections: CompanyAnalysisSection[] = [
    ...analysis.chunk_foundation.sections,
    ...analysis.chunk_market.sections,
    ...analysis.chunk_execution.sections,
    ...analysis.chunk_outlook.sections,
    ...analysis.chunk_strategy_prep.sections,
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        No analysis content was generated. Try regenerating.
      </div>
    );
  }

  const active = sections[Math.min(activeIndex, sections.length - 1)];

  if (layout === "sidebar") {
    return (
      <div className="flex h-full min-h-0">
        {/* Section list */}
        <nav className="w-44 shrink-0 overflow-y-auto border-r border-border py-1">
          {sections.map((section, i) => {
            const { number, label } = splitTitle(section.title);
            const isActive = i === activeIndex;
            return (
              <button
                key={section.title}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "w-full px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "bg-accent"
                    : "hover:bg-muted/60"
                )}
              >
                <span className={cn("block text-[10px] font-medium tabular-nums", isActive ? "text-primary" : "text-muted-foreground/50")}>
                  {number.padStart(2, "0")}
                </span>
                <span className={cn("mt-0.5 block text-xs leading-snug", isActive ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
            {splitTitle(active.title).number.padStart(2, "0")}
          </p>
          <h2 className="mt-1 font-serif text-lg font-semibold text-foreground">
            {splitTitle(active.title).label}
          </h2>
          <div className="mt-4">
            <Markdown enableEntityLinks>{active.markdown}</Markdown>
          </div>
        </div>
      </div>
    );
  }

  // Grid layout — used on the full company page
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sections.map((section, i) => {
          const { number, label } = splitTitle(section.title);
          const isActive = i === activeIndex;
          return (
            <button
              key={section.title}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
                isActive
                  ? "border-primary/50 bg-accent ring-1 ring-primary/30"
                  : "border-border bg-card hover:border-primary/30 hover:bg-accent/10"
              )}
            >
              <span className={cn("text-xs font-medium tabular-nums", isActive ? "text-primary" : "text-muted-foreground/60")}>
                {number.padStart(2, "0")}
              </span>
              <span className="font-serif text-sm font-semibold leading-snug text-foreground">{label}</span>
            </button>
          );
        })}
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-medium text-primary">{splitTitle(active.title).number.padStart(2, "0")}</p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">{splitTitle(active.title).label}</h2>
        <div className="mt-4">
          <Markdown>{active.markdown}</Markdown>
        </div>
      </section>
    </div>
  );
}
