"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenIcon, XIcon } from "lucide-react";
import type { IndustryPrimerContent } from "@/lib/types";

export function QuickRevisionPanel({
  subsectorName,
  industryName,
  primer,
}: {
  subsectorName: string;
  industryName: string;
  primer: IndustryPrimerContent;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const vc = primer.value_chain.stages;
  const players = primer.major_players.players.slice(0, 5);
  const themes = primer.consulting_lens.case_themes;
  const frameworks = primer.consulting_lens.frameworks;
  const metrics = primer.key_metrics.metrics.slice(0, 5);
  const porterForces = primer.porter_five_forces?.forces ?? [];
  const stats = primer.overview.key_stats.slice(0, 4);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <BookOpenIcon className="size-3" />
        Quick Revision
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground">{industryName}</p>
            <h2 className="text-base font-semibold text-foreground">{subsectorName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70">Quick Revision — key facts only</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* Key stats */}
          {stats.length > 0 && (
            <Section title="Key Numbers">
              <div className="grid grid-cols-2 gap-2">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-semibold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Value chain */}
          {vc.length > 0 && (
            <Section title="Value Chain">
              <div className="flex flex-col gap-1">
                {vc.map((stage, i) => (
                  <div key={stage.name} className="flex items-start gap-2">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-xs font-medium text-foreground">{stage.name}</span>
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          stage.value_capture === "high"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : stage.value_capture === "medium"
                            ? "bg-amber-500/15 text-amber-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {stage.value_capture}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Key players */}
          {players.length > 0 && (
            <Section title="Key Players">
              <div className="flex flex-col gap-1.5">
                {players.map((p) => (
                  <div key={p.name} className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${
                      p.origin === "Indian"
                        ? "bg-orange-500/15 text-orange-600"
                        : "bg-blue-500/15 text-blue-600"
                    }`}>
                      {p.origin === "Indian" ? "IN" : "GL"}
                    </span>
                    <div>
                      <span className="text-xs font-medium text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground"> — {p.positioning}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Porter's Five Forces */}
          {porterForces.length > 0 && (
            <Section title="Porter's Five Forces">
              <div className="flex flex-col gap-1">
                {porterForces.map((f) => (
                  <div key={f.force} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground">{f.force}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      f.degree === "High"
                        ? "bg-rose-500/15 text-rose-600"
                        : f.degree === "Medium"
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-emerald-500/15 text-emerald-600"
                    }`}>
                      {f.degree}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Case themes */}
          {themes.length > 0 && (
            <Section title="Case Themes">
              <ol className="flex flex-col gap-1.5">
                {themes.map((t, i) => (
                  <li key={t.title} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 shrink-0 font-semibold text-primary">{i + 1}.</span>
                    <div>
                      <span className="font-medium text-foreground">{t.title}</span>
                      <span className="text-muted-foreground"> — {t.description}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* Frameworks */}
          {frameworks.length > 0 && (
            <Section title="Frameworks to Apply">
              <div className="flex flex-wrap gap-1.5">
                {frameworks.map((f) => (
                  <span
                    key={f.name}
                    className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                    title={f.application}
                  >
                    {f.name}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Key metrics */}
          {metrics.length > 0 && (
            <Section title="Key Metrics">
              <div className="flex flex-col gap-1.5">
                {metrics.map((m) => (
                  <div key={m.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground">{m.name}</span>
                    <span className="shrink-0 text-muted-foreground">{m.benchmark}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
