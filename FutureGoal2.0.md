# Future Goal 2.0 — Industry & Extra Learnings module (detailed spec)

Captured 2026-06-11. This is the detailed build spec for ROADMAP.md's
**"2. Industry & Extra Learnings module"** — refer back to this file by name
("FutureGoal2.0") whenever discussing this initiative.

## Goal

A unified hub combining industry knowledge + management/leadership reading,
auto-refreshed from Drive and external sources, with AI tagging, on-demand AI
summaries, and a periodic "best of" digest — all surfaced through global
search.

## Sources

### 1. Google Drive — two bifurcations

- **Industry-related** folder(s)
- **Management & Leadership** folder(s) (HBR, McKinsey, etc.)

Behaviour:
- Re-scan every **15 days** for new files.
- For magazines/PDFs: read the **table of contents only** (not the full
  body) and generate tags from it.
- Display: **hyperlink to the Drive file only** — do not render/store full
  contents.

### 2. Email newsletters

- The Ken, Financial Times, Mint
- Extract individual articles/links from each newsletter issue.

### 3. External sites

- finshots.in (initial) — extensible list for future additions.

## Features

### 15-day refresh + daily digest

- Every 15 days: re-scan Drive sources (source 1) for new files.
- From sources 2 + 3 (email + sites): surface a curated **"best 5
  articles/news of the day"** — a recommendation/digest, not just a feed.

### Tagging → global search

- All ingested items (Drive + email + web) get AI-generated tags.
- Tags must be searchable via the app's global search (ROADMAP.md "Global
  search" section).

### AI Summary button (sources 2 + 3 only)

- Per-article **"AI Summary"** button, **on-demand** (not pre-generated):
  click → fetch article → Gemini summary → display.
- Drive items (source 1) do **not** get this button — hyperlink + tags only.

## Open questions / decisions needed before build

- Exact Drive folder names for the two bifurcations (Industry vs. Management
  & Leadership).
- Email ingestion mechanism — Gmail API access, a dedicated forwarding
  address, or IMAP.
- finshots.in: RSS feed vs. scraping.
- FT/Mint paywalls may block full-article fetch for AI summaries — may need a
  fallback (summarize from newsletter excerpt instead of full article).
- New Supabase table(s) for external articles + tags — separate table or
  extend the `drive_file_tags` pattern.
- Scheduling for the 15-day cycle — Vercel Cron vs. other.

## Status

Not started. Captured as a reference spec only — no implementation yet.
