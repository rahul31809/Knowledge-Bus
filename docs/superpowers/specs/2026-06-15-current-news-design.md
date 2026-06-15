# Current News — Design

**Date:** 2026-06-15
**Status:** Approved, pending implementation plan

## Context

The `/news` page (`src/app/(app)/news/page.tsx`) is currently a static
placeholder ("Coming soon"). This design builds it into a real feature:
ingest articles from 7 RSS-based sources, categorize each article into a
tailored topic taxonomy via Gemini, and let the user generate an on-demand
AI "so-what" summary per topic section.

The design follows the precedent set by the existing Magazines pipeline
(`magazine_issues`/`magazine_articles` tables, `extractTableOfContents`,
`fetchMagazineArticlesByCategory`, `MagazineLibrary`, `/api/scan-magazines`)
but is lighter weight — text-only RSS ingestion instead of per-PDF Gemini
calls.

## Scope

**In scope:**

- 7 RSS/web sources (table below)
- Gemini-based per-article categorization into a tailored taxonomy
- Collapsible-sections UI on `/news`, mirroring `magazine-library.tsx`
- Per-section, on-demand "Generate AI Summary" (so-what takeaways)
- Daily cron scan + manual "Refresh news" button
- Homepage "Current News" card meta update (article/unread counts)

**Out of scope (deferred to phase 2):** Gmail-sourced newsletters (The Ken,
Mint, Financial Times). The codebase only has a Google Drive **service
account** configured (`GOOGLE_SERVICE_ACCOUNT_JSON`); Gmail API access to a
personal gmail.com account requires OAuth (consent screen + refresh token
storage), which doesn't exist yet. Re-scoped as its own design later.

## Sources & Feeds

All 7 sources expose working RSS feeds (verified) — no scraping needed:

| Source | Feed URL |
| --- | --- |
| Zerodha Aftermarket Report | `https://aftermarketreport.zerodha.com/feed` |
| Capital Letters by Angel One | `https://capitallettersangelone.substack.com/feed` |
| The Daily Brief by Zerodha | `https://thedailybrief.zerodha.com/feed` |
| In The Money by Zerodha | `https://inthemoneybyzerodha.substack.com/feed` |
| ET Energy | `https://energy.economictimes.indiatimes.com/rss/topstories` |
| Aswath Damodaran | `https://aswathdamodaran.substack.com/feed` |
| Finshots | `https://finshots.in/rss/` |

Every feed provides `title`, `link`, `pubDate`, and a short `description`
(Substack feeds also provide full `content:encoded`, unused for now). This
is sufficient for both categorization and the per-section AI summaries.

The 7 sources are defined as a static list in code
(`src/lib/news/sources.ts`, `NEWS_SOURCES: {name, feedUrl}[]`) — no
`news_sources` table.

## Taxonomy

Six sections (5 substantive + `"Other"` fallback), tailored to these sources
and Rahul's consulting/energy background:

| Section | Typical content |
| --- | --- |
| **Markets & Investing** | Daily market wraps, equity/index moves, trading & investing concepts (Aftermarket Report, Capital Letters, In The Money) |
| **Business & Corporate Strategy** | Company news, M&A, competitive moves, business deep-dives, and AI/tech industry developments (Daily Brief, Finshots, Damodaran's company pieces) |
| **Economy & Policy** | Macro, government policy, regulation, global economy (Daily Brief, Finshots, ET Energy policy stories) |
| **Energy & Infrastructure** | Power, renewables, oil & gas (ET Energy primarily) |
| **Valuation & Corporate Finance** | Valuation frameworks, IPOs, financial analysis (Damodaran primarily) |
| **Other** | Anything that doesn't fit cleanly |

Categorization is **per-article** (via Gemini), not per-source — a single
feed can contribute articles to multiple sections.

**Designed for change:** `NEWS_SECTIONS` is a single `const` array in
`src/lib/types.ts` (same pattern as `MAGAZINE_SECTIONS`). The DB `category`
column is plain `text` with no enum/check constraint, so the taxonomy can be
edited in code without a migration. Articles whose stored `category` doesn't
match the current list fall back to `"Other"` when grouped (same fallback
logic as `fetchMagazineArticlesByCategory`). Re-categorizing existing
articles after a taxonomy change is out of scope for v1.

## Data Model

New migration `supabase/migrations/0013_news_articles.sql`:

```sql
create table if not exists public.news_articles (
  id            uuid        primary key default gen_random_uuid(),
  source        text        not null,           -- e.g. "ET Energy", "Aswath Damodaran"
  title         text        not null,
  link          text        not null unique,    -- dedup key across scans
  summary       text,                            -- RSS description/teaser, HTML stripped
  published_at  timestamptz,
  category      text        not null default 'Other',
  is_read       boolean     not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists news_articles_category_idx on public.news_articles (category);
create index if not exists news_articles_published_at_idx on public.news_articles (published_at desc);

alter table public.news_articles enable row level security;

create policy "authenticated users can read news articles"
  on public.news_articles for select to authenticated using (true);

create policy "authenticated users can update news articles"
  on public.news_articles for update to authenticated using (true) with check (true);
```

Writes (insert new articles, update `category`) go through the service-role
client in `/api/scan-news`, same as `magazine_articles`. Reads and `is_read`
toggles go through the session client.

## Ingestion Route (`/api/scan-news`)

New files:

- `src/lib/news/sources.ts` — `NEWS_SOURCES: {name, feedUrl}[]`
- `src/lib/news/categorizer.ts` — `categorizeArticles(items)`, Gemini call
- `src/app/api/scan-news/route.ts` — the scan route

Flow:

1. Auth: `CRON_SECRET` bearer or session — identical check to
   `/api/scan-magazines`. `export const maxDuration = 60`.
2. Fetch all 7 feeds in parallel via `rss-parser` (new dependency).
   Per-source try/catch — one feed failing doesn't fail the whole scan,
   just gets recorded in the response.
3. Flatten to `{ source, title, link, summary, publishedAt }`, stripping
   HTML tags from `summary`.
4. Query `news_articles` for links already present in this batch; keep only
   genuinely new items.
5. Insert new items via service-role client with `category: 'Other'`,
   returning their `id`s.
6. Send new items to `categorizeArticles` in chunks of ~30
   `{title, summary}` pairs (a typical run is one chunk; a first-ever run
   with ~150 articles needs ~5). A ~4s delay between chunks keeps well
   under Gemini free-tier RPM limits — total time stays well within the 60s
   budget.
7. Update each new row's `category` from the result. Anything off-taxonomy
   or a length mismatch falls back to `"Other"`.
8. Return `{ ok, scannedAt, perSource: [{source, fetched, new, error?}], categorized, errors }`.

### Categorization (`categorizeArticles`)

Same pattern as `extractTableOfContents` in
`src/lib/drive-sync/magazine-scanner.ts`:

- `ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: [prompt] })`
- Prompt lists the 6 `NEWS_SECTIONS`, includes a numbered list of
  `{title, summary}` pairs, and asks for a same-length JSON array of
  category strings (one per item, same order).
- Regex-extract the JSON array from `result.text`, parse, and normalize:
  pad/truncate to match input length, map any value not in `NEWS_SECTIONS`
  to `"Other"`.

### Trigger

Add to `vercel.json` crons alongside the existing entries:

```json
{ "path": "/api/scan-news", "schedule": "0 5 * * *" }
```

(Runs before the existing 0700 magazine scan.) Plus a manual "Refresh news"
button on `/news` (session-authed call to the same route).

## AI Summary Route (`/api/news/summarize`)

- New route `src/app/api/news/summarize/route.ts`, `POST { section: string }`.
- Auth: session only (user-triggered button, not cron) — same pattern as
  `/api/industries/ask`. `export const maxDuration = 30`.
- Fetches the 8 most recent articles in that section (`published_at desc`,
  regardless of read status), sends `{title, summary}` for each to Gemini.
- Prompt: write a "so-what" takeaway for someone prepping for
  strategy-consulting interviews — 2-3 bullets covering the key stories and
  why they matter, markdown allowed.
- Returns `{ summary: string }`. **Not persisted** — generated fresh on each
  click, rendered client-side via the existing `<Markdown>` component.

## UI

**Types (`src/lib/types.ts`):**

- `NEWS_SECTIONS` const array (the 6 taxonomy sections) + `NewsSection` type
- `NewsArticle`: `{ id, title, link, source, summary, publishedAt, isRead }`
- `NewsCategoryGroup`: `{ section: NewsSection, articles: NewsArticle[] }`

**`fetchNewsArticlesByCategory` (`src/lib/queries.ts`):** mirrors
`fetchMagazineArticlesByCategory` but simpler — single table, no join.
Groups rows by `category` (unrecognized values fall back to `"Other"`),
sorts each group by `published_at desc`, returns groups in `NEWS_SECTIONS`
order, dropping empty groups.

**`src/app/(app)/news/actions.ts`:** `setNewsArticleReadStatus(id, isRead)`
— same shape as `setArticleReadStatus`, `revalidatePath("/news")`.

**`src/components/news-library.tsx`** (mirrors `magazine-library.tsx`):

- `ArticleRow` — checkbox (is_read toggle), title as external link, source
  badge, relative published time (small inline helper, no new dependency)
- `CategorySection` — `<details>` per section: header shows section name +
  unread count; article list; below it a "Generate AI Summary" button
  (`SparklesIcon`/`Loader2Icon`, same loading pattern as
  `FrameworkInsightCard`) that POSTs to `/api/news/summarize` and renders
  the result via `<Markdown>` — regenerates fresh on each click
- `NewsLibrary` — top-level: "Refresh news" button (calls `/api/scan-news`,
  loading state, then `router.refresh()`) + maps groups to `CategorySection`s

**`src/app/(app)/news/page.tsx`:** replace placeholder with header +
`NewsLibrary`, or an empty-state message ("No articles yet — run the news
scan") if `categories.length === 0`, mirroring the magazines page.

**Homepage (`src/app/(app)/page.tsx`):** add `fetchNewsArticlesByCategory` to
the existing `Promise.all`; update the "Current News" card's `meta` from
`"Coming soon"` to `` `${total} articles · ${unread} unread` `` (same
pattern as the "Articles" card), or leave "No articles yet" if empty.

## New Dependency

`rss-parser` (RSS/Atom feed parsing).

## Verification

1. `npm install` (new dependency), `npm run lint && npm run build`.
2. Run `/api/scan-news` (manually, with session or `CRON_SECRET`):
   - Confirm articles are inserted across multiple sources, each assigned a
     category from `NEWS_SECTIONS`.
   - Re-run immediately — confirm no duplicate rows (dedup via `link`).
3. Open `/news`:
   - Confirm 6 (or fewer, if some are empty) collapsible sections, each with
     articles from possibly multiple sources.
   - Toggle an article's "read" checkbox — persists across reload.
   - Click "Generate AI Summary" on a section — confirm 2-3 markdown bullets
     render.
   - Click "Refresh news" — confirm it re-triggers the scan and the page
     updates.
4. Check homepage — "Current News" card shows article/unread counts instead
   of "Coming soon".
