"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOut } from "@/app/login/actions";

export function NavHeader({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex flex-col leading-tight">
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 bg-clip-text text-2xl font-bold text-transparent">
              Knowledge Base
            </span>
            <span className="text-sm text-muted-foreground">Created by Rahul Agarwal (MBA, SPJIMR)</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              type="search"
              placeholder="Search your notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-48 sm:w-64"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" title={userEmail ?? undefined}>
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
