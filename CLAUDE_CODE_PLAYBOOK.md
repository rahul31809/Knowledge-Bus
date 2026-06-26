# Claude Code Productivity Playbook

> Captured from working sessions on the **Knowledge Bus** project (a personal
> AI-powered knowledge management app built with Next.js + Supabase + Gemini).
> This isn't about that specific app — it's the *working pattern* that made
> those sessions productive. Drop this file into your own project (e.g. as
> `CLAUDE.md` or paste it at the start of a session) so your Claude Code
> adopts the same habits.

---

## 1. Session Start: Always Check for Unfinished Work First

Before starting anything new, run:

```bash
git status --short
git log --oneline -10
```

**Why:** Across multiple sessions, real feature work (new pages, API routes,
database migrations, hundreds of lines) had been *built* but never
committed or pushed. The local project was way ahead of GitHub. The first
productive step in any session is closing that gap — don't let finished
work sit invisible on disk.

**Instruction to give Claude Code:**
> "Check git status. If there's uncommitted work, group it into logical
> features, verify it, and commit/push it before we start anything new."

---

## 2. Group Changes Into Cohesive, Feature-Sized Commits

Don't commit file-by-file or in one giant dump. Look at *what the changed
files do together* and split into logical units.

**Real example from this project** — one session had 11 changed/new files
touching nav, types, queries, a new page, two API routes, a scanner, and a
DB migration. All of it was **one feature** (a "Magazine Library"), so it
became **one commit**. A later session had a *different* set of changes
(dashboard redesign + new "Industries" module + new migration) — that was
a second, separate feature, so it became its own commit.

**Rule of thumb:** if reverting the commit would also force-revert an
unrelated feature, it's grouped wrong.

---

## 3. Commit Message Convention (Conventional Commits)

Match whatever prefix style already exists in `git log`. This project uses:

| Prefix | When |
|---|---|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `docs:` | README/docs-only changes |
| `refactor:` | Restructuring without behavior change |
| `revert:` | Rolling back a previous change |

**Format:**
```
feat: short imperative summary (≤ ~60 chars)

Optional body explaining WHAT was added and WHY it's grouped together —
written for a future reader skimming `git log`, not for the current task.
```

Example used here:
```
feat: add Magazine Library with Drive TOC scanning

Scans magazine PDFs from Drive, extracts table-of-contents via Gemini,
and categorizes articles into a fixed taxonomy for browsing on a new
/magazines page with read/unread tracking. Runs daily via Vercel cron.
```

---

## 4. Verify BEFORE Committing — Every Time

Run the project's lint and type-check before staging a commit:

```bash
npm run lint
npx tsc --noEmit
```

**Why:** Catches broken code before it reaches GitHub (and before a
deploy pipeline catches it for you). Both should run clean — silence is
the success signal. If either fails, fix it first; don't commit broken
code "to fix later."

If your project uses a different stack, substitute the equivalent
(`ruff`/`mypy`, `go vet`, `cargo check`, etc.) — the principle is the same.

---

## 5. Push Without Ceremony (Once Trust Is Established)

For a solo project on `main`, there's no value in PR ceremony with
yourself. Once you've told Claude Code "you don't need to ask before
routine git operations on my own repo," it should:

- `git add` the relevant files (specific paths, not `-A` blindly)
- `git commit` with a proper message
- `git push`

...without pausing for confirmation each time.

**Still pause and ask when:**
- The change is destructive or hard to reverse (force-push, history rewrite,
  dropping DB tables)
- The scope is an order-of-magnitude jump from what's been discussed
- It touches shared/external systems beyond "push to my own repo" (e.g.
  typing secrets into chat, modifying production data directly)

---

## 6. Maintain a Living `ROADMAP.md`

Capture the north-star vision **once**, in writing, then build off it
incrementally. The pattern that worked here:

- **Vision section** — what the end-state looks like (e.g. "4 primary
  dashboard sections")
- **Per-module breakdown** — what each section needs, written as a spec
  Claude Code can implement directly from
- **"Shipped" markers inline** — e.g. *"Auto-discovered (shipped
  2026-06-11): ..."* so the roadmap doubles as a changelog
- **Suggested build order** — ranked roughly by *increasing complexity /
  decreasing dependency on external integrations*, so whoever picks up
  the project next (human or AI) knows what to tackle next without
  re-deriving priorities

This turns "what should we build next?" into "open ROADMAP.md, take the
next unshipped item in the build order."

---

## 7. Make the README Look Like a Real Product

A `create-next-app` / framework-default README signals "unfinished
side project" even if the code behind it is solid. Once there's a real
feature set, rewrite it:

**Structure that worked:**
1. **One-line tagline** — what problem it solves, for whom
2. **Tech badges** (shields.io) — Next.js, TypeScript, DB, deploy target
3. **"What it does"** — 2-3 sentences, plain English
4. **Features** — bullet per feature, written as outcomes ("Scans X,
   extracts Y via AI, groups into Z"), not implementation details
5. **Tech stack table** — Layer | Choice, so a reader (including an
   interview panel) can scan it in 10 seconds
6. **Getting started** — copy-pasteable setup commands
7. **Roadmap link** — point to `ROADMAP.md` instead of duplicating it

---

## 8. Reference Architecture: "Web App + Database + AI + Automation"

If your project is a similar shape (a personal tool that ingests external
content, processes it with AI, and serves it through a dashboard), this
stack combination worked well and is well-supported by AI coding tools:

| Layer | Tool | Role |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript | Pages, dashboard, components |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent UI |
| Database | Supabase (Postgres) | Storage, with Row Level Security for access control |
| External data | Source-specific API (e.g. Google Drive API) | Pull in content that already exists, avoid manual entry |
| AI processing | Gemini (`@google/genai`) | Categorization, summarization, structured extraction — give it a *fixed taxonomy* in the prompt and validate its output against it |
| Automation | Vercel Cron | Scheduled jobs (e.g. "scan for new content daily at 7am") |
| Hosting/CI | Vercel + GitHub | Push to `main` → auto-deploy |

**Key pattern for AI features:** define a fixed, finite taxonomy/schema in
your types file first (e.g. `MAGAZINE_SECTIONS = [...] as const`), then
prompt the AI to classify *into that exact list*, and fall back to an
"Other" bucket for anything that doesn't validate. This keeps AI output
predictable and UI rendering simple.

---

## 9. Security Basics (Don't Skip)

- Secrets (API keys, DB credentials) live in environment variables
  (`.env.local`, Vercel project settings) — **never** in code, **never**
  pasted into chat. Keep a checked-in `.env.local.example` with placeholder
  values so setup is documented without leaking real keys.
- Use database-level Row Level Security policies, not just app-level checks.
- For admin-level database operations (running migrations, etc.), use the
  database's own console/SQL editor — don't pipe service-role keys through
  an AI session.

---

## 10. Collaboration Style That Worked

- **Headers + bullets, not prose** — scannable, especially for status
  updates and summaries.
- **Lead with what changed, then what's next** — short end-of-task summary,
  no padding.
- **Lay out options for big decisions, don't be prescriptive** — but for
  routine execution (commits, edits, running checks), just do it.
- **Flag what needs human action explicitly** — e.g. "this migration still
  needs to be run in the SQL editor" — don't assume it happened just
  because the code shipped.

---

## How to Bootstrap This With Your Claude Code

1. Save this file as `CLAUDE.md` (or similar) in your project root.
2. Start a session with:
   > "Read CLAUDE_CODE_PLAYBOOK.md / CLAUDE.md. Check git status for
   > uncommitted work, and if you find any, group it into logical commits
   > following the conventions there, verify with lint/typecheck, and
   > push. Then tell me what's next based on my roadmap (or help me write
   > one if I don't have one yet)."
3. From there, the loop is: **build a slice → verify → commit → push →
   update roadmap → repeat.**
