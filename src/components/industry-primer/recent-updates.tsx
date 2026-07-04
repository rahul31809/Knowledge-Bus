import type { PrimerRecentUpdate } from "@/lib/types";

export function RecentUpdates({ updates }: { updates: PrimerRecentUpdate[] }) {
  if (updates.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {updates.map((u, i) => (
        <li key={i} className="flex gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <span className="mt-0.5 shrink-0 text-base">⚡</span>
          <div>
            <p className="text-sm font-medium text-foreground">{u.headline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{u.context}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
