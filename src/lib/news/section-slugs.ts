import { NEWS_SECTIONS, type NewsSection } from "@/lib/types";

export function slugifySection(section: string): string {
  return section
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function sectionFromSlug(slug: string): NewsSection | null {
  return NEWS_SECTIONS.find((section) => slugifySection(section) === slug) ?? null;
}
