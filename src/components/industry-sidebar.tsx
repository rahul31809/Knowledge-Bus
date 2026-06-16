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

  // When navigation changes active industry, collapse all others and open the new one.
  const [trackedActiveSlug, setTrackedActiveSlug] = useState(activeIndustrySlug);
  if (activeIndustrySlug && activeIndustrySlug !== trackedActiveSlug) {
    setTrackedActiveSlug(activeIndustrySlug);
    setOpenSlugs(new Set([activeIndustrySlug]));
  }

  return (
    <nav className="w-full shrink-0 sm:w-64">
      <h2 className="mb-2 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Industries</h2>
      <ul className="flex flex-col gap-0.5">
        {INDUSTRY_TAXONOMY.map((industry) => {
          const isOpen = openSlugs.has(industry.slug);
          return (
            <li key={industry.slug}>
              <details open={isOpen}>
                <summary
                  className="cursor-pointer list-none rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenSlugs(isOpen ? new Set() : new Set([industry.slug]));
                  }}
                >
                  {industry.name}
                </summary>
                <ul className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l border-border pl-3">
                  {industry.subsectors.map((subsector) => {
                    const isActive =
                      industry.slug === activeIndustrySlug && subsector.slug === activeSubsectorSlug;
                    return (
                      <li key={subsector.slug}>
                        <Link
                          href={`/industries/${industry.slug}/${subsector.slug}`}
                          className={`block rounded-md px-2 py-1 text-sm ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
