"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3Icon,
  BookmarkIcon,
  BrainCircuitIcon,
  BriefcaseIcon,
  ChevronDownIcon,
  CompassIcon,
  LandmarkIcon,
  NewspaperIcon,
  StarIcon,
  ZapIcon,
  TrendingUpIcon,
} from "lucide-react";
import { NEWS_SECTIONS } from "@/lib/types";
import { slugifySection } from "@/lib/news/section-slugs";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Markets & Investing": TrendingUpIcon,
  "Business & Corporate Strategy": BriefcaseIcon,
  "Economy & Policy": LandmarkIcon,
  "Energy & Infrastructure": ZapIcon,
  "Valuation & Corporate Finance": BarChart3Icon,
  "AI & Emerging Tech": BrainCircuitIcon,
};

export function ExploreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
      >
        <CompassIcon className="size-4" />
        Explore
        <ChevronDownIcon className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-popover p-1.5 shadow-md">
          <p className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">Topics</p>
          {NEWS_SECTIONS.map((section) => {
            const Icon = CATEGORY_ICONS[section] ?? NewspaperIcon;
            return (
              <Link
                key={section}
                href={`/news/${slugifySection(section)}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent"
              >
                <Icon className="size-4 text-muted-foreground" />
                {section}
              </Link>
            );
          })}
          <div className="my-1.5 border-t border-border" />
          <Link
            href="/news/bookmarked"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent"
          >
            <BookmarkIcon className="size-4 text-amber-500" />
            Bookmarked
          </Link>
          <Link
            href="/news/saved"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent"
          >
            <StarIcon className="size-4 text-sky-500" />
            Saved Articles
          </Link>
        </div>
      ) : null}
    </div>
  );
}
