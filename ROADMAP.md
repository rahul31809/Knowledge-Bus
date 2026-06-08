# Knowledge Bus — Long-Term Roadmap

This is the north-star vision for the app, captured 2026-06-08. The current
Subjects → Sessions → Notes navigation (shipped same day) is the foundation —
everything below builds on it incrementally. Not a sprint plan; pull pieces
off this list one at a time as they become the priority.

## Target homepage structure

Four primary sections, dashboard layout with sidebar nav:

1. **Subjects**
2. **Industry & Extra Learnings**
3. **Notes**
4. **Quiz & Revision**

## 1. Subjects module

Source: Google Drive folder "PGPM Leadership, Innovation & Change" (multiple
subject folders inside).

Navigation: Home → Subjects → Subject List → Individual Subject Page → Sessions

Each **Subject Page** should contain:
- Subject overview
- Course outline
- Session list
- Pre-reads
- PPTs
- Notes
- Session summaries
- Important frameworks
- Revision highlights

Each **Session** should display:
- Session number, date, topic
- Linked pre-read files
- Linked PPT files
- Notes
- Summary section
- Key learnings
- Tags

## 2. Industry & Extra Learnings module

A "knowledge intelligence hub" — main categories:
Industry Primers, Energy Sector, Leadership, Management, Company Analysis,
Strategy, Consulting, Policy & Regulation, Technology, Macroeconomics.

**Industry Primer system** — clicking an industry shows: value chain, key
players, economics, risks, business models, trends, Porter's analysis,
regulations, glossary, AI insights. Architecture should support future
AI-generated content.

**Energy Sector Hub** — News, Policies, Regulations, Renewable Energy, Solar,
Wind, Grid, Power Markets, ESG, Carbon Markets, Energy Transition. Needs:
searchable content, PDF indexing, article tagging, AI summaries.

**HBR / Magazine Intelligence system** — source: Google Drive folders (HBR,
Economist, Business Today, McKinsey Insights, industry reports). The app
should scan folders, extract text, and auto-categorize into: Leadership,
Management, Strategy, Industry, Company-specific, Operations, Innovation,
Finance, Others. Clicking a category shows article cards with summaries,
tags, source publication, publication date, Drive hyperlink.

## 3. Notes module

Should support: markdown editor, rich text editing, tagging, backlinks,
linking notes to sessions, auto-save, search, revision pinning.

Notes should be attachable to: subjects, sessions, industries, topics.

## 4. Quiz & Revision module

Lightweight for now, structured for future expansion.

Navigation: Quiz & Revision → Subject Selection → Session Selection → Quiz Page

**Build now**: quiz dashboard, subject-wise grouping, session-wise grouping,
placeholder MCQ cards, revision cards, progress-tracker placeholder — UI/
structure and sample static quiz data only, with placeholders for future
AI-generated quizzes. No AI generation yet.

Each quiz page should display: question, 4 options, correct-answer section,
explanation placeholder, difficulty tag, session tag.

Buttons: "Start Quiz", "Revision Mode", "Practice by Subject",
"Practice by Session".

(Future: MCQs, case-based questions, flashcards, quick revision questions.)

## Global search

Universal search across: subjects, sessions, files, notes, summaries,
articles, industries. Support keyword search, filters, tags, date range.

## Suggested build order (when picking up a slice)

Roughly increasing complexity / decreasing dependency on external integrations:
1. Sidebar nav + 4-section homepage shell (pure UI restructure on current data)
2. Richer Subject pages (course outline, frameworks, revision highlights —
   fields that can just be added to the data model, no Drive integration)
3. Quiz & Revision UI shell with static sample data (no AI, no Drive)
4. Notes module upgrades (markdown/rich text, backlinks, tagging)
5. Global search
6. Google Drive integration (folder scanning, file linking, text extraction)
7. Industry & Extra Learnings hub + AI-generated content (highest complexity —
   depends on Drive ingestion + AI summarization pipeline)
