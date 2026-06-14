# Knowledge Bus

A personal knowledge management platform for MBA coursework, industry research,
and placement prep — built to turn scattered Drive folders, magazine PDFs, and
newsletters into one searchable, AI-organized hub.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

## What it does

Knowledge Bus syncs directly with Google Drive and uses Gemini to read,
categorize, and summarize content — so coursework, industry reading, and
revision material all live in one dashboard instead of scattered folders
and inboxes.

## Features

- **Subjects** — Auto-discovers course folders from a Drive root, renders
  each subject's files as a collapsible folder tree (Pre-Reads, PPTs, Notes),
  and organizes sessions with summaries and key learnings.
- **Magazine Library** — Scans HBR / Economist / Business Today PDFs from
  Drive, extracts tables of contents with Gemini, and groups articles into a
  fixed taxonomy (Strategy & Competition, Leadership, Industries, Economics &
  Policy, Technology, etc.) with read/unread tracking. Runs on a daily cron.
- **Industry & Extra Learnings** — AI-generated industry and sub-sector
  primers covering overview, market sizing, value chain, regulation, tech
  trends, major players, and a consulting-lens summary, cached in Supabase
  so each primer is generated once and reused.
- **Entries & Notes** — Capture, tag, and link knowledge entries to subjects
  and sessions for structured, retrievable revision material.
- **Search** — Unified search across synced Drive files and entries.
- **News** *(in progress)* — Daily aggregation from newsletters (The Ken,
  Mint, Financial Times) with AI summaries.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Database | Supabase (Postgres + Row Level Security) |
| AI | Google Gemini (`@google/genai`) for TOC extraction, primers, summaries |
| Integrations | Google Drive API for content sync |
| Deployment | Vercel, with scheduled cron jobs for Drive and magazine sync |

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your Supabase project URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Database schema lives in `supabase/migrations/` — apply them in order via the
Supabase SQL editor.

## Roadmap

The long-term vision (4-section dashboard: Subjects, Industry & Extra
Learnings, Notes, Quiz & Revision) is tracked in [ROADMAP.md](ROADMAP.md),
with detailed specs for the Industry hub in [FutureGoal2.0.md](FutureGoal2.0.md).
