import { Skeleton } from "@/components/ui/skeleton";

const LOADING_QUIPS = [
  "Our AI intern is speed-reading every analyst report ever written. Hang on.",
  "Summoning a McKinsey partner from the cloud. This takes exactly as long as it needs to.",
  "The AI went to B-school for this. Give it a moment.",
  "Pulling an all-nighter on your behalf. Coffee's brewing.",
  "Reading the annual report so you never have to.",
  "Pretending it attended every earnings call since 2015.",
  "No Excel was harmed in the making of this primer.",
  "Consulting the oracle. (Not that Oracle.)",
  "Writing the 40-page deck you don't have time to read.",
  "The AI is in back-to-back syncs. Won't be a minute.",
];

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
  const quip = LOADING_QUIPS[Math.floor(Math.random() * LOADING_QUIPS.length)];

  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />

      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>

      <div className="rounded-xl border border-border bg-card px-6 py-5 text-center shadow-sm">
        <p className="text-base font-bold text-foreground">{quip}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">Hang tight — primers are generated once and cached after this.</p>
      </div>

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
