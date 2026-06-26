# Dark-First Theme — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a new indigo-accent color system that defaults to dark mode (with a light-mode toggle), and apply it to the app shell (root layout, nav header, app layout) and the dashboard (hero + cards), fixing the low-contrast secondary-text bug along the way.

**Architecture:** Replace the existing grayscale `:root`/`.dark` CSS variable values in `globals.css` with the new light/dark palettes (same variable names — no structural CSS changes). Wire up `next-themes` via a client-side `ThemeProvider` wrapper and add a toggle button. Rework `DashboardCard`'s per-category color maps from full gradient badges to subtle icon tints, and replace hardcoded `neutral-*` Tailwind classes in the nav/app shell with the semantic tokens (`bg-card`, `text-muted-foreground`, `bg-background`, etc.).

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, `next-themes` (already a dependency, not yet wired up), `lucide-react`.

**Spec:** `docs/superpowers/specs/2026-06-15-dark-theme-redesign-design.md`

---

### Task 1: Color tokens — new indigo-accent palette (dark + light)

**Files:**
- Modify: `src/app/globals.css:52-119` (the `:root` and `.dark` blocks)

- [ ] **Step 1: Replace the `:root` block (light palette) with the new tokens**

Replace lines 52-85 of `src/app/globals.css` (the existing `:root { ... }` block) with:

```css
:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #4f46e5;
  --primary-foreground: #ffffff;
  --secondary: #f1f5f9;
  --secondary-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #eef2ff;
  --accent-foreground: #4f46e5;
  --destructive: #dc2626;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #4f46e5;
  --chart-1: #4f46e5;
  --chart-2: #2563eb;
  --chart-3: #059669;
  --chart-4: #d97706;
  --chart-5: #7c3aed;
  --radius: 0.625rem;
  --sidebar: #ffffff;
  --sidebar-foreground: #0f172a;
  --sidebar-primary: #4f46e5;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #eef2ff;
  --sidebar-accent-foreground: #4f46e5;
  --sidebar-border: #e2e8f0;
  --sidebar-ring: #4f46e5;
}
```

- [ ] **Step 2: Replace the `.dark` block (dark palette, will become default) with the new tokens**

Replace lines 87-119 of `src/app/globals.css` (the existing `.dark { ... }` block) with:

```css
.dark {
  --background: #0f1115;
  --foreground: #f4f4f5;
  --card: #1a1d24;
  --card-foreground: #f4f4f5;
  --popover: #1a1d24;
  --popover-foreground: #f4f4f5;
  --primary: #6366f1;
  --primary-foreground: #ffffff;
  --secondary: #22252c;
  --secondary-foreground: #f4f4f5;
  --muted: #22252c;
  --muted-foreground: #a1a1aa;
  --accent: #22252c;
  --accent-foreground: #f4f4f5;
  --destructive: #f87171;
  --border: #2a2e37;
  --input: #2a2e37;
  --ring: #6366f1;
  --chart-1: #6366f1;
  --chart-2: #3b82f6;
  --chart-3: #10b981;
  --chart-4: #f59e0b;
  --chart-5: #8b5cf6;
  --sidebar: #1a1d24;
  --sidebar-foreground: #f4f4f5;
  --sidebar-primary: #6366f1;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #22252c;
  --sidebar-accent-foreground: #f4f4f5;
  --sidebar-border: #2a2e37;
  --sidebar-ring: #6366f1;
}
```

Do not change anything outside these two blocks (the `@theme inline` mapping above and the `@layer base` rules below stay as-is — they reference these same variable names).

- [ ] **Step 3: Start the dev server and verify the light palette**

Run (background, it stays up for the rest of this plan):

```bash
npm run dev
```

Open the app in the browser (log in if prompted) and confirm — since `.dark` isn't wired up yet, every page renders with the new **light** palette:
- Page background is an off-white slate (`#f8fafc`), not pure white
- Default/primary buttons and links are indigo (`#4f46e5`), not black/gray
- Secondary/muted text (e.g., the "Created by Rahul Agarwal..." line in the nav) is a clearly-readable slate gray, not faint light gray

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): introduce indigo-accent color tokens for dark-default palette"
```

---

### Task 2: Theme infrastructure — provider, toggle, app shell

**Files:**
- Create: `src/components/theme-provider.tsx`
- Create: `src/components/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/nav-header.tsx`
- Modify: `src/app/(app)/layout.tsx:11`

- [ ] **Step 1: Create the ThemeProvider client wrapper**

Create `src/components/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Create the theme toggle button**

Create `src/components/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="sm" className="size-9" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="size-9"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
```

- [ ] **Step 3: Wrap the root layout with ThemeProvider**

Replace the full contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knowledge Base",
  description: "Rahul's searchable knowledge base of study notes, briefings and scans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

(`suppressHydrationWarning` on `<html>` is required by `next-themes` since it sets the `class` attribute on the client before hydration.)

- [ ] **Step 4: Verify dark mode is now the default**

Refresh the browser (clear `localStorage` if you tested theme toggling before this step — `next-themes` may have stored a preference). Confirm the page now renders with the **dark** palette: background `#0f1115`, light text, indigo accents.

- [ ] **Step 5: Update the nav header — fix contrast, add toggle**

Replace the full contents of `src/components/nav-header.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/app/login/actions";

export function NavHeader({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex flex-col leading-tight">
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 bg-clip-text text-2xl font-bold text-transparent">
              Knowledge Base
            </span>
            <span className="text-sm text-muted-foreground">Created by Rahul Agarwal (MBA, SPJIMR)</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              type="search"
              placeholder="Search your notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-48 sm:w-64"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" title={userEmail ?? undefined}>
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Fix the app layout background**

In `src/app/(app)/layout.tsx`, line 11, change:

```tsx
    <div className="flex min-h-screen flex-col bg-neutral-50">
```

to:

```tsx
    <div className="flex min-h-screen flex-col bg-background">
```

- [ ] **Step 7: Verify the app shell**

Refresh the browser. Confirm:
- Nav header background is a subtle shade lighter than the page background (card vs. background tokens)
- The "Created by Rahul Agarwal..." subtitle is clearly readable
- A sun/moon toggle button appears next to "Sign out"
- Clicking the toggle switches the whole app between dark and light palettes, and the choice persists across a page refresh

- [ ] **Step 8: Commit**

```bash
git add src/components/theme-provider.tsx src/components/theme-toggle.tsx src/app/layout.tsx src/components/nav-header.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(theme): wire up next-themes provider/toggle and update app shell"
```

---

### Task 3: Dashboard card accents — hybrid tint system

**Files:**
- Modify: `src/components/dashboard-card.tsx`

- [ ] **Step 1: Rework the accent system**

Replace the full contents of `src/components/dashboard-card.tsx` with:

```tsx
import Link from "next/link";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_CLASSES = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
} as const;

interface DashboardCardProps {
  href: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENT_CLASSES;
  title: string;
  description: string;
  meta?: string;
}

export function DashboardCard({ href, icon: Icon, accent, title, description, meta }: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
            ACCENT_CLASSES[accent]
          )}
        >
          <Icon className="size-5" />
        </div>
        <ArrowRightIcon className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {meta ? <span className="text-xs font-medium text-muted-foreground">{meta}</span> : null}
    </Link>
  );
}
```

This removes the old `ACCENT_HOVER_CLASSES` map entirely — hover feedback is now a single `border-primary/40` + shadow lift shared by every card, regardless of category.

- [ ] **Step 2: Full Phase 1 verification (dashboard, both themes)**

Refresh the homepage (`/`). In **dark** mode, confirm:
- The 5 dashboard cards (Subjects, Articles, Current News, Reading & Briefings, Industries) show colored icon-tint badges (blue/violet/emerald/amber/indigo) on the dark card surface — no gradient blocks
- Card titles and descriptions are clearly readable
- Hovering a card lifts it slightly and shows an indigo-tinted border
- The hero banner (gradient indigo/blue/violet, "Your Knowledge Base") still looks correct against the dark page background

Click the theme toggle to switch to **light** mode and repeat the same checks — cards should show the same icon tints on white card surfaces, text readable, hero unchanged.

If anything looks wrong, fix it inline before committing (no need to re-run the full plan).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard-card.tsx
git commit -m "feat(theme): rework dashboard card accents to hybrid icon-tint system"
```

---

## Self-Review Notes

- **Spec coverage**: Color tokens (Section "Color System") → Task 1. Theme toggle (Section "Theme Toggle") → Task 2. Accent strategy (Section "Accent Strategy — Hybrid") → Task 3. Rollout Phase 1 file list (`globals.css`, `layout.tsx`, `nav-header.tsx`, `(app)/page.tsx`, `dashboard-card.tsx`) → all covered; `(app)/page.tsx` required no code changes (hero is a self-contained gradient block, verified visually in Task 3 Step 2).
- **Placeholder scan**: no TBD/TODOs; all code blocks are complete, copy-pasteable files or exact line replacements.
- **Type consistency**: `ACCENT_CLASSES` keys (`blue/violet/emerald/amber/indigo`) match the `accent` values passed from `src/app/(app)/page.tsx` (unchanged from current usage).
