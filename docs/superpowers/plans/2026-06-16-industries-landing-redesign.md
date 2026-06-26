# Industries Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain card grid on `/industries` with icon-header cards whose sub-sectors are all shown as clickable indigo pills linking directly to primer pages.

**Architecture:** Single file change — `src/app/(app)/industries/page.tsx`. Add an `INDUSTRY_ICONS` record keyed by industry slug, update the page subtitle, and restructure each card to have an icon+name header separated by a border from the sub-sector pill row. Each pill is a `<Link>` to `/industries/[industry.slug]/[subsector.slug]`. No new files, no API calls, no database changes.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 with semantic tokens (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary/10`, `text-primary`, `border-primary/30`), `next/link`.

---

## File Structure

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/app/(app)/industries/page.tsx` | Full rewrite of card markup + icon map + subtitle |

---

### Task 1: Rewrite `industries/page.tsx`

**Files:**
- Modify: `src/app/(app)/industries/page.tsx`

- [ ] **Step 1: Read the current file**

```bash
cat src/app/\(app\)/industries/page.tsx
```

Expected output: the existing 28-line file with a plain `<div>` card grid.

- [ ] **Step 2: Replace the file with the new implementation**

Write the following complete file to `src/app/(app)/industries/page.tsx`:

```tsx
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { INDUSTRY_TAXONOMY } from "@/lib/industry-taxonomy";

const INDUSTRY_ICONS: Record<string, string> = {
  "energy-power": "⚡",
  "financial-services": "🏦",
  "technology-internet": "💻",
  "healthcare-pharma": "🏥",
  "consumer-retail": "🛒",
  "automotive-industrial-manufacturing": "🚗",
  "infrastructure-real-estate-construction": "🏗️",
  "metals-mining-chemicals": "⛏️",
  "agriculture-allied": "🌾",
  "transportation-logistics": "🚚",
  "media-entertainment-gaming": "🎬",
  "education-skilling": "📚",
  "hospitality-travel": "✈️",
  "public-sector-government-defense": "🏛️",
};

export default function IndustriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Industries" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Industry Primers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultant-style primers across <strong className="text-foreground">14 industries</strong> and{" "}
          <strong className="text-foreground">62 sub-sectors</strong> — market size, value chain, key players,
          and a consulting lens.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {INDUSTRY_TAXONOMY.map((industry) => {
          const icon = INDUSTRY_ICONS[industry.slug] ?? "📋";
          return (
            <div key={industry.slug} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <span className="text-xl leading-none">{icon}</span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{industry.name}</h2>
                  <p className="text-xs text-muted-foreground">{industry.subsectors.length} sub-sectors</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                {industry.subsectors.map((sub) => (
                  <Link
                    key={sub.slug}
                    href={`/industries/${industry.slug}/${sub.slug}`}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: exits with no errors.

- [ ] **Step 4: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000/industries` and confirm:
- Each card has an emoji icon to the left of the industry name
- A divider line separates the header from the pills
- All sub-sectors appear as indigo pill links (not just "5 sub-sectors")
- Clicking any pill navigates to the correct primer page
- Page looks correct in both light and dark mode

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/industries/page.tsx
git commit -m "feat: redesign industries landing page with icon cards and subsector pills"
```

- [ ] **Step 6: Push to deploy**

```bash
git push origin main
```
