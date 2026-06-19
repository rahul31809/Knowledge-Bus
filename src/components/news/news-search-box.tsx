import { SearchIcon } from "lucide-react";

export function NewsSearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/news/search" className="relative">
      <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search articles…"
        className="w-44 rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring sm:w-56"
      />
    </form>
  );
}
