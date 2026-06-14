"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { INDUSTRY_TAXONOMY } from "@/lib/industry-taxonomy";

export function IndustrySidebar() {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const activeIndustrySlug = segments[2];
  const activeSubsectorSlug = segments[3];

  const [openSlugs, setOpenSlugs] = useState<Set<string>>(
    () => new Set(activeIndustrySlug ? [activeIndustrySlug] : [])
  );

  // Adjust state during render (not in an effect) when navigation changes the
  // active industry, so its section auto-expands without collapsing others.
  const [trackedActiveSlug, setTrackedActiveSlug] = useState(activeIndustrySlug);
  if (activeIndustrySlug && activeIndustrySlug !== trackedActiveSlug) {
    setTrackedActiveSlug(activeIndustrySlug);
    if (!openSlugs.has(activeIndustrySlug)) {
      setOpenSlugs(new Set(openSlugs).add(activeIndustrySlug));
    }
  }

  return (
    <nav className="w-full shrink-0 sm:w-64">
      <h2 className="mb-2 px-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Industries</h2>
      <ul className="flex flex-col gap-0.5">
        {INDUSTRY_TAXONOMY.map((industry) => {
          const isOpen = openSlugs.has(industry.slug);
          return (
            <li key={industry.slug}>
              <details
                open={isOpen}
                onToggle={(e) => {
                  const open = e.currentTarget.open;
                  setOpenSlugs((prev) => {
                    const next = new Set(prev);
                    if (open) next.add(industry.slug);
                    else next.delete(industry.slug);
                    return next;
                  });
                }}
              >
                <summary className="cursor-pointer list-none rounded-md px-2 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100">
                  {industry.name}
                </summary>
                <ul className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l border-neutral-200 pl-3">
                  {industry.subsectors.map((subsector) => {
                    const isActive =
                      industry.slug === activeIndustrySlug && subsector.slug === activeSubsectorSlug;
                    return (
                      <li key={subsector.slug}>
                        <Link
                          href={`/industries/${industry.slug}/${subsector.slug}`}
                          className={`block rounded-md px-2 py-1 text-sm ${
                            isActive
                              ? "bg-neutral-900 text-white"
                              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                          }`}
                        >
                          {subsector.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
