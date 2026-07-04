import type { PrimerRevenueCostBreakdown } from "@/lib/types";

function BreakdownList({
  items,
  accent,
}: {
  items: { label: string; percentage: string; note: string }[];
  accent: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">{item.label}</span>
            <span className={`text-xs font-bold ${accent}`}>{item.percentage}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full ${accent === "text-emerald-500" ? "bg-emerald-500" : "bg-rose-500"}`}
              style={{ width: item.percentage.replace(/[^0-9]/g, "") + "%" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">{item.note}</p>
        </li>
      ))}
    </ul>
  );
}

export function RevenueCostBreakdown({ data }: { data: PrimerRevenueCostBreakdown }) {
  if (data.revenue.length === 0 && data.costs.length === 0) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Revenue Streams
        </p>
        <BreakdownList
          items={data.revenue.map((r) => ({ label: r.stream, percentage: r.percentage, note: r.note }))}
          accent="text-emerald-500"
        />
      </div>
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          Cost Drivers
        </p>
        <BreakdownList
          items={data.costs.map((c) => ({ label: c.bucket, percentage: c.percentage, note: c.note }))}
          accent="text-rose-500"
        />
      </div>
    </div>
  );
}
