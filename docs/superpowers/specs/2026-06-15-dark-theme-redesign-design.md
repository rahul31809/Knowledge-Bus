# Dark-First Visual Redesign — Design

**Date:** 2026-06-15
**Status:** Approved, pending implementation plan

## Context

Knowledge Bus currently uses the default shadcn grayscale theme (oklch
chroma = 0 everywhere) with a few ad-hoc gradient accents (nav title,
dashboard cards). It reads as an unstyled template rather than a polished
app. Several secondary-text utility classes (`text-neutral-300/400`,
`text-gray-300/400`, ~21 files) have insufficient contrast against light
backgrounds (~2.5:1, below WCAG AA's 4.5:1) — the reported "light text not
visible against the background" issue.

## Scope

**In scope:** visual polish — color system, contrast fixes, theme toggle,
accent treatment — applied to existing pages/components without changing
navigation structure or information architecture.

**Out of scope:** the 4-section sidebar dashboard redesign described in
`ROADMAP.md`. That remains a separate, larger structural project to be
brainstormed on its own later.

## Color System

Dark becomes the **default** theme (the existing `.dark` block in
`src/app/globals.css`); light remains available via toggle (the existing
`:root` block). Both palettes share the same indigo-based accent and a
single muted-text token with WCAG-AA contrast.

| Token | Dark (default) | Light (toggle) |
|---|---|---|
| `--background` | `#0f1115` | `#f8fafc` |
| `--card` | `#1a1d24` | `#ffffff` |
| `--foreground` | `#f4f4f5` | `#0f172a` |
| `--muted-foreground` | `#a1a1aa` | `#64748b` |
| `--border` | `#2a2e37` | `#e2e8f0` |
| `--primary` / `--ring` | `#6366f1` | `#4f46e5` |

These replace the current oklch-grayscale values in `:root` and `.dark`.
`--primary-foreground` stays white in both themes. Other existing tokens
(`--card-foreground`, `--secondary`, `--sidebar-*`, etc.) derive from the
same base colors, adjusted for contrast as needed during implementation.

## Accent Strategy — Hybrid

- **Primary accent (indigo)** drives all interactive elements: buttons,
  links, focus rings, active nav states — consistent across the whole app.
- **Category colors** (currently blue/violet/emerald/amber/indigo per
  dashboard card) survive only as **subtle icon tints**:
  `bg-{color}-500/15` with `text-{color}-400` (dark) / `text-{color}-600`
  (light) for the icon glyph. No more full gradient badges.
- `dashboard-card.tsx`'s `ACCENT_CLASSES`/`ACCENT_HOVER_CLASSES` maps are
  reworked to this tint approach; hover state becomes a border/shadow shift
  using `--ring`/`--primary` rather than per-color hover shadows.

## Theme Toggle

- Wrap the body content in `src/app/layout.tsx` with `next-themes`'
  `ThemeProvider` (`attribute="class"`, `defaultTheme="dark"`,
  `enableSystem={false}`).
- Add a sun/moon toggle button (`lucide-react` `SunIcon`/`MoonIcon`) in
  `nav-header.tsx`, next to search/sign-out.
- No new CSS custom properties needed for toggle mechanics —
  `next-themes` toggles the `.dark` class, and `globals.css` already has
  `@custom-variant dark (&:is(.dark *))` wired to it.

## Rollout (phased)

Each phase is its own implementation plan, shipped independently.

1. **Phase 1 — Foundation** (next): `globals.css` tokens, `ThemeProvider` +
   toggle, `nav-header.tsx`, dashboard `page.tsx` (hero + card grid),
   `dashboard-card.tsx` accent rework.
2. **Phase 2 — Core content**: subjects/entries pages and their components
   (`session-card`, `subject-card`, `entry-card`, `entry-form`,
   `filter-bar`, `breadcrumbs`).
3. **Phase 3 — Industry primers**: the 10 components under
   `src/components/industry-primer/`.

## Implementation Note

Several Phase 1/2 files (`nav-header.tsx`, `(app)/page.tsx`,
`dashboard-card.tsx`, `entry-card.tsx`, `filter-bar.tsx`) currently have
uncommitted in-progress changes from other work. Phase 1 planning should
account for this — coordinate rather than overwrite.

## Verification

No automated tests apply to a visual theme change. Verification = running
the dev server and checking each touched page in both light and dark mode
before marking a phase complete.
