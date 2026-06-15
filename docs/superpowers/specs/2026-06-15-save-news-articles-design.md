# Save Articles (Current News) — Design Spec

## Context

The Current News feature (`/news`) lists articles from 7 RSS sources, grouped
into 6 sections, each with a per-article "read" checkbox. Rahul wants a
lightweight way to bookmark articles he genuinely likes for later reference,
without leaving the `/news` page or creating a full Knowledge Base entry.

## Scope

- Current News (`/news`) only — not Magazines.
- A simple per-article "save" toggle (bookmark), independent of read status.
- A pinned "Saved" section at the top of `/news` listing all saved articles
  across categories.
- Out of scope: Magazines save support, homepage card changes, promoting a
  saved article into a full Knowledge Base entry (`/entries`).

## Data Model

New migration `supabase/migrations/0014_news_articles_saved.sql`:

```sql
alter table public.news_articles add column if not exists is_saved boolean not null default false;
```

No new indexes needed — the saved set is small and filtered/sorted
client-side after the existing `fetchNewsArticlesByCategory` query.

## Types

`src/lib/types.ts` — `NewsArticle` gains one field:

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

## Query Layer

`src/lib/queries.ts`:

- `NewsArticleRow` interface gains `is_saved: boolean`.
- `fetchNewsArticlesByCategory`'s `.select(...)` includes `is_saved`.
- The row-to-`NewsArticle` mapping adds `isSaved: row.is_saved`, following
  the exact same pattern as the existing `isRead: row.is_read`.

## Server Action

`src/app/(app)/news/actions.ts` gains a second action, mirroring
`setNewsArticleReadStatus` byte-for-byte except for the column name:

```ts
export async function setNewsArticleSavedStatus(articleId: string, isSaved: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("news_articles").update({ is_saved: isSaved }).eq("id", articleId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/news");
}
```

## UI — `src/components/news-library.tsx`

### `ArticleRow`

- Add a bookmark-icon button between the existing read checkbox and the
  article link/title.
- Local state `isSaved` (initialized from `article.isSaved`), toggled via
  `useTransition` with optimistic update + rollback on error — same pattern
  already used for the read checkbox.
- Icon: lucide-react `BookmarkIcon`.
  - Unsaved: outline, `text-muted-foreground`, hover `text-foreground`.
  - Saved: `fill-current text-amber-500`.
- `aria-label`: `Save "<title>"` / `Unsave "<title>"` depending on state.
- Click handler calls `setNewsArticleSavedStatus(article.id, next)`.

### New "Saved" section

- Rendered in `NewsLibrary`, above `RefreshNewsButton`.
- Computed from `categories` (no extra query): flatten all articles across
  all category groups, filter to `isSaved`, sort by `publishedAt` descending
  (null `publishedAt` sorts last).
- Rendered as a `<details open>` block, visually consistent with
  `CategorySection` (same border/padding/chevron styling), titled "Saved"
  with a count badge, e.g. `Saved (3)`.
- Empty state (when no saved articles): a muted text row reading
  "No saved articles yet — click the bookmark icon on any article to save it
  here."
- Each row reuses `ArticleRow` — read toggle and unsave both work directly
  from this section, and changes reflect in the matching category section too
  (same underlying article, just rendered twice).
- No "Generate AI Summary" button in this section (that's per-category only).

## Error Handling

Same as the existing read-toggle: on action failure, revert the optimistic
UI state. No new error states introduced.

## Testing / Verification

- `npm run lint && npm run build` — no errors.
- Manual smoke test (requires migration 0014 applied + signed-in session):
  1. Load `/news` — "Saved" section shows empty state at top.
  2. Click the bookmark icon on an article in any category — icon fills,
     article appears in the "Saved" section (count updates).
  3. Reload the page — saved state persists (read from DB).
  4. Click the bookmark icon again (either in the category section or the
     Saved section) — article disappears from "Saved", icon reverts to
     outline.
  5. Toggling read status from within the Saved section still works and is
     reflected in the matching category section.
