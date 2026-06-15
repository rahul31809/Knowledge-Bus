# Save Articles (Current News) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bookmark/"save" toggle to Current News articles, plus a pinned "Saved" section at the top of `/news` listing them.

**Architecture:** Add an `is_saved` boolean column to `news_articles` (mirroring the existing `is_read` column), thread it through the existing type/query/server-action layers using the exact same pattern as `is_read`/`isRead`, then add a bookmark toggle button to `ArticleRow` and a new `SavedSection` component to `news-library.tsx`.

**Tech Stack:** Next.js 16 (App Router), Supabase, TypeScript, Tailwind, lucide-react icons.

**No test runner exists in this project** (`package.json` has no `test` script — verification is `npm run lint` per task, `npm run lint && npm run build` at the end).

---

### Task 1: Data layer — migration, type, query mapping

**Files:**
- Create: `supabase/migrations/0014_news_articles_saved.sql`
- Modify: `src/lib/types.ts:294-302`
- Modify: `src/lib/queries.ts:354-399`

- [ ] **Step 1: Create the migration file**

```sql
alter table public.news_articles add column if not exists is_saved boolean not null default false;
```

This is a manual user action to apply via the Supabase SQL Editor (same as migration 0013) — do not attempt to run it against the live database yourself. The column not existing yet does not break `npm run build` (Supabase client calls aren't type-checked against live schema), so this is non-blocking for the rest of the plan.

- [ ] **Step 2: Add `isSaved` to the `NewsArticle` type**

In `src/lib/types.ts`, the current `NewsArticle` interface (lines 294-302) is:

```ts
export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  summary: string;
  publishedAt: string | null;
  isRead: boolean;
}
```

Change it to:

```ts
export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  summary: string;
  publishedAt: string | null;
  isRead: boolean;
  isSaved: boolean;
}
```

- [ ] **Step 3: Add `is_saved` to the query layer**

In `src/lib/queries.ts`, the current `NewsArticleRow` interface and `fetchNewsArticlesByCategory` function (lines 354-399) are:

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

Change it to:

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
  is_saved: boolean;
}

export async function fetchNewsArticlesByCategory(supabase: SupabaseServerClient): Promise<NewsCategoryGroup[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select("id, title, link, source, summary, published_at, category, is_read, is_saved")
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
      isSaved: row.is_saved,
    });
    bySection.set(section, articles);
  }

  return NEWS_SECTIONS.map((section) => ({
    section,
    articles: bySection.get(section) ?? [],
  })).filter((group) => group.articles.length > 0);
}
```

- [ ] **Step 4: Run lint to verify**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0014_news_articles_saved.sql src/lib/types.ts src/lib/queries.ts
git commit -m "feat: add is_saved column, type field, and query mapping for saved news articles"
```

---

### Task 2: Server action — `setNewsArticleSavedStatus`

**Files:**
- Modify: `src/app/(app)/news/actions.ts`

- [ ] **Step 1: Add the new server action**

The current full content of `src/app/(app)/news/actions.ts` is:

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

Add a second exported function after `setNewsArticleReadStatus`, so the full file becomes:

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

export async function setNewsArticleSavedStatus(articleId: string, isSaved: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("news_articles").update({ is_saved: isSaved }).eq("id", articleId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/news");
}
```

- [ ] **Step 2: Run lint to verify**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/news/actions.ts"
git commit -m "feat: add setNewsArticleSavedStatus server action"
```

---

### Task 3: Bookmark toggle on `ArticleRow`

**Files:**
- Modify: `src/components/news-library.tsx:1-67`

- [ ] **Step 1: Update imports**

The current import block (lines 1-9) is:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRightIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { setNewsArticleReadStatus } from "@/app/(app)/news/actions";
import { Markdown } from "@/components/industry-primer/markdown";
import { cn } from "@/lib/utils";
import type { NewsArticle, NewsCategoryGroup } from "@/lib/types";
```

Change the lucide-react and actions import lines to:

```tsx
import { BookmarkIcon, ChevronRightIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { setNewsArticleReadStatus, setNewsArticleSavedStatus } from "@/app/(app)/news/actions";
```

- [ ] **Step 2: Add the bookmark toggle to `ArticleRow`**

The current `ArticleRow` function (lines 28-67) is:

```tsx
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
```

Replace it with:

```tsx
function ArticleRow({ article }: { article: NewsArticle }) {
  const [isRead, setIsRead] = useState(article.isRead);
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [readPending, startReadTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();

  function handleReadToggle(checked: boolean) {
    setIsRead(checked);
    startReadTransition(async () => {
      try {
        await setNewsArticleReadStatus(article.id, checked);
      } catch {
        setIsRead(!checked);
      }
    });
  }

  function handleSaveToggle() {
    const next = !isSaved;
    setIsSaved(next);
    startSaveTransition(async () => {
      try {
        await setNewsArticleSavedStatus(article.id, next);
      } catch {
        setIsSaved(!next);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <input
        type="checkbox"
        checked={isRead}
        disabled={readPending}
        onChange={(e) => handleReadToggle(e.target.checked)}
        className="size-4 shrink-0 accent-primary"
        aria-label={`Mark "${article.title}" as read`}
      />
      <button
        type="button"
        onClick={handleSaveToggle}
        disabled={savePending}
        className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
        aria-label={isSaved ? `Unsave "${article.title}"` : `Save "${article.title}"`}
      >
        <BookmarkIcon className={cn("size-4", isSaved ? "fill-current text-amber-500" : "fill-none")} />
      </button>
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
```

- [ ] **Step 3: Run lint to verify**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/news-library.tsx
git commit -m "feat: add bookmark toggle to news ArticleRow"
```

---

### Task 4: "Saved" section, pinned at the top of `/news`

**Files:**
- Modify: `src/components/news-library.tsx`

- [ ] **Step 1: Add a sort helper for saved articles**

Add this function after `formatRelativeTime` (which ends at line 26 in the original file, before Task 3's edits):

```ts
function compareByPublishedDesc(a: NewsArticle, b: NewsArticle): number {
  if (!a.publishedAt && !b.publishedAt) return 0;
  if (!a.publishedAt) return 1;
  if (!b.publishedAt) return -1;
  return b.publishedAt.localeCompare(a.publishedAt);
}
```

- [ ] **Step 2: Add the `SavedSection` component**

Add this new function after `ArticleRow` and before `CategorySection`:

```tsx
function SavedSection({ articles }: { articles: NewsArticle[] }) {
  return (
    <details open className="group/category rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/category:rotate-90" />
        Saved ({articles.length})
      </summary>

      <div className="flex flex-col gap-1 border-t border-border p-2">
        {articles.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No saved articles yet — click the bookmark icon on any article to save it here.
          </p>
        ) : (
          articles.map((article) => <ArticleRow key={article.id} article={article} />)
        )}
      </div>
    </details>
  );
}
```

- [ ] **Step 3: Wire `SavedSection` into `NewsLibrary`**

The current `NewsLibrary` export (last function in the file) is:

```tsx
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

Change it to:

```tsx
export function NewsLibrary({ categories }: { categories: NewsCategoryGroup[] }) {
  const savedArticles = categories
    .flatMap((group) => group.articles)
    .filter((article) => article.isSaved)
    .sort(compareByPublishedDesc);

  return (
    <div className="flex flex-col gap-3">
      <RefreshNewsButton />
      <SavedSection articles={savedArticles} />
      {categories.map((group) => (
        <CategorySection key={group.section} group={group} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run lint to verify**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/news-library.tsx
git commit -m "feat: add pinned Saved section to NewsLibrary"
```

---

### Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run lint and build**

Run: `npm run lint && npm run build`
Expected: both complete with no errors (pre-existing warnings in unrelated files are fine).

- [ ] **Step 2: Manual smoke test (requires migration 0014 applied + signed-in session)**

1. Apply `supabase/migrations/0014_news_articles_saved.sql` via the Supabase SQL Editor (if not already applied).
2. Load `/news` — a "Saved (0)" section appears at the top with the empty-state message.
3. Click the bookmark icon on any article — the icon fills amber, and the article appears in "Saved (1)" at the top.
4. Reload the page — the saved state persists.
5. Click the bookmark icon again (from either the category section or the Saved section) — the article disappears from "Saved (0)", icon reverts to outline.
6. Toggle the read checkbox from within the Saved section — confirm the matching article in its category section reflects the same read state after reload.

- [ ] **Step 3 (conditional): Commit any smoke-test fixes**

Only if Step 2 surfaced issues requiring code changes:

```bash
git add -A
git commit -m "fix: address issues found during save-articles smoke test"
```

Skip this step if no fixes were needed.

---

## Self-Review

- **Spec coverage**: migration (Task 1), `NewsArticle.isSaved` type (Task 1), query mapping (Task 1), server action (Task 2), bookmark toggle on `ArticleRow` (Task 3), pinned "Saved" section with count + empty state (Task 4), sort by `publishedAt` desc with nulls last (Task 4 `compareByPublishedDesc`). All spec requirements covered. Magazines, homepage, and "convert to entry" are explicitly out of scope and untouched.
- **Placeholder scan**: no TBD/TODO; all code blocks are complete and copy-pasteable.
- **Type consistency**: `NewsArticle.isSaved` (Task 1) ↔ `NewsArticleRow.is_saved` → `isSaved: row.is_saved` mapping (Task 1) ↔ `setNewsArticleSavedStatus(articleId: string, isSaved: boolean)` (Task 2) ↔ `setNewsArticleSavedStatus(article.id, next)` call site (Task 3) ↔ `article.isSaved` read in `NewsLibrary`/`compareByPublishedDesc` (Task 4) — all consistent.
