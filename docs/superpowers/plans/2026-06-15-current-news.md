# Current News Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/news` page into a real feature — ingest articles from 7 RSS feeds, categorize each article into a tailored taxonomy via Gemini, and let the user view articles grouped by topic with on-demand AI "so-what" summaries per section.

**Architecture:** A new `news_articles` Supabase table stores deduplicated articles (keyed by `link`). A cron-and-manual ingestion route (`/api/scan-news`) fetches all 7 feeds via `rss-parser`, dedupes against existing rows, batches new articles through Gemini for categorization, and upserts them. The `/news` page renders collapsible sections (mirroring `magazine-library.tsx`) with a per-section "Generate AI Summary" button that calls a second route (`/api/news/summarize`) and renders markdown via the existing `<Markdown>` component.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), `rss-parser` (new dependency), `@google/genai` (`gemini-3.1-flash-lite`), `react-markdown`/`remark-gfm` (existing), Tailwind semantic dark-mode tokens.

---

### Task 1: Dependency + database migration

**Files:**
- Modify: `package.json` (via `npm install`)
- Create: `supabase/migrations/0013_news_articles.sql`

- [ ] **Step 1: Install `rss-parser`**

Run:

```bash
npm install rss-parser
```

Expected: `package.json` and `package-lock.json` gain a `rss-parser` entry (it ships its own TypeScript types, no `@types/` package needed).

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/0013_news_articles.sql`:

```sql
create table if not exists public.news_articles (
  id            uuid        primary key default gen_random_uuid(),
  source        text        not null,
  title         text        not null,
  link          text        not null unique,
  summary       text,
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

- [ ] **Step 3: Apply the migration manually**

This repo's database schema is applied manually (per `README.md`: "Database schema lives in `supabase/migrations/` — apply them in order via the Supabase SQL editor.").

**Action for Rahul (not automatable from here):** open the Supabase SQL Editor for this project and run the contents of `supabase/migrations/0013_news_articles.sql`. Confirm the `news_articles` table appears under Table Editor with the two indexes and two RLS policies listed above.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json supabase/migrations/0013_news_articles.sql
git commit -m "feat: add news_articles table and rss-parser dependency"
```

---

### Task 2: News taxonomy and types

**Files:**
- Modify: `src/lib/types.ts:281` (insert after `MagazineCategoryGroup`, before `UNSORTED_LABEL`)

- [ ] **Step 1: Add `NEWS_SECTIONS`, `NewsSection`, `NewsArticle`, `NewsCategoryGroup`**

In `src/lib/types.ts`, find this existing block:

```ts
export interface MagazineCategoryGroup {
  section: MagazineSection;
  articles: MagazineArticle[];
}

export const UNSORTED_LABEL = "Unsorted";
```

Replace it with (inserting the new block between the two):

```ts
export interface MagazineCategoryGroup {
  section: MagazineSection;
  articles: MagazineArticle[];
}

export const NEWS_SECTIONS = [
  "Markets & Investing",
  "Business & Corporate Strategy",
  "Economy & Policy",
  "Energy & Infrastructure",
  "Valuation & Corporate Finance",
  "Other",
] as const;

export type NewsSection = (typeof NEWS_SECTIONS)[number];

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  summary: string;
  publishedAt: string | null;
  isRead: boolean;
}

export interface NewsCategoryGroup {
  section: NewsSection;
  articles: NewsArticle[];
}

export const UNSORTED_LABEL = "Unsorted";
```

- [ ] **Step 2: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add NEWS_SECTIONS taxonomy and news article types"
```

---

### Task 3: News sources list

**Files:**
- Create: `src/lib/news/sources.ts`

- [ ] **Step 1: Create the sources file**

Create `src/lib/news/sources.ts`:

```ts
export interface NewsSource {
  name: string;
  feedUrl: string;
}

export const NEWS_SOURCES: NewsSource[] = [
  { name: "Zerodha Aftermarket Report", feedUrl: "https://aftermarketreport.zerodha.com/feed" },
  { name: "Capital Letters by Angel One", feedUrl: "https://capitallettersangelone.substack.com/feed" },
  { name: "The Daily Brief by Zerodha", feedUrl: "https://thedailybrief.zerodha.com/feed" },
  { name: "In The Money by Zerodha", feedUrl: "https://inthemoneybyzerodha.substack.com/feed" },
  { name: "ET Energy", feedUrl: "https://energy.economictimes.indiatimes.com/rss/topstories" },
  { name: "Aswath Damodaran", feedUrl: "https://aswathdamodaran.substack.com/feed" },
  { name: "Finshots", feedUrl: "https://finshots.in/rss/" },
];
```

- [ ] **Step 2: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/news/sources.ts
git commit -m "feat: add NEWS_SOURCES feed list"
```

---

### Task 4: Article categorizer (Gemini)

**Files:**
- Create: `src/lib/news/categorizer.ts`

- [ ] **Step 1: Create the categorizer**

Create `src/lib/news/categorizer.ts`:

```ts
import { GoogleGenAI } from "@google/genai";
import { NEWS_SECTIONS, type NewsSection } from "@/lib/types";

const SECTION_LIST = NEWS_SECTIONS.map((section) => `- ${section}`).join("\n");
const CHUNK_SIZE = 30;
const CHUNK_DELAY_MS = 4000;

export interface CategorizeInput {
  title: string;
  summary: string;
}

function normalizeSection(value: unknown): NewsSection {
  if (typeof value !== "string") return "Other";
  const trimmed = value.trim().toLowerCase();
  const match = NEWS_SECTIONS.find((section) => section.toLowerCase() === trimmed);
  return match ?? "Other";
}

async function categorizeChunk(ai: GoogleGenAI, items: CategorizeInput[]): Promise<NewsSection[]> {
  const list = items
    .map((item, i) => `${i + 1}. Title: ${item.title}\n   Summary: ${item.summary}`)
    .join("\n");

  const prompt = `Classify each of these ${items.length} news articles into exactly one of these categories:
${SECTION_LIST}

Articles:
${list}

Output ONLY a valid JSON array of exactly ${items.length} strings (the category for each article, in the same order as listed above), nothing else.
Example: ["Markets & Investing", "Energy & Infrastructure"]`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const text = result.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return items.map(() => "Other");

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return items.map(() => "Other");

    return items.map((_, i) => normalizeSection(parsed[i]));
  } catch {
    return items.map(() => "Other");
  }
}

export async function categorizeArticles(items: CategorizeInput[]): Promise<NewsSection[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || items.length === 0) {
    return items.map(() => "Other");
  }

  const ai = new GoogleGenAI({ apiKey });
  const results: NewsSection[] = [];

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    results.push(...(await categorizeChunk(ai, chunk)));

    if (i + CHUNK_SIZE < items.length) {
      await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    }
  }

  return results;
}
```

- [ ] **Step 2: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/news/categorizer.ts
git commit -m "feat: add Gemini-based news article categorizer"
```

---

### Task 5: Ingestion route `/api/scan-news`

**Files:**
- Create: `src/app/api/scan-news/route.ts`

- [ ] **Step 1: Create the scan route**

Create `src/app/api/scan-news/route.ts`:

```ts
import Parser from "rss-parser";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { NEWS_SOURCES } from "@/lib/news/sources";
import { categorizeArticles } from "@/lib/news/categorizer";
import { htmlToPlainText } from "@/lib/sanitize";

export const maxDuration = 60;

type NewsFeedItem = { description?: string };

interface ParsedArticle {
  source: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
}

interface SourceResult {
  source: string;
  fetched: number;
  new: number;
  error?: string;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Called by cron or curl with the secret — allowed
  } else {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const parser = new Parser<Record<string, unknown>, NewsFeedItem>({
    customFields: { item: ["description"] },
  });

  const perSource: SourceResult[] = [];
  const allItems: ParsedArticle[] = [];

  await Promise.all(
    NEWS_SOURCES.map(async ({ name, feedUrl }) => {
      try {
        const feed = await parser.parseURL(feedUrl);
        const items = (feed.items ?? [])
          .filter((item) => item.link && item.title)
          .map((item) => ({
            source: name,
            title: item.title!.trim(),
            link: item.link!.trim(),
            summary: htmlToPlainText(item.description ?? item.contentSnippet ?? "").slice(0, 500),
            publishedAt: item.isoDate ?? null,
          }));

        perSource.push({ source: name, fetched: items.length, new: 0 });
        allItems.push(...items);
      } catch (err) {
        perSource.push({
          source: name,
          fetched: 0,
          new: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  if (allItems.length === 0) {
    return NextResponse.json({
      ok: true,
      scannedAt: new Date().toISOString(),
      perSource,
      categorized: 0,
      errors: perSource.filter((r) => r.error).length,
    });
  }

  const { data: existing, error: existingError } = await supabase
    .from("news_articles")
    .select("link")
    .in("link", allItems.map((item) => item.link));

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }

  const existingLinks = new Set((existing ?? []).map((row) => row.link as string));
  const newItems = allItems.filter((item) => !existingLinks.has(item.link));

  let categorized = 0;

  if (newItems.length > 0) {
    const categories = await categorizeArticles(
      newItems.map((item) => ({ title: item.title, summary: item.summary }))
    );

    const { error: insertError } = await supabase.from("news_articles").upsert(
      newItems.map((item, i) => ({
        source: item.source,
        title: item.title,
        link: item.link,
        summary: item.summary,
        published_at: item.publishedAt,
        category: categories[i] ?? "Other",
      })),
      { onConflict: "link", ignoreDuplicates: true }
    );

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    categorized = newItems.length;

    const newLinks = new Set(newItems.map((item) => item.link));
    for (const result of perSource) {
      result.new = allItems.filter((item) => item.source === result.source && newLinks.has(item.link)).length;
    }
  }

  return NextResponse.json({
    ok: true,
    scannedAt: new Date().toISOString(),
    perSource,
    categorized,
    errors: perSource.filter((r) => r.error).length,
  });
}
```

- [ ] **Step 2: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/scan-news/route.ts
git commit -m "feat: add /api/scan-news ingestion route"
```

---

### Task 6: `fetchNewsArticlesByCategory` query

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Add the import**

In `src/lib/queries.ts`, find the import that brings in `MagazineCategoryGroup` and related types near the top of the file (alongside the other `@/lib/types` imports), and add the new types to it. For example, if the existing import looks like:

```ts
import type { MagazineArticle, MagazineCategoryGroup, MagazineSection } from "@/lib/types";
```

change it to:

```ts
import type {
  MagazineArticle,
  MagazineCategoryGroup,
  MagazineSection,
  NewsArticle,
  NewsCategoryGroup,
  NewsSection,
} from "@/lib/types";
import { NEWS_SECTIONS } from "@/lib/types";
```

(If the existing imports from `@/lib/types` are spread across multiple lines or a different grouping, add `NewsArticle`, `NewsCategoryGroup`, `NewsSection` as type-only imports and `NEWS_SECTIONS` as a value import — keep the existing `Magazine*` imports unchanged.)

- [ ] **Step 2: Add `fetchNewsArticlesByCategory`**

At the end of `src/lib/queries.ts`, after the existing `fetchMagazineArticlesByCategory` function, add:

```ts
interface NewsArticleRow {
  id: string;
  title: string;
  link: string;
  source: string;
  summary: string | null;
  published_at: string | null;
  category: string;
  is_read: boolean;
}

export async function fetchNewsArticlesByCategory(supabase: SupabaseServerClient): Promise<NewsCategoryGroup[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select("id, title, link, source, summary, published_at, category, is_read")
    .order("published_at", { ascending: false });

  if (error) {
    return [];
  }

  const bySection = new Map<NewsSection, NewsArticle[]>();

  for (const row of (data ?? []) as NewsArticleRow[]) {
    const section: NewsSection = (NEWS_SECTIONS as readonly string[]).includes(row.category)
      ? (row.category as NewsSection)
      : "Other";

    const articles = bySection.get(section) ?? [];
    articles.push({
      id: row.id,
      title: row.title,
      link: row.link,
      source: row.source,
      summary: row.summary ?? "",
      publishedAt: row.published_at,
      isRead: row.is_read,
    });
    bySection.set(section, articles);
  }

  return NEWS_SECTIONS.map((section) => ({
    section,
    articles: bySection.get(section) ?? [],
  })).filter((group) => group.articles.length > 0);
}
```

- [ ] **Step 3: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add fetchNewsArticlesByCategory query"
```

---

### Task 7: News actions

**Files:**
- Create: `src/app/(app)/news/actions.ts`

- [ ] **Step 1: Create the actions file**

Create `src/app/(app)/news/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setNewsArticleReadStatus(articleId: string, isRead: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("news_articles").update({ is_read: isRead }).eq("id", articleId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/news");
}
```

- [ ] **Step 2: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/news/actions.ts"
git commit -m "feat: add setNewsArticleReadStatus server action"
```

---

### Task 8: News library component

**Files:**
- Create: `src/components/news-library.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/news-library.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRightIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { setNewsArticleReadStatus } from "@/app/(app)/news/actions";
import { Markdown } from "@/components/industry-primer/markdown";
import { cn } from "@/lib/utils";
import type { NewsArticle, NewsCategoryGroup } from "@/lib/types";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function ArticleRow({ article }: { article: NewsArticle }) {
  const [isRead, setIsRead] = useState(article.isRead);
  const [pending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setIsRead(checked);
    startTransition(async () => {
      try {
        await setNewsArticleReadStatus(article.id, checked);
      } catch {
        setIsRead(!checked);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <input
        type="checkbox"
        checked={isRead}
        disabled={pending}
        onChange={(e) => handleToggle(e.target.checked)}
        className="size-4 shrink-0 accent-primary"
        aria-label={`Mark "${article.title}" as read`}
      />
      <a href={article.link} target="_blank" rel="noopener noreferrer" className="group flex flex-1 items-center gap-2 truncate">
        <div className="flex flex-col truncate">
          <span className={cn("truncate text-sm group-hover:underline", isRead ? "text-muted-foreground" : "text-foreground")}>
            {article.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {article.source}
            {article.publishedAt ? ` · ${formatRelativeTime(article.publishedAt)}` : ""}
          </span>
        </div>
        <ExternalLinkIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
      </a>
    </div>
  );
}

function CategorySection({ group }: { group: NewsCategoryGroup }) {
  const readCount = group.articles.filter((a) => a.isRead).length;
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: group.section }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to generate summary");
      }

      const data = (await res.json()) as { summary: string };
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="group/category rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/category:rotate-90" />
        {group.section}
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {readCount}/{group.articles.length} read
        </span>
      </summary>

      <div className="flex flex-col gap-1 border-t border-border p-2">
        {group.articles.map((article) => (
          <ArticleRow key={article.id} article={article} />
        ))}
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
          Generate AI Summary
        </button>

        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

        {summary ? (
          <div className="mt-3 border-t border-border pt-3">
            <Markdown>{summary}</Markdown>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function RefreshNewsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      await fetch("/api/scan-news");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={loading}
      className="inline-flex items-center gap-2 self-start rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
    >
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
      Refresh news
    </button>
  );
}

export function NewsLibrary({ categories }: { categories: NewsCategoryGroup[] }) {
  return (
    <div className="flex flex-col gap-3">
      <RefreshNewsButton />
      {categories.map((group) => (
        <CategorySection key={group.section} group={group} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/news-library.tsx
git commit -m "feat: add NewsLibrary component"
```

---

### Task 9: AI summary route `/api/news/summarize`

**Files:**
- Create: `src/app/api/news/summarize/route.ts`

- [ ] **Step 1: Create the summarize route**

Create `src/app/api/news/summarize/route.ts`:

```ts
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NEWS_SECTIONS } from "@/lib/types";

export const maxDuration = 30;

interface SummarizeRequestBody {
  section?: string;
}

const ARTICLE_LIMIT = 8;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SummarizeRequestBody;
  const section = body.section;

  if (!section || !(NEWS_SECTIONS as readonly string[]).includes(section)) {
    return NextResponse.json({ error: "Invalid or missing section" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("news_articles")
    .select("title, summary")
    .eq("category", section)
    .order("published_at", { ascending: false })
    .limit(ARTICLE_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const articles = data ?? [];
  if (articles.length === 0) {
    return NextResponse.json({ error: "No articles in this section yet" }, { status: 404 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const articleList = articles
    .map((a, i) => `${i + 1}. ${a.title}${a.summary ? ` — ${a.summary}` : ""}`)
    .join("\n");

  const prompt = `You are briefing an MBA student preparing for strategy consulting interviews (Big 4 / Accenture Strategy, India-focused recruiting) on recent news in the "${section}" category.

Here are the recent article headlines and summaries:
${articleList}

Write a "so what" takeaway: 2-3 bullet points covering the key stories and why they matter for someone building consulting case-readiness and business fluency. Markdown allowed (e.g. **bold** for key terms). Output ONLY the bullet points, no preamble.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  const text = (result.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Gemini did not return a summary" }, { status: 502 });
  }

  return NextResponse.json({ summary: text });
}
```

- [ ] **Step 2: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/news/summarize/route.ts
git commit -m "feat: add /api/news/summarize AI summary route"
```

---

### Task 10: Rewrite `/news` page

**Files:**
- Modify: `src/app/(app)/news/page.tsx` (full rewrite)

- [ ] **Step 1: Replace the placeholder page**

Replace the entire contents of `src/app/(app)/news/page.tsx`:

```tsx
import { NewsLibrary } from "@/components/news-library";
import { fetchNewsArticlesByCategory } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function NewsPage() {
  const supabase = await createClient();
  const categories = await fetchNewsArticlesByCategory(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Current News</h1>
        <p className="text-sm text-muted-foreground">
          Daily articles from your market, business and energy newsletters, grouped by topic.
        </p>
      </div>

      <NewsLibrary categories={categories} />

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No articles yet. Click &quot;Refresh news&quot; above to run the first scan.
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/news/page.tsx"
git commit -m "feat: build out /news page with NewsLibrary"
```

---

### Task 11: Homepage "Current News" card

**Files:**
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Add the news query to the imports**

In `src/app/(app)/page.tsx`, change line 7 from:

```tsx
import { fetchEntries, fetchMagazineArticlesByCategory, fetchSubjects, withDriveOnlySubjects } from "@/lib/queries";
```

to:

```tsx
import { fetchEntries, fetchMagazineArticlesByCategory, fetchNewsArticlesByCategory, fetchSubjects, withDriveOnlySubjects } from "@/lib/queries";
```

- [ ] **Step 2: Fetch news categories in `Promise.all`**

Change:

```tsx
  const [subjects, driveSubjectNames, categories, briefingEntries] = await Promise.all([
    fetchSubjects(supabase),
    fetchDriveSubjectNames().catch(() => null),
    fetchMagazineArticlesByCategory(supabase),
    fetchEntries(supabase, { excludeType: "study_notes" }),
  ]);
```

to:

```tsx
  const [subjects, driveSubjectNames, categories, briefingEntries, newsCategories] = await Promise.all([
    fetchSubjects(supabase),
    fetchDriveSubjectNames().catch(() => null),
    fetchMagazineArticlesByCategory(supabase),
    fetchEntries(supabase, { excludeType: "study_notes" }),
    fetchNewsArticlesByCategory(supabase),
  ]);
```

- [ ] **Step 3: Compute news totals**

Change:

```tsx
  const allArticles = categories.flatMap((group) => group.articles);
  const unreadArticles = allArticles.filter((a) => !a.isRead);
```

to:

```tsx
  const allArticles = categories.flatMap((group) => group.articles);
  const unreadArticles = allArticles.filter((a) => !a.isRead);

  const allNewsArticles = newsCategories.flatMap((group) => group.articles);
  const unreadNewsArticles = allNewsArticles.filter((a) => !a.isRead);
```

- [ ] **Step 4: Update the "Current News" card**

Change:

```tsx
        <DashboardCard
          href="/news"
          icon={RssIcon}
          accent="emerald"
          title="Current News"
          description="The Ken, Mint, Financial Times and more — refreshed daily"
          meta="Coming soon"
        />
```

to:

```tsx
        <DashboardCard
          href="/news"
          icon={RssIcon}
          accent="emerald"
          title="Current News"
          description="Markets, business and energy news — refreshed daily"
          meta={
            allNewsArticles.length > 0
              ? `${allNewsArticles.length} articles · ${unreadNewsArticles.length} unread`
              : "No articles yet"
          }
        />
```

- [ ] **Step 5: Lint**

Run:

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/page.tsx"
git commit -m "feat: show Current News article counts on homepage"
```

---

### Task 12: Cron entry

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the scan-news cron entry**

In `vercel.json`, change:

```json
{
  "crons": [
    { "path": "/api/keep-alive", "schedule": "0 6 * * *" },
    { "path": "/api/sync-drive", "schedule": "0 16 * * *" },
    { "path": "/api/scan-magazines", "schedule": "0 7 * * *" }
  ]
}
```

to:

```json
{
  "crons": [
    { "path": "/api/keep-alive", "schedule": "0 6 * * *" },
    { "path": "/api/sync-drive", "schedule": "0 16 * * *" },
    { "path": "/api/scan-news", "schedule": "0 5 * * *" },
    { "path": "/api/scan-magazines", "schedule": "0 7 * * *" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add daily /api/scan-news cron job"
```

---

### Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run:

```bash
npm run lint && npm run build
```

Expected: both complete with no errors (pre-existing warnings in unrelated files are fine).

- [ ] **Step 2: Manual smoke test**

With `npm run dev` running (and the migration from Task 1 applied):

1. Sign in, navigate to `/news`. It should show the empty state with a "Refresh news" button.
2. Click "Refresh news". Wait for it to finish (first run may take ~20-30s while Gemini categorizes ~100+ articles across 7 feeds).
3. The page should now show up to 6 collapsible sections (only non-empty ones), each listing articles with source + relative time.
4. Toggle an article's checkbox — it should stay checked after a page reload.
5. Expand a section and click "Generate AI Summary" — confirm 2-3 markdown bullet points render below the article list.
6. Click "Refresh news" again — confirm no duplicate articles appear (dedup via `link`).
7. Go to `/` (homepage) — confirm the "Current News" card shows `"<N> articles · <M> unread"` instead of "No articles yet".

- [ ] **Step 3: Final commit (if any fixes were needed during smoke test)**

```bash
git add -A
git commit -m "fix: address issues found during Current News smoke test"
```

(Skip this step if no fixes were needed.)

---

## Self-Review

**Spec coverage:**

- 7 RSS sources → Task 3 (`NEWS_SOURCES`).
- 6-section taxonomy, `NEWS_SECTIONS`/`NewsSection` as a single editable const → Task 2.
- `news_articles` table, indexes, RLS → Task 1.
- `/api/scan-news`: parallel fetch, dedup via `link`, Gemini categorization in chunks of 30 with 4s delay, `maxDuration = 60`, cron-or-session auth → Task 5 (and `categorizeArticles` → Task 4).
- `vercel.json` cron entry → Task 12.
- `/api/news/summarize`: session-only auth, 8 most recent articles per section, `maxDuration = 30`, markdown "so-what" output → Task 9.
- `fetchNewsArticlesByCategory`, grouping + `"Other"` fallback + `NEWS_SECTIONS` order → Task 6.
- `setNewsArticleReadStatus` → Task 7.
- `news-library.tsx` (ArticleRow, CategorySection with AI summary button, NewsLibrary with Refresh button, relative-time helper, dark-mode tokens) → Task 8.
- `/news` page rewrite with empty state → Task 10.
- Homepage card update with article/unread counts → Task 11.
- `rss-parser` dependency → Task 1.
- Verification checklist (lint/build + manual smoke test) → Task 13.

All spec sections are covered.

**Placeholder scan:** No `TBD`/`TODO`/"add appropriate error handling"/"similar to Task N" found — every step has complete code or an explicit manual action (Task 1 Step 3, which genuinely cannot be automated per this repo's convention).

**Type consistency:**

- `NewsArticle { id, title, link, source, summary, publishedAt, isRead }` (Task 2) is used with the same field names in `fetchNewsArticlesByCategory` (Task 6), `ArticleRow`/`CategorySection` (Task 8), and consumed via `NewsCategoryGroup.articles` in `/news/page.tsx` (Task 10) and homepage (Task 11).
- `NewsCategoryGroup { section, articles }` (Task 2) matches `NewsLibrary({ categories: NewsCategoryGroup[] })` (Task 8) and `fetchNewsArticlesByCategory` return type (Task 6).
- `NEWS_SECTIONS`/`NewsSection` (Task 2) is imported and used consistently in `categorizer.ts` (Task 4), `queries.ts` (Task 6), and `summarize/route.ts` (Task 9).
- `categorizeArticles(items: {title, summary}[]): Promise<NewsSection[]>` (Task 4) signature matches its call site in `scan-news/route.ts` (Task 5).
- `setNewsArticleReadStatus(articleId: string, isRead: boolean)` (Task 7) matches the call in `ArticleRow` (Task 8).
- `/api/news/summarize` request body `{ section: string }` (Task 9) matches the `fetch` call body in `CategorySection` (Task 8).
- `/api/scan-news` response shape (`{ ok, scannedAt, perSource, categorized, errors }`, Task 5) is not consumed by the UI's `RefreshNewsButton` (Task 8) beyond awaiting completion — consistent with the spec ("Refresh news button... calls `/api/scan-news`... then `router.refresh()`").

No gaps found.
