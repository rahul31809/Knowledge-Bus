# Knowledge Bus — Interview Preparation Context

## What Is It

Knowledge Bus is a full-stack, AI-native knowledge platform I built and deployed to support my MBA academics and consulting placement preparation. It is live in production on Vercel and actively used daily.

It functions as a personal consulting intelligence system — converting raw industry names, company names, and lecture materials into structured, retrievable insight using AI agents.

---

## The Problem It Solves

**Context:** I am a full-time MBA student at SPJIMR Mumbai (2025–2027) with 8 years of prior work experience in renewable energy. Targeting consulting placements at Big 4 (Deloitte, PwC, EY, KPMG) and Accenture Strategy.

**The problem:**
- Heavy academic load leaves little time for deep self-directed research
- Information overload from multiple content sources (The Ken, FT, HBR, McKinsey, Economist)
- Consulting interviews require structured, cross-industry knowledge at speed
- No system to convert reading into structured, retrievable insight
- Manual industry research takes 3–5 hours per sector — not scalable during placement season

**The insight:** The bottleneck is not access to information — it is synthesis speed and structured retention. A consulting analyst on Day 1 of an engagement needs rapid industry orientation, competitive landscape mapping, and key player analysis. I automated that loop.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, base-ui |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL + JSONB) |
| AI | Google Gemini 2.5 Flash, Gemini Flash Lite |
| Auth | Supabase Auth |
| Deployment | Vercel (production) |
| Integrations | Google Drive API, Google Calendar MCP |

---

## The 12 AI Agents

| # | Agent | Model | Role |
|---|-------|-------|------|
| 1 | Industry Primer Generator | Gemini 2.5 Flash | Generates 16-section consulting-grade industry primer per sub-sector |
| 2 | Company Analysis Generator | Gemini 2.5 Flash | Generates 20-section deep-dive per company |
| 3 | Player Comparison Agent | Gemini 2.5 Flash | Head-to-head competitive comparison table + synthesis |
| 4 | Ask Industry Q&A | Gemini 2.5 Flash | Conversational Q&A on any industry topic |
| 5 | Ask Players Q&A | Gemini 2.5 Flash | Conversational Q&A on selected companies |
| 6 | Company News Agent | Gemini 2.5 Flash | Fetches and summarises recent news per company |
| 7 | Financials Agent | Gemini 2.5 Flash | Pulls key financial metrics per company |
| 8 | Quiz Generator | Gemini 2.5 Flash | Generates difficulty-tagged MCQs from lecture PPTs and PDFs |
| 9 | Subject Matcher | Gemini Flash Lite | Fuzzy-matches timetable codes to Google Drive folder names |
| 10 | Session Folder Matcher | Gemini Flash Lite | Maps session references to correct pre-read folders |
| 11 | Sector Extractor | Gemini Flash Lite | Reads course outline to extract sector name for relevant subjects |
| 12 | Calendar Sync Routine | Claude (claude.ai) | Periodically reads Gmail and Drive, generates weekly session Excel |

---

## Key Features Built (77 total)

### Industry Primer
- 16-section consulting-grade brief per sub-sector: Market Overview, Market Size, Growth Drivers, Challenges, Market Segments, Value Chain, Revenue & Cost Breakdown, Major Players, Recent Updates, Porter's Five Forces, Policy & Regulation, PESTLE, Technology & Digital, Risk Matrix, Key Metrics, Consulting Lens
- Company deep-dives (20 sections) in a side drawer — no page navigation required
- Head-to-head player comparison table
- Financial metrics comparison
- Latest company news
- Conversational Q&A on industry and companies

### Class Prep / Calendar
- Auto-reads weekly timetable from Google Drive
- Fuzzy-matches subject codes to Drive folders using Gemini
- Surfaces pre-read PDFs and PPTs for each session
- Handles combined session refs (e.g. "Session 7 & 8", "Session no 13 & 14")
- PDF text extraction for pre-read summaries

### Quiz & Revision
- Upload any lecture PPT or PDF
- Generates difficulty-tagged (easy/medium/hard) MCQs
- Shows score, weak-area breakdown, per-question explanations

### Other
- Global Ctrl+K command palette across all content
- PWA — installable on phone home screen
- Breadcrumb navigation throughout
- Dark/light mode

---

## Impact & Results

- Industry primer generated in **under 2 minutes** vs 3–5 hours manually
- **20+ sectors** covered and growing
- **77 features** built and deployed
- Used **daily** for MBA academics and placement prep
- Quiz module covers all active MBA subjects with live lecture material

---

## STAR Story — For Interviews

**Situation:**
As an MBA student targeting consulting placements, I faced a classic information overload problem — heavy academics, multiple content sources, placement season, and no structured system to convert reading into retrievable, structured insight.

**Task:**
I needed a system that could produce consulting-grade industry knowledge at speed — structured primers, deep company analyses, and active recall mechanisms — the exact output a consultant needs in the first 48 hours on a new engagement.

**Action:**
I built a full-stack AI platform from scratch — Next.js, Supabase, deployed on Vercel — with 12 specialized AI agents running in parallel. One agent generates a 16-section industry primer using Porter's Five Forces, PESTLE, value chain, and cost structure. Another runs a 20-section company deep-dive. A third auto-matches my class schedule to pre-read materials from Google Drive. A quiz engine tests retention with difficulty-tagged questions from lecture slides. 77 features built iteratively, production-deployed and used daily.

**Result:**
I can generate a consulting-grade industry brief on any sector in under 2 minutes — versus hours of manual research. Knowledge is now structured, not just consumed. Most importantly, I demonstrated the exact consulting instinct the role requires: identify the real problem, decompose it, build a scalable solution, and measure the outcome. The platform is live — and I used it to prepare for this conversation.

---

## Resume Bullet

> Developed and deployed an AI-native knowledge platform leveraging 12 orchestrated Gemini agents to auto-generate consulting-grade industry primers, company deep-dives, and adaptive quizzes — actively used for MBA academics and consulting placement preparation across 20+ sectors

---

## Likely Interview Questions & Suggested Answers

**Q: Why did you build this instead of using existing tools?**
> Existing tools (Notion, Obsidian, even ChatGPT) require manual input and don't produce consulting-structured output. I needed something that maps directly to how consultants think — Porter's, PESTLE, value chain — not just summaries. No tool did that end-to-end, so I built it.

**Q: How does it actually work?**
> You enter an industry and sub-sector. 12 AI agents run in parallel — each with a specific prompt and role. Within 2 minutes you get a 16-section brief structured exactly like a consulting deliverable. You can then drill into any company, compare players, or run a quiz to test retention.

**Q: What was the hardest technical challenge?**
> Prompt reliability. Getting AI to consistently output *structured* insight — not just text — required significant prompt engineering. The AI would sometimes hallucinate section names or miss fields. I solved it with strict JSON schema validation and normalisation layers in the backend. Same problem consulting firms face with junior analysts — output structure matters as much as content quality.

**Q: What would you do differently?**
> I'd build the knowledge verification layer earlier — flagging when AI output conflicts with known facts. I added it late. In consulting, credibility of the brief matters as much as the brief itself.

**Q: How is this relevant to consulting?**
> Two ways. First, the output mirrors consulting deliverables — every primer is structured like an industry brief an analyst would produce on Day 1 of an engagement. Second, building it demonstrates the consulting mindset — I identified a problem, decomposed it into components, built a scalable solution, and shipped it. I didn't just talk about systems thinking. I applied it.

**Q: How many people built this?**
> Just me. Which is also a data point — I used AI agents to substitute for a 5-person research team. That is a skill that is directly relevant to how modern consulting firms are thinking about AI-augmented delivery.

**Q: Is it just for your MBA or could others use it?**
> Currently scoped for my preparation, but the architecture is generic. Any MBA student targeting consulting could use it. The industry taxonomy, AI prompts, and quiz engine are all configurable. It's a product, not a script.

---

## Framing for Different Interview Contexts

**If asked about tech background:**
Use it to show you can build, not just use, AI tools. Emphasise the agent orchestration and structured output design.

**If asked about problem-solving:**
Lead with the problem framing — information overload, synthesis speed, structured retention. The tech is the solution, not the story.

**If asked about leadership/initiative:**
77 features, solo-built, production-deployed, daily use. No team, no budget, shipped in parallel with a full MBA course load.

**If asked about AI knowledge:**
You understand agent orchestration, prompt engineering, structured output extraction, model selection trade-offs (Flash vs Flash Lite for cost vs quality), and real production constraints (timeouts, JSON normalisation, fallback handling).
