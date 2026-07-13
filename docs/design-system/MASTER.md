# Knowledge Bus — Design System

> Reference for contributors. All tokens live in `src/app/globals.css`. All components use Tailwind v4 utility classes referencing these tokens.

---

## Color Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `#f8fafc` | `#0f1115` | Page background |
| `--foreground` | `#0f172a` | `#f4f4f5` | Body text |
| `--card` | `#ffffff` | `#1a1d24` | Card backgrounds |
| `--card-foreground` | `#0f172a` | `#f4f4f5` | Text on cards |
| `--primary` | `#4f46e5` | `#6366f1` | CTA buttons, active states, links |
| `--primary-foreground` | `#ffffff` | `#ffffff` | Text on primary fills |
| `--secondary` | `#f1f5f9` | `#22252c` | Secondary buttons |
| `--muted` | `#f1f5f9` | `#22252c` | Muted backgrounds |
| `--muted-foreground` | `#64748b` | `#a1a1aa` | Metadata, captions, placeholders |
| `--accent` | `#eef2ff` | `#22252c` | Hover fills, selected rows |
| `--accent-foreground` | `#4f46e5` | `#f4f4f5` | Text on accent fills |
| `--border` | `#e2e8f0` | `#2a2e37` | All borders |
| `--ring` | `#4f46e5` | `#6366f1` | Focus rings |
| `--destructive` | `#dc2626` | `#f87171` | Errors, delete actions |

### Chart Colors (Tailwind `chart-1` → `chart-5`)

| Token | Light | Dark | Use for |
|---|---|---|---|
| `chart-1` | `#4f46e5` | `#6366f1` | Primary series |
| `chart-2` | `#2563eb` | `#3b82f6` | Secondary series |
| `chart-3` | `#059669` | `#10b981` | Positive/green |
| `chart-4` | `#d97706` | `#f59e0b` | Warning/amber |
| `chart-5` | `#7c3aed` | `#8b5cf6` | Accent/purple |

---

## Typography

| Token | Value |
|---|---|
| `--font-sans` | Geist Sans (variable) |
| `--font-mono` | Geist Mono |
| `--font-serif` | Source Serif 4 |
| `--font-heading` | same as `--font-sans` |

**Usage conventions:**
- Page `h1`: `text-2xl font-semibold text-foreground`
- Section `h2`: `text-sm font-semibold text-foreground`
- Body copy: `text-sm text-foreground`
- Metadata / labels: `text-xs text-muted-foreground`
- Data values / KPIs: `text-xl font-bold tabular-nums` (StatRow) or `text-base font-semibold tabular-nums` (MetricTiles)
- All data numbers must use `tabular-nums` for alignment

---

## Spacing & Radius

| Token | Value |
|---|---|
| `--radius` | `0.625rem` (10px) |
| `--radius-sm` | `0.375rem` (6px) |
| `--radius-md` | `0.5rem` (8px) |
| `--radius-lg` | `0.625rem` (10px) |
| `--radius-xl` | `0.875rem` (14px) |
| `--radius-2xl` | `1.125rem` (18px) |

**Section spacing:** `gap-6` between page sections, `gap-4` inside sections.

---

## Animation Tokens

| Token | Value | Tailwind class |
|---|---|---|
| `--duration-fast` | `100ms` | `duration-[var(--duration-fast)]` |
| `--duration-base` | `200ms` | `duration-[var(--duration-base)]` |
| `--duration-slow` | `350ms` | `duration-[var(--duration-slow)]` |
| `--ease-default` | `cubic-bezier(0.4,0,0.2,1)` | standard ease-in-out |
| `--ease-spring` | `cubic-bezier(0.34,1.56,0.64,1)` | spring/overshoot |

**Existing animation:** `.animate-fade-in-up` — 450ms ease-out, used on bento homepage cards.

---

## Component Conventions

### Buttons

| Variant | Classes |
|---|---|
| Primary | `bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium` |
| Secondary / outline | `border border-border bg-card text-foreground hover:bg-accent` |
| Ghost small | `text-xs text-muted-foreground hover:text-foreground` |
| Destructive | `bg-destructive text-white` |

### Cards

Standard section card: `rounded-lg border border-border bg-card p-4`

### Tables

Financial-style tables use: dark header `bg-slate-800 text-white`, alternating hover `hover:bg-muted/20`, `tabular-nums text-right text-xs` on data cells.

---

## Server vs Client Component Rules

| Component | Status | Reason |
|---|---|---|
| `BarChart` | Server | Pure render, no hooks/browser APIs |
| `MetricTiles` | Server | Pure render |
| `StatRow` | Server | Pure render |
| `FinancialComparison` | Client (`"use client"`) | Uses `useState` for tab switching |
| `PlayerComparison` | Client (`"use client"`) | Complex state machine |
| `SectorQaSection` | Client (`"use client"`) | Chat state, `useEffect` scroll |
| `CompanyAnalysisView` | Client (`"use client"`) | Active section state |
| `ArticleGrid` / `ArticleCard` | Client | Bookmark/read/save transitions |
| `MagazineLibrary` | Client | Filter state |

**`next/dynamic` usage:** `FinancialComparison` is lazy-loaded inside `PlayerComparison` via `dynamic(..., { ssr: false })` to split its bundle and avoid loading it until the user requests financials.

---

## Feature-Specific Design Notes

### News Page (Ken Style)
- Hero article: full-width `ArticleCard` with `size="hero"` — large serif title, summary, full action bar
- Subsequent articles: `size="list"` rows inside a `divide-y divide-border` container — compact, title + meta only

### Industry Primer
- Section headers use `text-sm font-semibold` with `SourceLink` wrappers for quick Google-search access
- Consulting Lens section uses `border-violet-500/40 bg-violet-500/5` to visually separate interview-critical content
- Growth Drivers: `border-emerald-500/30 bg-emerald-500/5`
- Challenges: `border-rose-500/30 bg-rose-500/5`
- Recent Updates: `border-amber-500/30 bg-amber-500/5`

### Company Analysis
- Entity links auto-enabled: SEBI, RBI, IRDAI, TRAI, CCI, CERC, MNRE, NSE, BSE, NCLT, IBBI, PFRDA, AMFI, NITI Aayog, NPCI, UPI, REITs, InvITs + key schemes
- Tear-sheet export: `TearSheetButton` opens a new tab with a 3-col A4-landscape HTML that auto-prints
- Sidebar drawer: `Sheet` from `@base-ui/react/dialog`, `w-[min(90vw,44rem)]`, slides from right
