"use client";

import { useTransition } from "react";
import { updatePrepStatus } from "@/app/(app)/industries/[industry]/[subsector]/actions";
import type { PrepStatus } from "@/lib/types";

const STATUSES: { value: PrepStatus; label: string; color: string; dot: string }[] = [
  { value: "not_started", label: "Not started", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  { value: "familiar",    label: "Familiar",    color: "text-amber-500",         dot: "bg-amber-400" },
  { value: "case_ready",  label: "Case-ready",  color: "text-emerald-500",       dot: "bg-emerald-500" },
];

export function PrepStatusToggle({
  industrySlug,
  subsectorSlug,
  initialStatus,
}: {
  industrySlug: string;
  subsectorSlug: string;
  initialStatus: PrepStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick(status: PrepStatus) {
    startTransition(() => updatePrepStatus(industrySlug, subsectorSlug, status));
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <p className="text-xs font-medium text-muted-foreground">Prep status</p>
      <div className={`flex rounded-md border border-border bg-muted/40 p-0.5 transition-opacity ${isPending ? "opacity-50" : ""}`}>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => handleClick(s.value)}
            disabled={isPending}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
              initialStatus === s.value
                ? "bg-background shadow-sm " + s.color
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`size-1.5 rounded-full ${initialStatus === s.value ? s.dot : "bg-muted-foreground/30"}`} />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PrepStatusDot({ status }: { status: PrepStatus }) {
  const s = STATUSES.find((x) => x.value === status) ?? STATUSES[0];
  return <span className={`inline-block size-1.5 rounded-full ${s.dot}`} title={s.label} />;
}
