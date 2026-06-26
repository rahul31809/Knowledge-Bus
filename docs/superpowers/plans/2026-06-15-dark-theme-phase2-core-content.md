# Dark-First Theme — Phase 2 (Core Content) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the subjects/entries pages and their shared components from hardcoded `neutral-*`/`bg-white`/`blue-*` Tailwind classes to the semantic color tokens established in Phase 1 (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`/`text-primary`, `text-destructive`), fixing the dark-mode contrast bug on the subject detail page and giving the rest of the core content area consistent light/dark theming.

**Architecture:** No new tokens or components. Apply the exact mapping patterns from Phase 1's `dashboard-card.tsx` (e.g. `text-muted-foreground/50 ... group-hover:text-muted-foreground` for fade-in arrow icons) across all Phase 2 files. Blue accent classes (tag chips, active filter pills, links) migrate to the indigo `primary` token per the spec's Hybrid Accent Strategy ("Primary accent (indigo) drives all interactive elements... consistent across the whole app"). Red error text becomes `text-destructive`. The Tailwind Typography `prose-neutral` block on the entry detail page gets `dark:prose-invert` so rendered note content stays legible in dark mode.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, `lucide-react`. Builds on Phase 1's `globals.css` token system (already merged to `main`).

**Spec:** `docs/superpowers/specs/2026-06-15-dark-theme-redesign-design.md`

---

### Task 1: List-item cards — `breadcrumbs`, `session-card`, `subject-card`

**Files:**
- Modify: `src/components/breadcrumbs.tsx` (full file, 27 lines)
- Modify: `src/components/session-card.tsx` (full file, 25 lines)
- Modify: `src/components/subject-card.tsx` (full file, 29 lines)

These three components share the same pattern: muted nav/meta text, a foreground heading, a card surface with a hover border, and a fade-in `ArrowRightIcon`/`ChevronRightIcon`.

- [ ] **Step 1: Replace `breadcrumbs.tsx`**

Replace the full contents of `src/components/breadcrumbs.tsx` with:

```tsx
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 ? <ChevronRightIcon className="size-3.5 text-muted-foreground/50" /> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Replace `session-card.tsx`**

Replace the full contents of `src/components/session-card.tsx` with:

```tsx
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { SessionSummary } from "@/lib/queries";
import { formatEntryDate } from "@/lib/types";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function SessionCard({ subject, session }: { subject: string; session: SessionSummary }) {
  return (
    <Link
      href={`/subjects/${encodeURIComponent(subject)}/${encodeURIComponent(session.session_label)}`}
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground group-hover:underline">{session.session_label}</h3>
        <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{plural(session.entryCount, "note")}</p>
      <p className="text-xs text-muted-foreground">Last updated {formatEntryDate(session.latestDate)}</p>
    </Link>
  );
}
```

- [ ] **Step 3: Replace `subject-card.tsx`**

Replace the full contents of `src/components/subject-card.tsx` with:

```tsx
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { SubjectSummary } from "@/lib/queries";
import { formatEntryDate } from "@/lib/types";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function SubjectCard({ subject }: { subject: SubjectSummary }) {
  return (
    <Link
      href={`/subjects/${encodeURIComponent(subject.subject)}`}
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground group-hover:underline">{subject.subject}</h3>
        <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        {plural(subject.sessionCount, "session")} · {plural(subject.entryCount, "note")}
      </p>
      <p className="text-xs text-muted-foreground">
        {subject.latestDate ? `Last updated ${formatEntryDate(subject.latestDate)}` : "No synced notes yet"}
      </p>
    </Link>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add src/components/breadcrumbs.tsx src/components/session-card.tsx src/components/subject-card.tsx
git commit -m "feat(theme): migrate breadcrumbs, session-card, subject-card to semantic tokens"
```

---

### Task 2: Entry list — `entry-card`, `filter-bar`

**Files:**
- Modify: `src/components/entry-card.tsx` (full file, 58 lines)
- Modify: `src/components/filter-bar.tsx` (full file, 69 lines)

Both files use blue-accented tag chips/pills that migrate to the indigo `primary` token per the spec's Hybrid Accent Strategy.

- [ ] **Step 1: Replace `entry-card.tsx`**

Replace the full contents of `src/components/entry-card.tsx` with:

```tsx
import Link from "next/link";
import { FolderSyncIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { entryTypeLabel, formatEntryDate, type KnowledgeEntry } from "@/lib/types";

const TYPE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  study_notes: "default",
  industry_briefing: "secondary",
  energy_scan: "secondary",
  ppt_notes: "outline",
  other: "outline",
};

export function EntryCard({ entry }: { entry: KnowledgeEntry }) {
  const snippet = entry.summary || entry.body_text.slice(0, 220);

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <Link href={`/entries/${entry.id}`} className="block">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={TYPE_BADGE_VARIANT[entry.entry_type] ?? "outline"}>{entryTypeLabel(entry.entry_type)}</Badge>
          <span className="text-xs text-muted-foreground">{formatEntryDate(entry.entry_date)}</span>
          {entry.source_routine ? (
            <span className="text-xs text-muted-foreground">· {entry.source_routine}</span>
          ) : null}
          {entry.drive_file_id ? (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
              title="Synced from Google Drive"
            >
              <FolderSyncIcon className="size-3.5" /> Synced
            </span>
          ) : null}
        </div>

        <h2 className="mt-2 text-lg font-semibold text-foreground hover:underline">{entry.title}</h2>

        {snippet ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{snippet}</p> : null}
      </Link>

      {entry.subject_tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.subject_tags.map((tag) => (
            <Link key={tag} href={`/readings?tag=${encodeURIComponent(tag)}`}>
              <Badge
                variant="ghost"
                className="border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Replace `filter-bar.tsx`**

Replace the full contents of `src/components/filter-bar.tsx` with:

```tsx
import Link from "next/link";
import { ENTRY_TYPES, type EntryType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeType?: string;
  activeTag?: string;
  query?: string;
  types?: readonly { value: EntryType; label: string }[];
}

function buildHref(params: { q?: string; type?: string; tag?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.type) sp.set("type", params.type);
  if (params.tag) sp.set("tag", params.tag);
  const qs = sp.toString();
  return qs ? `/readings?${qs}` : "/readings";
}

function pillClasses(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-muted-foreground hover:border-primary/40"
  );
}

export function FilterBar({ activeType, activeTag, query, types = ENTRY_TYPES }: FilterBarProps) {
  const hasFilters = Boolean(activeType || activeTag);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={buildHref({ q: query, tag: activeTag })} className={pillClasses(!activeType)}>
        All types
      </Link>
      {types.map((t) => (
        <Link
          key={t.value}
          href={buildHref({ q: query, type: activeType === t.value ? undefined : t.value, tag: activeTag })}
          className={pillClasses(activeType === t.value)}
        >
          {t.label}
        </Link>
      ))}

      {activeTag ? (
        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Tag: {activeTag}
          <Link
            href={buildHref({ q: query, type: activeType })}
            className="text-primary/60 hover:text-primary"
            aria-label="Clear tag filter"
          >
            ×
          </Link>
        </span>
      ) : null}

      {hasFilters ? (
        <Link href={buildHref({ q: query })} className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/entry-card.tsx src/components/filter-bar.tsx
git commit -m "feat(theme): migrate entry-card and filter-bar to semantic tokens, blue accents to primary"
```

---

### Task 3: Drive files tree and forms — `subject-drive-files`, `subject-profile-form`, `entry-form`

**Files:**
- Modify: `src/components/subject-drive-files.tsx` (full file, 126 lines)
- Modify: `src/components/subject-profile-form.tsx:33,45,58,71,82-86` (helper text + error message)
- Modify: `src/components/entry-form.tsx:125-127,154-156,168-172` (helper text + error message)

- [ ] **Step 1: Replace `subject-drive-files.tsx`**

Replace the full contents of `src/components/subject-drive-files.tsx` with:

```tsx
import { ChevronRightIcon, ExternalLinkIcon, FileTextIcon, FolderIcon } from "lucide-react";
import type { DriveFileEntry, DriveFileGroup } from "@/lib/drive-sync/client";

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {tag}
    </span>
  );
}

function FileLink({
  file,
  tags,
}: {
  file: DriveFileEntry;
  tags: string[];
}) {
  return (
    <a
      href={file.webViewLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1 rounded-md px-2 py-2 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm text-muted-foreground group-hover:text-foreground group-hover:underline">
          {file.name}
        </span>
        <ExternalLinkIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-6">
          {tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      )}
    </a>
  );
}

interface FolderNode {
  name: string;
  files: DriveFileEntry[];
  children: Map<string, FolderNode>;
}

function buildTree(groups: DriveFileGroup[]): FolderNode {
  const root: FolderNode = { name: "", files: [], children: new Map() };

  for (const group of groups) {
    if (!group.folderName) {
      root.files.push(...group.files);
      continue;
    }

    let node = root;
    for (const segment of group.folderName.split("/")) {
      let child = node.children.get(segment);
      if (!child) {
        child = { name: segment, files: [], children: new Map() };
        node.children.set(segment, child);
      }
      node = child;
    }
    node.files.push(...group.files);
  }

  return root;
}

function FolderSection({
  node,
  tagMap,
}: {
  node: FolderNode;
  tagMap: Map<string, string[]>;
}) {
  return (
    <details open className="group/folder">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/folder:rotate-90" />
        <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
        {node.name}
      </summary>
      <div className="flex flex-col gap-1 border-l border-border pl-4 ml-3.5">
        {node.files.map((file) => (
          <FileLink key={file.id} file={file} tags={tagMap.get(file.id) ?? []} />
        ))}
        {[...node.children.values()].map((child) => (
          <FolderSection key={child.name} node={child} tagMap={tagMap} />
        ))}
      </div>
    </details>
  );
}

export function SubjectDriveFiles({
  groups,
  tagMap,
}: {
  groups: DriveFileGroup[] | null;
  tagMap: Map<string, string[]>;
}) {
  if (!groups || groups.every((g) => g.files.length === 0)) return null;

  const tree = buildTree(groups);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="px-2 text-sm font-semibold text-foreground">Files in Drive</h2>
      <p className="px-2 pb-2 text-xs text-muted-foreground">Opens in Google Drive. Tags generated by AI.</p>
      <div className="flex flex-col gap-1">
        {tree.files.map((file) => (
          <FileLink key={file.id} file={file} tags={tagMap.get(file.id) ?? []} />
        ))}
        {[...tree.children.values()].map((child) => (
          <FolderSection key={child.name} node={child} tagMap={tagMap} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Fix the four helper lines in `subject-profile-form.tsx`**

In `src/components/subject-profile-form.tsx`, change each of these four lines from `text-xs text-neutral-500` to `text-xs text-muted-foreground`:

Replace:
```tsx
        <Label htmlFor="overview">Overview</Label>
        <p className="text-xs text-neutral-500">What this course is about and why it matters — a few lines.</p>
```
with:
```tsx
        <Label htmlFor="overview">Overview</Label>
        <p className="text-xs text-muted-foreground">What this course is about and why it matters — a few lines.</p>
```

Replace:
```tsx
        <Label htmlFor="course_outline">Course outline</Label>
        <p className="text-xs text-neutral-500">Topics, structure, evaluation — paste from the syllabus or summarize.</p>
```
with:
```tsx
        <Label htmlFor="course_outline">Course outline</Label>
        <p className="text-xs text-muted-foreground">Topics, structure, evaluation — paste from the syllabus or summarize.</p>
```

Replace:
```tsx
        <Label htmlFor="frameworks">Important frameworks</Label>
        <p className="text-xs text-neutral-500">The recurring models worth knowing cold for exams and interviews.</p>
```
with:
```tsx
        <Label htmlFor="frameworks">Important frameworks</Label>
        <p className="text-xs text-muted-foreground">The recurring models worth knowing cold for exams and interviews.</p>
```

Replace:
```tsx
        <Label htmlFor="revision_highlights">Revision highlights</Label>
        <p className="text-xs text-neutral-500">The points you&apos;d want surfaced the night before an exam or interview.</p>
```
with:
```tsx
        <Label htmlFor="revision_highlights">Revision highlights</Label>
        <p className="text-xs text-muted-foreground">The points you&apos;d want surfaced the night before an exam or interview.</p>
```

- [ ] **Step 3: Fix the error message in `subject-profile-form.tsx`**

Replace:
```tsx
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
```
with:
```tsx
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
```

- [ ] **Step 4: Fix the two helper lines and error message in `entry-form.tsx`**

Replace:
```tsx
          <p className="text-xs text-neutral-500 sm:col-span-2">
            Leave blank to file under &quot;{`Unsorted`}&quot; — you can fill these in later from the edit page.
          </p>
```
with:
```tsx
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Leave blank to file under &quot;{`Unsorted`}&quot; — you can fill these in later from the edit page.
          </p>
```

Replace:
```tsx
        <Label htmlFor="body_html">Content</Label>
        <p className="text-xs text-neutral-500">
          Paste directly from your Gmail draft (formatting is preserved and sanitized) or plain text.
        </p>
```
with:
```tsx
        <Label htmlFor="body_html">Content</Label>
        <p className="text-xs text-muted-foreground">
          Paste directly from your Gmail draft (formatting is preserved and sanitized) or plain text.
        </p>
```

Replace:
```tsx
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
```
with:
```tsx
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/components/subject-drive-files.tsx src/components/subject-profile-form.tsx src/components/entry-form.tsx
git commit -m "feat(theme): migrate drive-files tree and form helper/error text to semantic tokens"
```

---

### Task 4: Subjects pages — list, detail, session

**Files:**
- Modify: `src/app/(app)/subjects/page.tsx` (full file, 108 lines)
- Modify: `src/app/(app)/subjects/[subject]/page.tsx` (full file, 105 lines) — the page from the user's dark-mode screenshot bug
- Modify: `src/app/(app)/subjects/[subject]/[session]/page.tsx:36-37` (heading + subtitle)

- [ ] **Step 1: Replace `subjects/page.tsx`**

Replace the full contents of `src/app/(app)/subjects/page.tsx` with:

```tsx
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubjectCard } from "@/components/subject-card";
import { fetchDriveSubjectsByCategory } from "@/lib/drive-sync/client";
import { fetchSubjects, withDriveOnlySubjects } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const { term } = await searchParams;
  const supabase = await createClient();

  const [subjects, categories] = await Promise.all([fetchSubjects(supabase), fetchDriveSubjectsByCategory()]);

  if (categories === null) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "MBA Study Materials" }]} />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">MBA Study Materials</h1>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Drive isn&apos;t configured, so term folders can&apos;t be loaded right now.
        </div>
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.category === term);

  if (activeCategory) {
    const termSubjectNames = new Set(activeCategory.subjects.map((s) => s.name));
    const termSubjects = withDriveOnlySubjects(subjects, activeCategory.subjects.map((s) => s.name)).filter((s) =>
      termSubjectNames.has(s.subject)
    );

    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "MBA Study Materials", href: "/subjects" },
            { label: activeCategory.category },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{activeCategory.category}</h1>
          <p className="text-sm text-muted-foreground">{plural(termSubjects.length, "subject")}</p>
        </div>

        {termSubjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No subjects yet in this term.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {termSubjects.map((subject) => (
              <SubjectCard key={subject.subject} subject={subject} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "MBA Study Materials" }]} />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">MBA Study Materials</h1>
        <p className="text-sm text-muted-foreground">Course materials organized by term</p>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No term folders found in Drive yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <Link
              key={category.category}
              href={`/subjects?term=${encodeURIComponent(category.category)}`}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground group-hover:underline">{category.category}</h3>
                <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {category.subjects.length > 0 ? plural(category.subjects.length, "subject") : "Coming soon"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `subjects/[subject]/page.tsx`**

Replace the full contents of `src/app/(app)/subjects/[subject]/page.tsx` with:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SessionCard } from "@/components/session-card";
import { SubjectDriveFiles } from "@/components/subject-drive-files";
import { buttonVariants } from "@/components/ui/button";
import { fetchSubjectDriveResources, type SubjectDriveLookup } from "@/lib/drive-sync/client";
import { fetchDriveFileTagsForSubject, fetchSessions, fetchSubjectProfile } from "@/lib/queries";
import { UNSORTED_LABEL, type SubjectProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

const PROFILE_SECTIONS: { key: keyof SubjectProfile; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "course_outline", title: "Course outline" },
  { key: "frameworks", title: "Important frameworks" },
  { key: "revision_highlights", title: "Revision highlights" },
];

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectParam } = await params;
  const subject = decodeURIComponent(subjectParam);

  const supabase = await createClient();
  const [sessions, profile, drive, driveTags] = await Promise.all([
    fetchSessions(supabase, subject).catch(() => [] as Awaited<ReturnType<typeof fetchSessions>>),
    fetchSubjectProfile(supabase, subject).catch(() => null),
    fetchSubjectDriveResources(subject).catch(
      (): SubjectDriveLookup => ({ status: "unavailable" })
    ),
    fetchDriveFileTagsForSubject(supabase, subject).catch(() => [] as Awaited<ReturnType<typeof fetchDriveFileTagsForSubject>>),
  ]);

  // A subject is real if it has synced notes OR a matching Drive folder.
  // "unavailable" (Drive unreachable/unconfigured) never triggers a 404 on
  // its own — that would 404 real subjects whenever Drive has a hiccup.
  if (sessions.length === 0 && drive.status !== "found") notFound();

  const driveFiles = drive.status === "found" ? drive.files : null;
  const tagMap = new Map(driveTags.map((t) => [t.file_id, t.tags]));

  const sections = PROFILE_SECTIONS.map((section) => ({ ...section, value: profile?.[section.key] as string | null }))
    .filter((section) => section.value);

  const canEditInfo = subject !== UNSORTED_LABEL;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: subject }]} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{subject}</h1>
          <p className="text-sm text-muted-foreground">{plural(sessions.length, "session")}</p>
        </div>
        {canEditInfo ? (
          <Link
            href={`/subjects/${encodeURIComponent(subject)}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <PencilIcon className="size-3.5" />
            {profile ? "Edit info" : "Add subject info"}
          </Link>
        ) : null}
      </div>

      {sections.length > 0 ? (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section.key} className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{section.value}</p>
            </div>
          ))}
        </div>
      ) : canEditInfo ? (
        <Link
          href={`/subjects/${encodeURIComponent(subject)}/edit`}
          className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          No course overview, outline, frameworks, or revision highlights yet — add subject info.
        </Link>
      ) : null}

      {canEditInfo ? <SubjectDriveFiles groups={driveFiles} tagMap={tagMap} /> : null}

      {sessions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.session_label} subject={subject} session={session} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No synced session notes for this subject yet — they&apos;ll show up here once added.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Fix the heading and subtitle in `subjects/[subject]/[session]/page.tsx`**

Replace:
```tsx
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{session}</h1>
        <p className="text-sm text-neutral-500">{plural(entries.length, "note")}</p>
      </div>
```
with:
```tsx
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{session}</h1>
        <p className="text-sm text-muted-foreground">{plural(entries.length, "note")}</p>
      </div>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/subjects/page.tsx" "src/app/(app)/subjects/[subject]/page.tsx" "src/app/(app)/subjects/[subject]/[session]/page.tsx"
git commit -m "feat(theme): migrate subjects list/detail/session pages to semantic tokens"
```

---

### Task 5: Entry detail page + full Phase 2 verification

**Files:**
- Modify: `src/app/(app)/entries/[id]/page.tsx:32,44-47,50,52,54-67,70-73`

- [ ] **Step 1: Fix the back link**

Replace:
```tsx
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
```
with:
```tsx
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
```

- [ ] **Step 2: Fix the meta row (date + source routine)**

Replace:
```tsx
          <span className="text-sm text-neutral-500">{formatEntryDate(entry.entry_date)}</span>
          {entry.source_routine ? (
            <span className="text-sm text-neutral-400">· {entry.source_routine}</span>
          ) : null}
```
with:
```tsx
          <span className="text-sm text-muted-foreground">{formatEntryDate(entry.entry_date)}</span>
          {entry.source_routine ? (
            <span className="text-sm text-muted-foreground">· {entry.source_routine}</span>
          ) : null}
```

- [ ] **Step 3: Fix the heading and summary**

Replace:
```tsx
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">{entry.title}</h1>

        {entry.summary ? <p className="text-base text-neutral-600">{entry.summary}</p> : null}
```
with:
```tsx
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{entry.title}</h1>

        {entry.summary ? <p className="text-base text-muted-foreground">{entry.summary}</p> : null}
```

- [ ] **Step 4: Fix the tag badges**

Replace:
```tsx
        {entry.subject_tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entry.subject_tags.map((tag) => (
              <Link key={tag} href={`/readings?tag=${encodeURIComponent(tag)}`}>
                <Badge
                  variant="ghost"
                  className="border border-neutral-200 text-neutral-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}
```
with:
```tsx
        {entry.subject_tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entry.subject_tags.map((tag) => (
              <Link key={tag} href={`/readings?tag=${encodeURIComponent(tag)}`}>
                <Badge
                  variant="ghost"
                  className="border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}
```

- [ ] **Step 5: Fix the prose content block (add `dark:prose-invert`)**

Replace:
```tsx
      <div
        className="prose prose-neutral max-w-none rounded-lg border border-neutral-200 bg-white p-6 prose-headings:font-semibold prose-a:text-blue-600"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
```
with:
```tsx
      <div
        className="prose prose-neutral dark:prose-invert max-w-none rounded-lg border border-border bg-card p-6 prose-headings:font-semibold prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/entries/[id]/page.tsx"
git commit -m "feat(theme): migrate entry detail page to semantic tokens, add dark:prose-invert"
```

- [ ] **Step 8: Full Phase 2 verification (dev server, both themes)**

Run (background, if not already running):

```bash
npm run dev
```

In **dark** mode, visit and confirm each page is legible with no leftover light-on-light or dark-on-dark text, and hover states show an indigo-tinted border:

- `/subjects` — term list (and a term's subject grid via `?term=<name>`)
- `/subjects/<subject>` — the page from the original bug report: heading, profile sections (or the "Add subject info" dashed empty state), Drive files tree (folders, files, tag chips), and session cards all readable on the dark background
- `/subjects/<subject>/<session>` — heading, subtitle, entry cards
- `/entries/<id>` — back link, meta row, title, summary, tag badges, and the rendered note content inside the prose block (headings, links, lists all legible)
- `/readings` (or wherever `FilterBar` renders) — inactive pills, the active pill (indigo fill), and an active tag pill with its `×` clear control

Click the theme toggle to switch to **light** mode and spot-check the same pages — cards/pills/tags should render with light surfaces and indigo accents, no contrast regressions.

If anything looks wrong, fix it inline before considering Phase 2 complete (no need to re-run the full plan).

---

## Self-Review Notes

- **Spec coverage**: Phase 2 file list from the spec's Rollout section (`session-card`, `subject-card`, `entry-card`, `entry-form`, `filter-bar`, `breadcrumbs`) → Tasks 1–3. The subjects/entries *pages* that consume these components (`subjects/page.tsx`, `subjects/[subject]/page.tsx`, `subjects/[subject]/[session]/page.tsx`, `entries/[id]/page.tsx`) → Tasks 4–5, including the originally-reported dark-mode bug on `subjects/[subject]/page.tsx`. Hybrid Accent Strategy (blue → primary/indigo for all interactive tag/pill elements) → Tasks 2 and 5. `subject-profile-form.tsx` and `subject-drive-files.tsx` (referenced from `subjects/[subject]/page.tsx`) → Task 3. Pages confirmed to need no changes (`subjects/[subject]/edit/page.tsx`, `entries/new/page.tsx`, `entries/[id]/edit/page.tsx`, `entry-actions.tsx`, `ui/card.tsx`, `ui/badge.tsx`) are intentionally excluded — they already use theme-aware tokens or shadcn primitives.
- **Placeholder scan**: no TBD/TODOs; every step is either a full-file replacement or an exact before/after snippet with complete code.
- **Type consistency**: no new types, props, or function signatures introduced — all changes are `className` string edits. Component prop interfaces (`SessionSummary`, `SubjectSummary`, `KnowledgeEntry`, `DriveFileEntry`/`DriveFileGroup`, `EntryFormState`, `SubjectProfileFormState`) are unchanged from current usage.
