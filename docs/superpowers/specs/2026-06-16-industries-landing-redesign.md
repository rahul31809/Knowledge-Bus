# Industries Landing Page Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current plain card grid on `/industries` with a professional directory layout — emoji icon + industry name header, then all sub-sectors listed as clickable indigo pills that link directly to their primer page.

**Architecture:** Single-file change to `src/app/(app)/industries/page.tsx`. Add an `INDUSTRY_ICONS` lookup map in the same file. Convert sub-sector pills to `<Link>` components. No new components needed, no API calls, no database changes.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, shadcn/ui semantic tokens, `next/link`.

---

## Design Decisions

- **Layout:** 2-column responsive grid (`sm:grid-cols-2`), same as current.
- **Card anatomy:** Icon + industry name + subsector count in a header row, separated from pills by a bottom border. All sub-sectors shown as pills (no truncation).
- **Pill behaviour:** Each pill is a `<Link>` navigating to `/industries/[industry.slug]/[subsector.slug]`.
- **No card-level link:** Only the pills are links. The card header is not clickable (avoids ambiguity about destination).
- **Subtitle:** Changed from the long description to `"Consultant-style primers across 14 industries and 62 sub-sectors — market size, value chain, key players, and a consulting lens."` — concise and informative.

## Icon Map

```ts
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
```

## Card Structure (per industry)

```tsx
<div className="rounded-lg border border-border bg-card p-4">
  {/* Header */}
  <div className="flex items-center gap-3 pb-3 border-b border-border">
    <span className="text-xl leading-none">{icon}</span>
    <div>
      <h2 className="text-sm font-semibold text-foreground">{industry.name}</h2>
      <p className="text-xs text-muted-foreground">{industry.subsectors.length} sub-sectors</p>
    </div>
  </div>
  {/* Sub-sector pills */}
  <div className="flex flex-wrap gap-2 pt-3">
    {industry.subsectors.map((sub) => (
      <Link
        key={sub.slug}
        href={`/industries/${industry.slug}/${sub.slug}`}
        className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
      >
        {sub.name}
      </Link>
    ))}
  </div>
</div>
```

## Files

| Action | Path |
|--------|------|
| Modify | `src/app/(app)/industries/page.tsx` |

No other files need to change.

## What Does NOT Change

- `INDUSTRY_TAXONOMY` in `src/lib/industry-taxonomy.ts` — not touched.
- The sidebar (`industry-sidebar.tsx`) — not touched.
- The primer page (`[subsector]/page.tsx`) — not touched.
- No new components created.
