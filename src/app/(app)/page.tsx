import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {q ? `Search: "${q}"` : "Your Knowledge Base"}
          </h1>
          <p className="text-sm text-neutral-500">
            {q ? "Showing matching entries." : "Browse, filter and search everything you've saved."}
          </p>
        </div>
        <Link href="/entries/new" className={buttonVariants({ variant: "default" })}>
          Add Entry
        </Link>
      </div>

      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
        No entries yet. Click <span className="font-medium text-neutral-700">Add Entry</span> to save your first
        note.
      </div>
    </div>
  );
}
