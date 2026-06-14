export default function NewsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Current News</h1>
        <p className="text-sm text-neutral-500">
          Daily articles from your newsletters and feeds — coming soon.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
        This section isn&apos;t wired up yet. Once the News feature ships, fresh articles from The
        Ken, Mint, Financial Times and other sources will show up here automatically, with an AI
        summary tab for everything.
      </div>
    </div>
  );
}
