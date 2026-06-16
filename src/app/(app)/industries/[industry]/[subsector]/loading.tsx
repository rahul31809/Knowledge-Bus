import { Skeleton } from "@/components/ui/skeleton";

function StatRowSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex items-end gap-3" style={{ height: "140px" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="w-full" style={{ height: `${30 + i * 15}%` }} />
      ))}
    </div>
  );
}

function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export default function IndustryPrimerLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />

      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>

      <p className="text-sm text-muted-foreground">Generating this primer for the first time — this can take up to a minute…</p>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-32" />
          <div className="mt-3 flex flex-col gap-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <StatRowSkeleton />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-40" />
              <div className="mt-3">
                <StatRowSkeleton />
              </div>
              <div className="mt-4">
                <ChartSkeleton />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-28" />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 flex-1" />
            ))}
          </div>
        </div>

        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-40" />
            <div className="mt-3">
              <CardGridSkeleton />
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-1 h-3 w-64" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
