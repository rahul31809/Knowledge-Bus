import { Skeleton } from "@/components/ui/skeleton";

export default function IndustryPrimerLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />

      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>

      <p className="text-sm text-neutral-500">Generating this primer for the first time — this can take up to a minute…</p>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
