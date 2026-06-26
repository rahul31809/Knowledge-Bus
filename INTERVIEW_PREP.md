# Knowledge Bus — Interview Prep Study Guide

A complete study pack for explaining this project to a consulting panel.
Read top to bottom once, then use the **Mock Q&A Bank** and **Demo Script**
for active practice.

---

## Part 1 — Quick-Reference Cheat Sheet

Memorize these one-liners — they're your anchors if you go blank.

| If asked... | Say... |
|---|---|
| "What is it?" | A personal AI-powered knowledge management platform for MBA coursework and placement prep |
| "What problem does it solve?" | Information overload — too much course material, too many newsletters/magazines, no system to prioritize or retain it |
| "Did you code it?" | Directed an AI coding agent end-to-end — same as directing an engineering team: I owned requirements, architecture, prioritization, and testing |
| "What's it built with?" | Next.js (website) + Supabase (database) + Google Drive API (content sync) + Gemini AI (reading/categorizing/summarizing) + Vercel (hosting + automation) |
| "What does it actually do?" | 5 modules: Subjects, Magazine Library, Industry Primers, Notes/Entries, Search — plus a News feed in progress |
| "What's the so-what for us?" | It's a live demo of AI-enabled productivity: scope a problem → structure a solution → direct AI to ship it. That's the digital-transformation motion, at personal scale |

---

## Part 2 — Glossary (Plain English, No Jargon Left Behind)

If a panelist uses any of these words, you'll know exactly what they mean
and how it shows up in *your* app.

| Term | Plain-English meaning | Where it's used in Knowledge Bus |
|---|---|---|
| **Frontend** | The part of the app you see and click | The dashboard, Subjects page, Magazines page, etc. |
| **Backend** | The part that runs behind the scenes — fetching data, talking to the database/AI | Code that loads your subjects, scans Drive, calls Gemini |
| **Framework (Next.js)** | A pre-built toolkit for building websites, so you don't start from scratch | The whole app is built on it |
| **React** | The system Next.js uses to build interactive page elements ("components") | Every button, card, sidebar |
| **TypeScript** | JavaScript with built-in spell-check for code — flags mistakes before the app runs | Used everywhere; `tsc --noEmit` is the "spell-check" command |
| **Component** | A reusable building block of the UI (like a Lego piece) | e.g. `magazine-library.tsx`, `industry-sidebar.tsx` |
| **Database** | Organized storage for all your data — like a powerful, rule-enforcing spreadsheet | Supabase (built on Postgres) |
| **Postgres** | The actual database engine Supabase runs on | Stores magazine articles, industry primers, notes |
| **API / API route** | A defined "request → response" doorway between the frontend and backend/data | e.g. `/api/scan-magazines` |
| **Migration** | A script that changes the database's structure (adds tables/columns) | `0009_magazine_toc.sql`, `0010_industry_primers.sql` |
| **Row Level Security (RLS)** | Database-enforced rule for *who* can read/write *which* rows | Ensures only you can see your own data |
| **Environment variable / secret** | A password or API key stored outside the code, so it's never exposed publicly | Supabase keys, Gemini API key |
| **Google Drive API** | Lets the app read files directly from your Drive folders | Pulls course files and magazine PDFs automatically |
| **LLM / AI model (Gemini)** | An AI that reads text and produces text — summaries, categories, structured answers | Extracts TOCs, writes industry primers |
| **Prompt** | The instruction you send to the AI describing what you want back | "Sort these articles into these 7 categories..." |
| **Taxonomy** | A fixed, agreed-upon list of categories | The 7 magazine sections; the 10-section primer structure |
| **Cron job** | A task that runs automatically on a schedule (no button-press needed) | Daily 7am scan for new magazines |
| **Git** | A system that records every change made to the code over time | Tracks history of the whole project |
| **Commit** | One saved "checkpoint" of changes, with a message describing it | e.g. *"feat: add Magazine Library..."* |
| **Repository (repo) / GitHub** | The online home for the code + its full history | `github.com/rahul31809/Knowledge-Bus` |
| **Push** | Sending your local changes up to GitHub | Done after every feature is committed |
| **Lint / Type-check** | Automated checks that catch errors/style issues before committing | `npm run lint`, `npx tsc --noEmit` |
| **Deploy** | Making the latest code live on the internet | Vercel auto-deploys every push to `main` |
| **Cache (cached primer)** | Storing a result so it's computed once and reused, not regenerated every time | Industry primers are generated once, saved, then reused |

---

## Part 3 — Feature Deep-Dives

For each feature: **the problem it solves → how it works, step by step →
tech involved → the one-line "so what."**

### 3.1 Subjects Module

- **Problem:** Course materials live scattered across many Drive folders —
  hard to find pre-reads, PPTs, and notes for a specific session.
- **How it works:**
  1. The app looks at a root "Subjects" folder in Drive.
  2. It auto-discovers subject folders — including recognizing special
     "category" folders (e.g. "PGPM Foundation") and going one level
     deeper into those for individual courses.
  3. Each subject's files are rendered as a **collapsible folder tree**
     (Pre-Reads → Session 1&2, etc.) instead of one flat messy list.
  4. Sessions show topic, linked files, notes, and key learnings.
- **Tech:** Next.js pages + Google Drive API + Supabase (for any
  metadata/tags layered on top of Drive files).
- **So-what:** Turns "where did I save that file?" into "click Subject →
  click Session → it's there."

### 3.2 Magazine Library

- **Problem:** Reads HBR, Economist, Business Today PDFs but has no way to
  track what's been read or find articles by topic later.
- **How it works (the value-chain example — know this one cold):**
  1. **Input:** Magazine PDFs sit in a Drive folder.
  2. **Trigger:** A scheduled job runs daily at 7am (no manual action).
  3. **Extraction:** App reads the PDF text (first ~30 pages via `pdf-parse`).
  4. **AI step:** Sends that text to Gemini with instructions: *"Find the
     table of contents, return each article's title and which of these 7
     categories it belongs to."*
  5. **Validation:** App checks the AI's category against the fixed list
     of 7 — anything that doesn't match falls into "Other."
  6. **Storage:** Results saved to two database tables — `magazine_issues`
     (the PDF itself) and `magazine_articles` (each article, its section,
     read/unread status).
  7. **Output:** `/magazines` page groups articles by category, links back
     to the original PDF, and lets you mark articles as read.
- **Tech:** Drive API + `pdf-parse` + Gemini + Supabase + Vercel Cron.
- **So-what:** A reading backlog that organizes and triages *itself*.

### 3.3 Industry & Extra Learnings (AI Industry Primers)

- **Problem:** For consulting case prep, needs structured industry
  knowledge (value chain, players, regulation, trends) — but researching
  every industry from scratch is slow.
- **How it works:**
  1. `/industries` hub lists industries/sub-sectors via a fixed taxonomy
     file (`industry-taxonomy.ts`).
  2. Clicking a sub-sector checks the database for an existing primer.
  3. **If none exists:** Gemini generates one, structured into 10 fixed
     sections — Overview, Market Size & Growth, Future Outlook, Value
     Chain, Policy/Regulatory, Technology Trends, AI & Digital
     Integration, Major Players, Key Metrics, **Consulting Lens**.
  4. The result is **saved (cached)** to the `industry_primers` table —
     so it's generated once, then reused instantly for everyone/every
     future visit.
- **Tech:** Gemini (long-form generation) + Supabase (cache table) +
  Next.js dynamic routes (`/industries/[industry]/[subsector]`).
- **So-what:** On-demand, structured industry primers — written with a
  "consulting lens" section *by design* — generated once and reused like
  a personal knowledge base that grows over time.

### 3.4 Entries & Notes

- **Problem:** Insights from readings get lost if not written down
  somewhere structured and searchable.
- **How it works:** Lets you create tagged "knowledge entries" linked to
  subjects/sessions — a structured alternative to scattered notes apps.
- **Tech:** Next.js forms + Supabase tables for entries and tags.
- **So-what:** Every insight becomes retrievable later — exactly the
  "structured knowledge capture for placement prep" goal.

### 3.5 Search

- **Problem:** With Drive files + database entries living in different
  places, finding "that one thing I read" is hard.
- **How it works:** A unified search queries both Drive file metadata and
  database entries from one search box.
- **Tech:** Supabase queries (`searchDriveFiles` and similar) + Next.js
  search page.
- **So-what:** One search box instead of "was that in Drive or my notes?"

### 3.6 News *(in progress — good "what's next" answer)*

- **Problem:** Daily newsletters (The Ken, Mint, FT) pile up in inbox,
  rarely read systematically.
- **Planned:** Aggregate articles from these sources daily, with an AI
  summary tab — same pattern as Magazine Library, applied to newsletters.
- **So-what if asked "what's next":** *"The same ingest-categorize-summarize
  pattern I used for magazines, applied to my daily newsletter sources —
  it's next on my roadmap because the pipeline already exists, I'm just
  pointing it at a new source."*

---

## Part 4 — Architecture, As a Diagram

```
                     ┌─────────────────────────┐
                     │   Your Browser           │
                     │   (knowledge-bus.app)    │
                     └────────────┬─────────────┘
                                   │
                                   ▼
                     ┌─────────────────────────┐
                     │   Next.js App            │
                     │   (hosted on Vercel)     │
                     └──────┬────────┬───────┬──┘
                             │        │       │
              reads/writes   │        │       │  syncs files from
                             ▼        │       ▼
              ┌───────────────────┐   │   ┌──────────────────┐
              │  Supabase          │   │   │  Google Drive     │
              │  (Postgres DB)     │   │   │  (course files,    │
              │  - RLS protected   │   │   │   magazine PDFs)   │
              │  - subjects, notes,│   │   └──────────────────┘
              │    magazines,      │   │
              │    primers         │   ▼
              └───────────────────┘  ┌──────────────────┐
                                      │  Gemini AI        │
                                      │  - extract TOCs   │
                                      │  - categorize     │
                                      │  - write primers  │
                                      └──────────────────┘

        ┌─────────────────────────────────────────────────┐
        │  Vercel Cron (daily, 7am)                        │
        │  → triggers /api/scan-magazines                  │
        │  → Drive → pdf-parse → Gemini → Supabase         │
        └─────────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────────┐
        │  GitHub                                          │
        │  → push to main → Vercel auto-deploys            │
        └─────────────────────────────────────────────────┘
```

**One sentence to describe this diagram out loud:**
> "The website talks to a database for storage, Google Drive for source
> content, and Gemini for AI processing — a daily automated job keeps the
> magazine library fresh, and every code change auto-deploys via GitHub
> and Vercel."

---

## Part 5 — Mock Q&A Bank (Practice Saying These Out Loud)

### Technical / "how" questions

**Q: Walk me through the tech stack.**
> "Next.js and React build the website itself. Supabase — a managed
> Postgres database — stores all the data with row-level security so only
> I can access mine. Google's Gemini AI handles reading, categorizing, and
> summarizing content. Google Drive API pulls in files I already have.
> Vercel hosts it and runs scheduled jobs. GitHub stores the code and
> triggers deployments."

**Q: How is the data secured?**
> "Three layers: secrets like API keys are stored as environment variables,
> never in the code; the database enforces row-level security policies so
> access is controlled at the data layer, not just the app layer; and only
> I can log in via Supabase auth."

**Q: What happens if the AI miscategorizes something?**
> "I constrain it — the prompt gives Gemini an exact, fixed list of
> categories, and the app validates its response against that list. Anything
> that doesn't match falls into an 'Other' bucket rather than creating a
> new, inconsistent category. It's a guardrail, not a hope."

**Q: Why Gemini instead of OpenAI/ChatGPT?**
> "Cost-effective for this volume, strong at structured extraction tasks
> like reading PDFs and returning categorized JSON, and it fits naturally
> since I'm already integrating with Google Drive."

**Q: How do you keep the database schema organized as you add features?**
> "Each feature ships with its own numbered migration file — e.g. migration
> 0009 added the magazine tables, 0010 added industry primers. It's an
> ordered, auditable history of how the data model evolved alongside the
> features."

### Strategic / business questions

**Q: What's the business case for something like this?**
> "Every B-school student has this exact problem — too much reading,
> no system. The core pipeline (ingest → AI-categorize → organize →
> retrieve) is generic enough to extend to other content types or even
> other users. It's a real addressable-market story, not just a personal
> tool."

**Q: How does this connect to your background?**
> "My renewable energy experience means I can sanity-check the AI-generated
> industry primers for sectors I know deeply — that quality-control instinct
> (does this output actually make sense?) is the same lens I'd bring to
> reviewing any AI-assisted deliverable on a client engagement."

**Q: What would you build next, and why?**
> "The News module — aggregating newsletters like The Ken and Mint. I'd
> prioritize it next because the ingest-categorize-summarize *pipeline*
> already exists from the Magazine Library; it's mostly pointing it at a
> new source, which is low-effort, high-reuse — the kind of prioritization
> call I'd make on a client project too."

### Skeptical / "gotcha" questions

**Q: So you didn't really build this — the AI did?**
> "I directed it the way I'd direct an engineering team: I defined the
> requirements, designed the information architecture — the roadmap maps
> out four modules and a build order by complexity — made the prioritization
> calls, and tested every feature before it shipped. The execution was
> AI-assisted; the product decisions were mine. Increasingly, that's how
> software gets built — and knowing how to direct AI tools effectively is
> itself the skill."

**Q: If I asked you to change something right now, could you?**
> "Yes — I can read the code, understand what each piece does (as I just
> walked through), and direct the change. I wouldn't hand-write a new React
> component from scratch, but I know exactly what needs to change and why,
> which is the product-owner role, not the engineer role."

**Q: What's a limitation of the current build?**
> "It's single-user right now — the database design supports per-user
> security, but there's no sign-up flow yet. Also the News module is just a
> placeholder — the pipeline exists for magazines but isn't pointed at
> newsletters yet."

---

## Part 6 — Demo Script (If Asked "Can You Show Us?")

Walk through in this order — it tells a complete story in under 2 minutes:

1. **Homepage** — "Four sections: Subjects, Industries, Notes, Quiz —
   mirrors how I actually study."
2. **Subjects → pick one** — "Drive-synced automatically — this folder
   tree mirrors my actual Google Drive, so I never re-upload anything."
3. **Magazines** — "These articles were extracted and categorized
   automatically overnight by AI — I just read and tick them off."
4. **Industries → click a sub-sector** — "This primer was AI-generated
   once, on demand, and cached — covers value chain, players, regulation,
   and a consulting-lens summary."
5. **Close** — "Everything's on GitHub with proper commit history — and
   the News module is the next thing on my roadmap, reusing this same
   ingest-and-categorize pattern."

---

## Part 7 — Original Interview Prep Notes (Unchanged)

# Interview Prep: "How Did You Build This?"

Here's how to break this down for a panel — structured the way a case answer would be, moving from the **big picture** → **how it works** → **why it matters for them**.

---

## 1. The 30-Second Pitch (lead with this)

> "I built Knowledge Bus — a personal knowledge management platform — to solve my own problem as an MBA student: I'm flooded with course material, industry reports, and reading lists, with no system to prioritize, organize, or retain any of it for placement prep. The app automatically pulls my files from Google Drive, uses AI to read and categorize them, and organizes everything into a dashboard by subject, by industry, and by topic — so I always know what to read next and can retrieve insights quickly during interview prep."

**Why this lands well:** it's a real problem → structured solution → personal proof of execution. Exactly the shape of a consulting answer.

---

## 2. "Did You Code This Yourself?" — The Honest, Strong Answer

Don't claim to be an engineer. Don't undersell either. The accurate framing is actually a **selling point**:

> "I used an AI coding agent (Claude Code) to do the implementation — the way I'd direct an engineering team. My role was the product side: I defined requirements, designed the information architecture, sequenced what to build first based on complexity and dependencies, tested every feature, and iterated based on what worked."

**Why this is a *good* answer for consulting:**
- Every Big 4 firm is pushing "AI fluency" right now — directing AI tools to ship a working product *is* the skill they're hiring for.
- Consultants don't write client code either — they scope problems and direct technical teams. You did exactly that, solo.
- It demonstrates **bias for action** — most people *talk* about ideas; you have a live URL.

If pushed on "so you don't know how it works" — you do, at the architecture level (this whole document). You just didn't type every line. That's a legitimate, increasingly common way to build software, and being upfront about it shows self-awareness.

---

## 3. The Architecture — Explained With One Analogy

Think of the whole app like a **retail store**:

| Real-world part | Tech name | What it actually does |
|---|---|---|
| The shopfront / shelves customers see | **Next.js / React** (frontend) | The actual web pages — buttons, dashboards, the Magazines page, etc. |
| Staff behind the counter | **Server functions / API routes** | Code that fetches data, talks to the database, calls the AI |
| The warehouse / filing cabinet | **Supabase (Postgres database)** | Where all your data is permanently stored — magazine articles, industry primers, notes |
| A direct pipe to your existing inventory | **Google Drive API** | Lets the app read files you already have, instead of you re-uploading everything |
| An on-call research analyst | **Gemini AI** | Reads PDFs, extracts tables of contents, categorizes articles, writes industry primers |
| A standing daily routine | **Cron job (on Vercel)** | Every morning at 7am, automatically checks Drive for new magazines and processes them — no manual trigger |
| The building itself, open 24/7 | **Vercel (hosting)** | Makes the site live on the internet at a real URL, auto-updates whenever you ship new code |
| The project's audit trail | **GitHub** | Records every change ever made to the code, like Google Docs version history |

---

## 4. Walk-Through of One Feature (use this as your worked example — Magazine Library)

This is the best one to narrate because it shows **input → processing → output**, like a value chain:

1. **Input:** You drop HBR / Economist / Business Today PDFs into a Google Drive folder (you already do this).
2. **Automatic trigger:** Every day at 7am, a scheduled job wakes up and checks Drive for anything new.
3. **Extraction:** For each new PDF, the app pulls out the text (first ~30 pages).
4. **AI processing:** That text is sent to Gemini with an instruction like: *"Find the table of contents and sort each article into one of these 7 categories: Strategy & Competition, Leadership, Industries, Economics & Policy, Technology, Careers, Other."*
5. **Storage:** The AI's structured answer (article titles + categories) gets saved into the database.
6. **Output:** The website shows these grouped by category, with a link back to the original PDF and a "mark as read" checkbox.

If you want to glance at the actual code while prepping, the core logic is in [magazine-scanner.ts](Documents/Projects/knowledge-base/src/lib/drive-sync/magazine-scanner.ts) — don't worry about reading it line-by-line, just notice it follows exactly these 6 steps.

---

## 5. Tech Stack — What & Why (in case they probe choices)

| Choice | Plain-English reason |
|---|---|
| **Next.js / React** | The most widely-used web framework — well-documented, and AI coding tools are best-trained on it (lower error rate) |
| **TypeScript** | A stricter version of JavaScript that catches mistakes before the app runs — like spell-check for code |
| **Supabase** | A managed database with built-in login/security — gives you a production-grade database without managing servers |
| **Google Drive API** | Avoids double data-entry — the app works off files you already maintain |
| **Gemini AI** | Google's AI model — cost-effective for structured tasks like categorization and summarization |
| **Vercel** | Free hosting tier, deploys automatically every time code is pushed to GitHub, and runs the scheduled jobs |

---

## 6. Security (likely to come up)

- API keys / database passwords are stored as **"environment variables"** — never written into the code itself. Even though your code is public on GitHub, your secrets aren't exposed.
- The database has **Row Level Security** — rules that restrict who can read/write what data.
- Login is handled by Supabase auth — only you can access your data.

This is a good one to mention proactively — shows you thought about it without being asked.

---

## 7. Likely Panel Questions + Answers

**"What was the hardest part?"**
> "Getting the AI to reliably sort content into a *fixed* set of categories without inventing new ones — I solved it by giving the AI a strict, exact list of allowed categories in the instructions, and validating its output against that list before saving anything."

**"How would you scale this / make it a product?"**
> "The database is already designed with per-user security rules, so the main work would be adding multi-user sign-up and billing. The addressable market is large — every B-school student has the same information-overload problem."

**"What would you do differently?"**
> "I actually sequenced the build by complexity — UI shell first, then features needing no external data, then AI/Drive integration last, since those have the most dependencies and risk. That's documented in my own roadmap." *(true — and a great prioritization answer)*

**"Why does this matter to a consulting firm?"**
> "It's a live demonstration of AI-enabled productivity — identifying a workflow problem, scoping a solution, and directing an AI tool to ship it. That's the same motion as a digital transformation engagement, just at personal scale."

---

## 8. The "So What" — Map This to Consulting Skills

| What you did | Consulting competency |
|---|---|
| Broke the app into 4 independent modules (Subjects, Industries, Notes, Quiz) | **MECE problem structuring** |
| Sequenced build order by complexity/dependency | **Prioritization under constraints** |
| Built a minimal version, tested, expanded | **Hypothesis-driven iteration** |
| Directed an AI tool to execute | **AI fluency / managing technical delivery** |
| Can explain this system to a non-technical panel | **Client communication** |
