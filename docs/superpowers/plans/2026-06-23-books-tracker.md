# Reading Dashboard (Books Tracker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/books` route that replicates the reading dashboard HTML — 29 ranked books with tier/category filters, per-book reading pace planning, daily chapter-based progress tracking, and add/edit/delete for custom books — with plans and logs persisted in Supabase.

**Architecture:** The 29 default books live as a TypeScript constant in `src/lib/books-data.ts` (no SQL seed needed). Custom books are stored in a `custom_books` Supabase table. Reading plans and daily logs are user-scoped tables (`book_reading_plans`, `book_daily_logs`) keyed by a `book_key` string (`"default-{rank}"` for built-ins, UUID for custom). The server page fetches all user data and passes a merged `BookWithStatus[]` to a single `"use client"` orchestrator (`BooksDashboard`). Server actions handle all mutations and call `revalidatePath("/books")`.

**Tech Stack:** Next.js 16 App Router, Supabase (server client + RLS), TypeScript, Tailwind CSS v4, shadcn/ui (Dialog, Badge, Button, Card, Input, Select, Textarea).

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/0021_books.sql` | 3 tables + RLS |
| Create | `src/lib/books-data.ts` | 29-book constant + helpers |
| Modify | `src/lib/types.ts` | Book types |
| Modify | `src/lib/queries.ts` | Fetch functions |
| Create | `src/app/(app)/books/actions.ts` | Server actions |
| Create | `src/app/(app)/books/page.tsx` | Server page |
| Create | `src/components/books/book-card.tsx` | Single book card |
| Create | `src/components/books/books-stats-header.tsx` | Stats + progress bar |
| Create | `src/components/books/pace-plan-dialog.tsx` | Pace-setting dialog |
| Create | `src/components/books/book-tracker.tsx` | In-progress tracker card |
| Create | `src/components/books/book-form-dialog.tsx` | Add/edit custom book dialog |
| Create | `src/components/books/books-dashboard.tsx` | Client orchestrator |
| Modify | `src/app/(app)/page.tsx` | Add Books entry card |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0021_books.sql`

- [ ] **Step 1: Create the migration file**

Write the following to `supabase/migrations/0021_books.sql`:

```sql
-- custom_books: user-added books only. Default books live in src/lib/books-data.ts.
create table if not exists public.custom_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '📚',
  title text not null,
  author text not null,
  category text not null,
  tier int not null check (tier in (1, 2, 3)),
  pages int not null check (pages > 0),
  chapters text[] not null default '{}',
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists custom_books_set_updated_at on public.custom_books;
create trigger custom_books_set_updated_at
  before update on public.custom_books
  for each row execute function public.set_updated_at();

alter table public.custom_books enable row level security;

drop policy if exists "Users manage own custom books" on public.custom_books;
create policy "Users manage own custom books"
  on public.custom_books for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- book_reading_plans: one row per (user, book). book_key = "default-{rank}" or UUID.
create table if not exists public.book_reading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_key text not null,
  start_date date not null,
  pages_per_day int not null check (pages_per_day > 0),
  target_days int not null check (target_days > 0),
  status text not null default 'progress' check (status in ('progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_key)
);

drop trigger if exists book_reading_plans_set_updated_at on public.book_reading_plans;
create trigger book_reading_plans_set_updated_at
  before update on public.book_reading_plans
  for each row execute function public.set_updated_at();

alter table public.book_reading_plans enable row level security;

drop policy if exists "Users manage own reading plans" on public.book_reading_plans;
create policy "Users manage own reading plans"
  on public.book_reading_plans for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- book_daily_logs: one row per (user, book, date) when that day was checked off.
create table if not exists public.book_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_key text not null,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, book_key, log_date)
);

alter table public.book_daily_logs enable row level security;

drop policy if exists "Users manage own daily logs" on public.book_daily_logs;
create policy "Users manage own daily logs"
  on public.book_daily_logs for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: migration applies with no errors. Verify three new tables appear in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0021_books.sql
git commit -m "feat: add books, reading plans, and daily logs tables"
```

---

## Task 2: Books Data Constant + Types

**Files:**
- Create: `src/lib/books-data.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Create `src/lib/books-data.ts`**

```typescript
import type { BookReadingPlan, BookStatus, BookWithStatus, CustomBook } from "./types";

export interface DefaultBook {
  rank: number;
  tier: 1 | 2 | 3;
  emoji: string;
  title: string;
  author: string;
  category: string;
  pages: number;
  chapters: string[];
  summary: string;
}

export const DEFAULT_BOOKS: DefaultBook[] = [
  {
    rank: 1, tier: 1, emoji: "🚀", title: "Zero to One", author: "Peter Thiel", category: "Strategy", pages: 224,
    chapters: ["The Challenge of the Future","Party Like It's 1999","All Happy Companies Are Different","The Ideology of Competition","Last Mover Advantage","You Are Not a Lottery Ticket","Follow the Money","Secrets","Foundations","The Mechanics of Mafia","If You Build It, Will They Come?","Man and Machine","Seeing Green","The Founder's Paradox"],
    summary: "Argues that real innovation creates entirely new categories (0→1). Thiel outlines why monopolies—not competition—drive long-term value, and how startups should think about secrets, technology, and the future.",
  },
  {
    rank: 2, tier: 1, emoji: "⚡", title: "The Innovator's Dilemma", author: "Clayton M. Christensen", category: "Strategy", pages: 288,
    chapters: ["How Can Great Firms Fail?","Value Networks and the Impetus to Innovate","Disruptive Change in the Mechanical Excavator Industry","What Goes Up, Can't Go Down","Give Responsibility to Organizations Whose Customers Need Them","Match the Size of the Organization to the Market","Discovering New and Emerging Markets","How to Appraise Your Organization's Capabilities","Performance Provided, Market Demand, and the Product Life Cycle","Managing Disruptive Technological Change"],
    summary: "Explains why well-managed companies fail by ignoring disruptive technologies that initially serve niche markets. A foundational framework for understanding how industries get upended.",
  },
  {
    rank: 3, tier: 1, emoji: "🧠", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", category: "Decision Making", pages: 499,
    chapters: ["The Characters of the Story","Attention and Effort","The Lazy Controller","The Associative Machine","Cognitive Ease","Norms, Surprises, and Causes","A Machine for Jumping to Conclusions","How Judgments Happen","Answering an Easier Question","The Law of Small Numbers","Anchors","The Science of Availability","Availability, Emotion, and Risk","Tom W's Specialty","Linda: Less is More","Causes Trump Statistics","Regression to the Mean","Taming Intuitive Predictions","The Illusion of Understanding","The Illusion of Validity","Intuitions vs. Formulas","Expert Intuition: When Can We Trust It?","The Outside View","The Engine of Capitalism","Bernoulli's Errors","Prospect Theory","The Endowment Effect","Bad Events","The Fourfold Pattern","Rare Events","Risk Policies","Keeping Score","Reversals","Frames and Reality","Two Selves","Life as a Story","Experienced Well-Being","Thinking About Life"],
    summary: "Nobel laureate Kahneman reveals two systems governing thinking: fast System 1 and slow System 2. Exposes cognitive biases that distort judgment—with massive implications for business decisions and leadership.",
  },
  {
    rank: 4, tier: 1, emoji: "🔄", title: "The Lean Startup", author: "Eric Ries", category: "Operations", pages: 336,
    chapters: ["Start","Define","Learn","Experiment","Leap","Test","Measure","Pivot (or Persevere)","Batch","Grow","Adapt","Innovate","Epilogue: Waste Not"],
    summary: "Introduces the Build-Measure-Learn feedback loop as the engine of startup success. Advocates for validated learning, MVPs, and pivoting based on data—applicable to any organisation pursuing innovation.",
  },
  {
    rank: 5, tier: 1, emoji: "🌊", title: "Blue Ocean Strategy", author: "W. Chan Kim & Renée Mauborgne", category: "Strategy", pages: 268,
    chapters: ["Creating Blue Oceans","Analytical Tools and Frameworks","Reconstruct Market Boundaries","Focus on the Big Picture, Not the Numbers","Reach Beyond Existing Demand","Get the Strategic Sequence Right","Overcome Key Organisational Hurdles","Build Execution into Strategy","Conclusion: The Sustainability and Renewal of Blue Ocean Strategy"],
    summary: "Presents a systematic framework for creating uncontested market space rather than competing in saturated ones. Tools like the Strategy Canvas make it immediately practical for real business problems.",
  },
  {
    rank: 6, tier: 1, emoji: "📐", title: "The McKinsey Way", author: "Ethan M. Rasiel", category: "Consulting", pages: 196,
    chapters: ["Building the Team","Framing the Problem","Designing the Analysis","Gathering Data","Understanding Financials","Presenting Ideas","Managing Hierarchy"],
    summary: "Demystifies McKinsey's problem-solving toolkit: hypothesis-driven thinking, MECE principle, structured communication, and managing client relationships. Essential for anyone in consulting or business strategy.",
  },
  {
    rank: 7, tier: 1, emoji: "🗂️", title: "The McKinsey Mind", author: "Ethan M. Rasiel & Paul N. Friga", category: "Consulting", pages: 208,
    chapters: ["Framing","Designing the Analysis","Gathering Data","Interpreting the Results","Presenting Your Ideas","Managing Your Team","Managing Your Client","Managing Yourself"],
    summary: "The implementation companion to The McKinsey Way — focuses on applying McKinsey's analytical techniques in practice. Covers project management, client dynamics, and professional self-management.",
  },
  {
    rank: 8, tier: 1, emoji: "⚛️", title: "Atomic Habits", author: "James Clear", category: "Personal Dev", pages: 320,
    chapters: ["The Surprising Power of Atomic Habits","How Your Habits Shape Your Identity","How to Build Better Habits in 4 Simple Steps","The Man Who Didn't Look Right","The Best Way to Start a New Habit","Motivation Is Overrated; Environment Often Matters More","The Secret to Self-Control","How to Make a Habit Irresistible","The Role of Family and Friends","How to Find and Fix the Causes of Your Bad Habits","Walk Slowly, but Never Backward","The Law of Least Effort","How to Stop Procrastinating","How to Make Good Habits Inevitable","The Cardinal Rule of Behaviour Change","How to Stick with Good Habits Every Day","How an Accountability Partner Can Change Everything","The Truth About Talent","The Goldilocks Rule","The Downside of Creating Good Habits"],
    summary: "Remarkable results come from tiny 1% improvements compounded over time. Introduces the Four Laws of Behaviour Change and shows how to design environments that make good habits automatic.",
  },
  {
    rank: 9, tier: 1, emoji: "🔥", title: "Leading Change", author: "John P. Kotter", category: "Leadership", pages: 208,
    chapters: ["Transforming Organisations: Why Firms Fail","Successful Change and the Force That Drives It","Establishing a Sense of Urgency","Creating the Guiding Coalition","Developing a Vision and Strategy","Communicating the Change Vision","Empowering Employees for Broad-Based Action","Generating Short-Term Wins","Consolidating Gains and Producing More Change","Anchoring New Approaches in the Culture","The Organisation of the Future"],
    summary: "Kotter's landmark 8-step model for driving organisational transformation—from creating urgency and building a guiding coalition to anchoring change in culture. The gold standard for change management.",
  },
  {
    rank: 10, tier: 2, emoji: "💪", title: "The Hard Thing About Hard Things", author: "Ben Horowitz", category: "Leadership", pages: 304,
    chapters: ["From Communist to Venture Capitalist","\"I Will Survive\"","This Time with Feeling","When Things Fall Apart","Take Care of the People, the Products, and the Profits","Why We Couldn't Buy Just One","The Struggle","Lead Bullets","Politics in the Enterprise","The Right Kind of Ambition","How to Minimise Politics","The Fine Line Between Fear and Courage","How to Evaluate CEOs","Ones and Twos"],
    summary: "Raw, unfiltered account of the decisions no business school teaches—laying off employees, firing executives, managing your own psychology in crisis. Battle-tested wisdom from building startups under extreme pressure.",
  },
  {
    rank: 11, tier: 2, emoji: "💰", title: "Romancing the Balance Sheet", author: "Anil Lamba", category: "Finance", pages: 215,
    chapters: ["The World of Finance","Assets and Liabilities","The Balance Sheet","The Profit & Loss Account","Cash Flow Statement","Ratios: Measuring Performance","Liquidity Ratios","Profitability Ratios","Leverage Ratios","Working Capital Management","Capital Budgeting","Cost–Volume–Profit Analysis","Understanding Depreciation","Taxation Basics","Financial Planning","Reading Annual Reports","Corporate Finance Fundamentals","Valuation Concepts","Managing Business Finance","Putting It All Together"],
    summary: "Makes financial statements accessible for non-finance managers using storytelling—explaining balance sheets, P&L, cash flow, and key ratios in a way that connects directly to real business decision-making.",
  },
  {
    rank: 12, tier: 2, emoji: "🏭", title: "The Goal", author: "Eliyahu M. Goldratt", category: "Operations", pages: 362,
    chapters: ["Alex Rogo's Ultimatum","A Meeting with Jonah","What Is the Goal?","The Mystery of Measurements","Capacity and Bottlenecks","Robots and Productivity","Finding the Bottlenecks","The Flow and the Constraint","Balancing Flow, Not Capacity","The Expedition","Dependent Events and Statistical Fluctuations","The Drum, Buffer, Rope","Speeding Up the Bottleneck","Reducing Setup Times","Process Batch vs. Transfer Batch","Local Optima vs. System Optima","Sales and the Goal","Non-Bottlenecks and the Goal","The Inventory Trap","The Socratic Method","Throughput, Inventory, Operating Expense","Jonah's Challenge","Making the Numbers","The Board's Deadline","The New Measurements","The Five Focusing Steps","The Ongoing Process","Beyond the Factory","The Next Step","Thinking Processes","The Theory of Constraints Applied","Alex's Report","The Future of the Plant","Results and Decisions","The Next Challenge","Thinking About Thinking","Jonah's Parting Words","The Ongoing Improvement","Beyond Manufacturing","The Foundation"],
    summary: "A business novel about discovering the Theory of Constraints: every system has one bottleneck, and fixing anything else is wasted effort. Transforms how managers think about operations and throughput.",
  },
  {
    rank: 13, tier: 2, emoji: "🎖️", title: "Extreme Ownership", author: "Jocko Willink & Leif Babin", category: "Leadership", pages: 320,
    chapters: ["Extreme Ownership","No Bad Teams, Only Bad Leaders","Believe","Check the Ego","Cover and Move","Simple","Prioritise and Execute","Decentralised Command","Plan","Leading Up and Down the Chain of Command","Decisiveness Amid Uncertainty","Discipline Equals Freedom"],
    summary: "Navy SEAL commanders translate battlefield leadership lessons to business. Core principle: leaders own everything in their world—no excuses. Covers Decentralised Command, Prioritise & Execute, and disciplined leadership.",
  },
  {
    rank: 14, tier: 2, emoji: "🗂️", title: "Case in Point", author: "Marc P. Cosentino", category: "Consulting", pages: 292,
    chapters: ["The Consulting Profession","What Consultants Look For","The Ivy Case System","Market-Sizing Cases","Business Strategy Cases","Mergers & Acquisitions Cases","Operations Cases","Information Technology Cases","Human Resources Cases","Non-Profit & Government Cases"],
    summary: "The definitive guide to consulting case interviews. Covers frameworks, case types (market entry, profitability, M&A), and communication skills. Essential for MBA students targeting MBB and strategy consulting roles.",
  },
  {
    rank: 15, tier: 2, emoji: "🤖", title: "Prediction Machines", author: "Ajay Agrawal, Joshua Gans & Avi Goldfarb", category: "Decision Making", pages: 272,
    chapters: ["Intelligence","Cheap","Prediction","Judgment","Uncertainty","Decisions","Tools","Returns","Transforming Your Business","Power","Strategies for Machines"],
    summary: "Reframes AI as a dramatic reduction in the cost of prediction. Shows how this reshapes decision-making across industries—who makes decisions, how risk is allocated, and what work gets automated.",
  },
  {
    rank: 16, tier: 2, emoji: "🔁", title: "Thinking in Systems", author: "Donella Meadows", category: "Decision Making", pages: 240,
    chapters: ["The Basics: System Structure and Behaviour","A Brief Visit to the Systems Zoo","Why Systems Work So Well","Why Systems Surprise Us","System Traps… and Opportunities","Leverage Points: Places to Intervene in a System","Living in a World of Systems"],
    summary: "Teaches how to see the world as interconnected feedback loops rather than linear cause-and-effect. Explains why interventions often produce unintended consequences and how to find high-leverage points for change.",
  },
  {
    rank: 17, tier: 2, emoji: "🔧", title: "Rework", author: "Jason Fried & David Heinemeier Hansson", category: "Operations", pages: 288,
    chapters: ["First","Takedowns","Go","Progress","Productivity","Competitors","Evolution","Promotion","Hiring","Damage Control","Culture"],
    summary: "A contrarian manifesto against conventional business wisdom. Argues for radical simplicity: ignore competitors, stop obsessive planning, hire less, do less. Built from Basecamp's experience running a profitable bootstrapped company.",
  },
  {
    rank: 18, tier: 2, emoji: "📈", title: "Scaling Up Excellence", author: "Robert I. Sutton & Huggy Rao", category: "Leadership", pages: 368,
    chapters: ["It's a Ground War, Not Just an Air War","Buddhism vs. Catholicism","Hot Causes, Cool Solutions","Cut Cognitive Load","Connect People and Cascade Excellence","Bad Is Stronger Than Good","The Problem of More","Did This, Now That","The People Who Propel Scaling"],
    summary: "Examines how organisations spread and sustain excellence as they grow. Explores the Buddhism vs. Catholicism tradeoff and how to clear the path for people doing great work at scale.",
  },
  {
    rank: 19, tier: 2, emoji: "🌍", title: "Redefining Global Strategy", author: "Pankaj Ghemawat", category: "Strategy", pages: 320,
    chapters: ["World 3.0: Neither Local Nor Global","The CAGE Framework","Strategy for Semiglobalisation","Arbitrage","Aggregation","Adaptation","The Triple-A Triangle","Country Analysis","Industry Analysis","Competitor Analysis","Company Analysis"],
    summary: "Challenges the 'flat world' narrative—national borders still matter enormously. Introduces the CAGE framework (Cultural, Administrative, Geographic, Economic distance) for evaluating international market entry.",
  },
  {
    rank: 20, tier: 3, emoji: "🌊", title: "Blue Ocean Shift", author: "W. Chan Kim & Renée Mauborgne", category: "Strategy", pages: 320,
    chapters: ["Charting a Path from Red to Blue Oceans","The Tools and Frameworks of Blue Ocean Shift","Reconstruct Market Boundaries","Create New Demand","Align the Value, Profit, and People Propositions","See the Reality of Your Market Space","Visualise Your Strategy Canvas","Hold a Blue Ocean Fair","Select Your Blue Ocean Move","Build Execution into Strategy","Humanness and the Path to Blue Ocean Shift"],
    summary: "The practical sequel to Blue Ocean Strategy—showing how to actually execute the shift from red to blue oceans. Introduces the Humanness Process and step-by-step tools for real implementation.",
  },
  {
    rank: 21, tier: 3, emoji: "⚡", title: "Power and Prediction", author: "Ajay Agrawal, Joshua Gans & Avi Goldfarb", category: "Decision Making", pages: 288,
    chapters: ["The Age of AI","The Power of Prediction","Point Solutions","System Solutions","Who Holds the Power?","Navigating the Transition","The AI Governance Deficit","Winners and Losers","The Role of Regulation","Strategies for the Age of AI","The Optimistic Scenario","The Path Forward"],
    summary: "The follow-up to Prediction Machines—who wins and loses when AI redistributes decision-making power. Point solutions create disruption; system solutions create transformation.",
  },
  {
    rank: 22, tier: 3, emoji: "🌱", title: "Net Positive", author: "Paul Polman & Andrew Winston", category: "Sustainability", pages: 368,
    chapters: ["The Net Positive World We Need","Own the Outcomes of All Your Impacts","Create Positive Returns for All Stakeholders","Build Deep Partnerships","Fight for System Change","Make Purpose Central to Strategy","Reimagine Capitalism","The Courage to Lead","Short-Term vs. Long-Term","Building a Net Positive Company","Collaboration at Scale","The Future of Net Positive Business"],
    summary: "Former Unilever CEO Polman argues companies must give back more than they take. A manifesto for purpose-driven leadership showing that long-term profitability and positive social impact are mutually reinforcing.",
  },
  {
    rank: 23, tier: 3, emoji: "✨", title: "Man's Search for Meaning", author: "Viktor E. Frankl", category: "Personal Dev", pages: 165,
    chapters: ["Experiences in a Concentration Camp","Logotherapy in a Nutshell","The Case for a Tragic Optimism"],
    summary: "Holocaust survivor Frankl describes life in Nazi concentration camps and derives logotherapy: meaning—not pleasure or power—is the primary human motivator. Essential reading on purpose and resilience.",
  },
  {
    rank: 24, tier: 3, emoji: "👟", title: "Shoe Dog", author: "Phil Knight", category: "Leadership", pages: 400,
    chapters: ["1962","1963","1964","1965","1966","1967","1968","1969","1970","1971","1972","1973","1974","1975","1976–1977","Night"],
    summary: "Nike founder Phil Knight's memoir about building one of the world's most iconic brands from a $50 loan. An honest, emotional account of near-bankruptcy, luck, partnership, and the obsession that built a global empire.",
  },
  {
    rank: 25, tier: 3, emoji: "⚾", title: "Moneyball", author: "Michael Lewis", category: "Decision Making", pages: 317,
    chapters: ["The Curse of Talent","How to Find a Ballplayer","The Enlightenment","Field of Ignorance","The Jeremy Brown Blue Plate Special","The Science of Winning an Unfair Game","Giambi's Hole","The Trading Desk","The Human Element","Planning for Failure","The Herd Mentality","Symbiosis","The Pleasure of Rooting for Losers","The Market for Baseball Players"],
    summary: "How the Oakland A's used data analytics to compete against teams with far bigger budgets. A compelling argument for evidence-based decision-making over intuition—with lessons far beyond baseball.",
  },
  {
    rank: 26, tier: 3, emoji: "🌸", title: "Ikigai", author: "Héctor García & Francesc Miralles", category: "Personal Dev", pages: 208,
    chapters: ["Ikigai: The Art of Staying Young While Growing Old","Antiaging Secrets","From Logotherapy to Ikigai","Find Flow in Everything You Do","Masters of Longevity","Lessons from Japan's Centenarians","The Ikigai Diet","Gentle Movement and Living Longer","Resilience and Wabi-Sabi","Find Your Ikigai"],
    summary: "Explores the Japanese concept of Ikigai—the intersection of what you love, what you're good at, what the world needs, and what you can be paid for. Draws on interviews with the world's longest-living people.",
  },
  {
    rank: 27, tier: 3, emoji: "🗺️", title: "The New Map", author: "Daniel Yergin", category: "Sustainability", pages: 512,
    chapters: ["The Shale Revolution","Putin's Map","The New Middle East Map","The China Maps","The Climate Map","The Return of Electric Cars","The New Map of Energy","The Energy Transition","The Hydrogen Economy","The Digital Energy World","The New Geopolitics of Energy","America's Energy Wars","Europe's Energy Dilemma","Asia's Energy Challenges","The New Rules of Energy Competition","Energy Security in the New Age","The Future of Oil Demand","Climate Policy and Energy Transition","The Grid of Tomorrow","Conclusion: The New Map"],
    summary: "Pulitzer-winning energy expert Yergin maps how geopolitics, climate change, and the energy transition are redrawing the world order. Covers US shale, Russia's gas leverage, China's rise, and the race to renewables.",
  },
  {
    rank: 28, tier: 3, emoji: "♻️", title: "Green Giants", author: "E. Freya Williams", category: "Sustainability", pages: 240,
    chapters: ["The Green Giant Phenomenon","Iconoclastic Leadership","Mainstream Appeal","Disruptive Innovation","A Higher Purpose","Mainstream Without Selling Out","The Six Factors","The Road Ahead"],
    summary: "Profiles companies (IKEA, Tesla, Unilever, Chipotle) that built billion-dollar businesses by putting sustainability at the core. Identifies six factors that separate genuine green giants from greenwashed also-rans.",
  },
  {
    rank: 29, tier: 3, emoji: "📖", title: "Gang Leader for a Day", author: "Sudhir Venkatesh", category: "Sociology", pages: 302,
    chapters: ["Pissing in the Hallway Seemed Like a Good Idea at the Time","First Days","Someone to Watch Over Me","Gang Leader for a Day","The Hustler and the Hustled","How to Help","Black dan Alive in the Concrete Jungle"],
    summary: "Sociologist Venkatesh's account of embedding himself in a Chicago housing project gang over a decade. A riveting study of underground economies, informal power structures, and what economics misses about urban poverty.",
  },
];

export interface DayPlan {
  chapterNums: number[];
  titles: string[];
  startPg: number;
  endPg: number;
  pages: number;
}

export function buildDailyPlan(
  book: { pages: number; chapters: string[] },
  pagesPerDay: number
): DayPlan[] {
  const ppc = book.pages / book.chapters.length;
  const cpd = Math.max(1, Math.floor(pagesPerDay / ppc));
  const days: DayPlan[] = [];
  for (let i = 0; i < book.chapters.length; i += cpd) {
    const chs = book.chapters.slice(i, i + cpd);
    const sp = Math.round(i * ppc) + 1;
    const ep = Math.min(book.pages, Math.round((i + cpd) * ppc));
    days.push({
      chapterNums: Array.from({ length: chs.length }, (_, j) => i + j + 1),
      titles: chs,
      startPg: sp,
      endPg: ep,
      pages: ep - sp + 1,
    });
  }
  return days;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function estimateDays(pages: number, pagesPerDay: number): number {
  return Math.ceil(pages / pagesPerDay);
}

export function tierClasses(tier: 1 | 2 | 3): string {
  if (tier === 1) return "from-indigo-500 to-violet-400";
  if (tier === 2) return "from-blue-500 to-sky-400";
  return "from-slate-500 to-slate-400";
}

export function buildBooksWithStatus(
  customBooks: CustomBook[],
  plans: BookReadingPlan[],
  allLogs: Record<string, string[]>
): BookWithStatus[] {
  const planMap = new Map(plans.map((p) => [p.book_key, p]));

  const defaults: BookWithStatus[] = DEFAULT_BOOKS.map((book) => {
    const bookKey = `default-${book.rank}`;
    const plan = planMap.get(bookKey) ?? null;
    const status: BookStatus = plan ? (plan.status as BookStatus) : "none";
    return {
      bookKey,
      rank: book.rank,
      tier: book.tier,
      emoji: book.emoji,
      title: book.title,
      author: book.author,
      category: book.category,
      pages: book.pages,
      chapters: book.chapters,
      summary: book.summary,
      isCustom: false,
      plan,
      status,
      loggedDates: allLogs[bookKey] ?? [],
    };
  });

  const custom: BookWithStatus[] = customBooks.map((book, i) => {
    const bookKey = book.id;
    const plan = planMap.get(bookKey) ?? null;
    const status: BookStatus = plan ? (plan.status as BookStatus) : "none";
    return {
      bookKey,
      rank: DEFAULT_BOOKS.length + i + 1,
      tier: book.tier,
      emoji: book.emoji,
      title: book.title,
      author: book.author,
      category: book.category,
      pages: book.pages,
      chapters: book.chapters,
      summary: book.summary,
      isCustom: true,
      customId: book.id,
      plan,
      status,
      loggedDates: allLogs[bookKey] ?? [],
    };
  });

  return [...defaults, ...custom];
}
```

- [ ] **Step 2: Add types to `src/lib/types.ts`**

Append the following block at the end of `src/lib/types.ts`:

```typescript
// ── Books tracker ─────────────────────────────────────────────────────────────

export const BOOK_CATEGORIES = [
  "Strategy",
  "Consulting",
  "Leadership",
  "Operations",
  "Finance",
  "Decision Making",
  "Personal Dev",
  "Sustainability",
  "Sociology",
  "Economics",
  "Marketing",
  "Technology",
  "Other",
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export interface CustomBook {
  id: string;
  user_id: string;
  emoji: string;
  title: string;
  author: string;
  category: BookCategory;
  tier: 1 | 2 | 3;
  pages: number;
  chapters: string[];
  summary: string;
  created_at: string;
  updated_at: string;
}

export type CustomBookInput = Omit<CustomBook, "id" | "user_id" | "created_at" | "updated_at">;

export interface BookReadingPlan {
  id: string;
  user_id: string;
  book_key: string;
  start_date: string;   // YYYY-MM-DD
  pages_per_day: number;
  target_days: number;
  status: "progress" | "done";
  created_at: string;
  updated_at: string;
}

export type BookStatus = "none" | "progress" | "done";

export interface BookWithStatus {
  bookKey: string;
  rank: number;
  tier: 1 | 2 | 3;
  emoji: string;
  title: string;
  author: string;
  category: string;
  pages: number;
  chapters: string[];
  summary: string;
  isCustom: boolean;
  customId?: string;
  plan: BookReadingPlan | null;
  status: BookStatus;
  loggedDates: string[];
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/books-data.ts src/lib/types.ts
git commit -m "feat: add books-data constant and book tracker types"
```

---

## Task 3: Query Functions

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Append query functions to `src/lib/queries.ts`**

Add the following imports at the top of `src/lib/queries.ts` (merge into the existing import from `"./types"`):

```typescript
import type {
  // ...existing imports...
  BookReadingPlan,
  CustomBook,
} from "./types";
```

Then append at the end of `src/lib/queries.ts`:

```typescript
// ── Books tracker ─────────────────────────────────────────────────────────────

export async function fetchCustomBooks(supabase: SupabaseServerClient, userId: string): Promise<CustomBook[]> {
  const { data, error } = await supabase
    .from("custom_books")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CustomBook[];
}

export async function fetchBookReadingPlans(supabase: SupabaseServerClient, userId: string): Promise<BookReadingPlan[]> {
  const { data, error } = await supabase
    .from("book_reading_plans")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as BookReadingPlan[];
}

export async function fetchAllBookDailyLogs(
  supabase: SupabaseServerClient,
  userId: string
): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("book_daily_logs")
    .select("book_key, log_date")
    .eq("user_id", userId);
  if (error) throw error;
  const result: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!result[row.book_key]) result[row.book_key] = [];
    result[row.book_key].push(row.log_date as string);
  }
  return result;
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add book tracker query functions"
```

---

## Task 4: Server Actions

**Files:**
- Create: `src/app/(app)/books/actions.ts`

- [ ] **Step 1: Create `src/app/(app)/books/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CustomBookInput } from "@/lib/types";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function startReadingPlan(
  bookKey: string,
  pagesPerDay: number,
  targetDays: number
) {
  const { supabase, userId } = await getUser();
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("book_reading_plans").upsert(
    {
      user_id: userId,
      book_key: bookKey,
      start_date: today,
      pages_per_day: pagesPerDay,
      target_days: targetDays,
      status: "progress",
    },
    { onConflict: "user_id,book_key" }
  );
  if (error) throw error;
  revalidatePath("/books");
}

export async function markBookDone(bookKey: string) {
  const { supabase, userId } = await getUser();
  const { error } = await supabase
    .from("book_reading_plans")
    .update({ status: "done" })
    .eq("user_id", userId)
    .eq("book_key", bookKey);
  if (error) throw error;
  revalidatePath("/books");
}

export async function resetReadingPlan(bookKey: string) {
  const { supabase, userId } = await getUser();
  // Delete logs first, then the plan
  await supabase
    .from("book_daily_logs")
    .delete()
    .eq("user_id", userId)
    .eq("book_key", bookKey);
  const { error } = await supabase
    .from("book_reading_plans")
    .delete()
    .eq("user_id", userId)
    .eq("book_key", bookKey);
  if (error) throw error;
  revalidatePath("/books");
}

export async function toggleDailyLog(bookKey: string, logDate: string, currentlyLogged: boolean) {
  const { supabase, userId } = await getUser();
  if (currentlyLogged) {
    await supabase
      .from("book_daily_logs")
      .delete()
      .eq("user_id", userId)
      .eq("book_key", bookKey)
      .eq("log_date", logDate);
  } else {
    await supabase
      .from("book_daily_logs")
      .insert({ user_id: userId, book_key: bookKey, log_date: logDate });
  }
  revalidatePath("/books");
}

export async function createCustomBook(input: CustomBookInput) {
  const { supabase, userId } = await getUser();
  const { error } = await supabase.from("custom_books").insert({
    user_id: userId,
    ...input,
  });
  if (error) throw error;
  revalidatePath("/books");
}

export async function updateCustomBook(id: string, input: CustomBookInput) {
  const { supabase, userId } = await getUser();
  const { error } = await supabase
    .from("custom_books")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/books");
}

export async function deleteCustomBook(id: string) {
  const { supabase, userId } = await getUser();
  // Clean up plans and logs that reference this custom book's UUID as book_key
  await supabase
    .from("book_daily_logs")
    .delete()
    .eq("user_id", userId)
    .eq("book_key", id);
  await supabase
    .from("book_reading_plans")
    .delete()
    .eq("user_id", userId)
    .eq("book_key", id);
  const { error } = await supabase
    .from("custom_books")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/books");
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/books/actions.ts
git commit -m "feat: add book tracker server actions"
```

---

## Task 5: BookCard + BooksStatsHeader Components

**Files:**
- Create: `src/components/books/book-card.tsx`
- Create: `src/components/books/books-stats-header.tsx`

- [ ] **Step 1: Create `src/components/books/book-card.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookStatus, BookWithStatus } from "@/lib/types";
import { tierClasses } from "@/lib/books-data";

interface BookCardProps {
  book: BookWithStatus;
  onStart: (book: BookWithStatus) => void;
  onMarkDone: (bookKey: string) => void;
  onReset: (bookKey: string) => void;
  onEdit?: (book: BookWithStatus) => void;
  onDelete?: (bookKey: string, customId: string) => void;
}

function StatusButton({
  status,
  onStart,
  onMarkDone,
  onReset,
}: {
  status: BookStatus;
  onStart: () => void;
  onMarkDone: () => void;
  onReset: () => void;
}) {
  if (status === "none") {
    return (
      <Button size="sm" variant="outline" className="text-xs" onClick={onStart}>
        ○ Start
      </Button>
    );
  }
  if (status === "progress") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-xs text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
        onClick={onMarkDone}
      >
        ⏳ Reading
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="border-green-500/40 bg-green-500/10 text-xs text-green-600 hover:bg-green-500/20 dark:text-green-400"
      onClick={onReset}
    >
      ✓ Done
    </Button>
  );
}

export function BookCard({ book, onStart, onMarkDone, onReset, onEdit, onDelete }: BookCardProps) {
  const pp20 = Math.ceil(book.pages / 20);
  const pp30 = Math.ceil(book.pages / 30);

  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      {book.isCustom && book.customId && (
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit?.(book)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs text-primary/70 hover:text-primary"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete?.(book.bookKey, book.customId!)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-xs text-destructive/70 hover:text-destructive"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-3 flex items-start gap-3">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tierClasses(book.tier)} text-xs font-bold text-white`}
        >
          #{book.rank}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {book.emoji} {book.title}
          </p>
          <p className="text-xs text-muted-foreground">{book.author}</p>
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{book.summary}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs text-primary">
          {book.category}
        </Badge>
        {book.isCustom && (
          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-xs text-green-600 dark:text-green-400">
            ✦ Added
          </Badge>
        )}
        <Badge variant="outline" className="text-xs text-muted-foreground">
          📄 {book.pages}p
        </Badge>
        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-xs text-blue-600 dark:text-blue-400">
          ⏱ {pp20}–{pp30} days
        </Badge>
        <div className="ml-auto">
          <StatusButton
            status={book.status}
            onStart={() => onStart(book)}
            onMarkDone={() => onMarkDone(book.bookKey)}
            onReset={() => onReset(book.bookKey)}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/books/books-stats-header.tsx`**

```tsx
interface BooksStatsHeaderProps {
  total: number;
  done: number;
  inProgress: number;
  custom: number;
}

export function BooksStatsHeader({ total, done, inProgress, custom }: BooksStatsHeaderProps) {
  const remaining = total - done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-indigo-950/40 via-violet-950/30 to-blue-950/40 p-5">
      <h1 className="text-xl font-bold text-foreground">
        📚 <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Reading Dashboard</span>
      </h1>
      <p className="mt-0.5 text-xs text-muted-foreground">
        SPJIMR Professional Growth Library · {total} books{custom > 0 ? ` · ${custom} manually added` : ""} · Ranked by career relevance
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { n: total, label: "Total" },
          { n: done, label: "Completed", color: "text-green-500" },
          { n: inProgress, label: "Reading", color: "text-amber-500" },
          { n: remaining, label: "Remaining" },
          { n: custom, label: "Added by You", color: "text-green-500" },
        ].map(({ n, label, color }) => (
          <div
            key={label}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <p className={`text-lg font-bold ${color ?? "text-violet-400"}`}>{n}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <p className="mb-1 text-[11px] text-muted-foreground">
          Overall progress · <span className="font-medium text-foreground">{pct}%</span>
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/books/book-card.tsx src/components/books/books-stats-header.tsx
git commit -m "feat: add BookCard and BooksStatsHeader components"
```

---

## Task 6: PacePlanDialog

**Files:**
- Create: `src/components/books/pace-plan-dialog.tsx`

- [ ] **Step 1: Create `src/components/books/pace-plan-dialog.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startReadingPlan } from "@/app/(app)/books/actions";
import { estimateDays } from "@/lib/books-data";
import type { BookWithStatus } from "@/lib/types";

interface PacePlanDialogProps {
  book: BookWithStatus | null;
  onClose: () => void;
}

const PACE_PRESETS = [20, 25, 30] as const;

export function PacePlanDialog({ book, onClose }: PacePlanDialogProps) {
  const [pagesPerDay, setPagesPerDay] = useState(25);
  const [customDays, setCustomDays] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!book) return null;

  const calcDays = estimateDays(book.pages, pagesPerDay);
  const targetDays = customDays && Number(customDays) > 0 ? Number(customDays) : calcDays;

  function handleStart() {
    startTransition(async () => {
      await startReadingPlan(book!.bookKey, pagesPerDay, targetDays);
      onClose();
    });
  }

  return (
    <Dialog open={!!book} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {book.emoji} {book.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{book.author} · {book.pages} pages</p>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Reading pace — pages per day
            </label>
            <input
              type="range"
              min={10}
              max={50}
              value={pagesPerDay}
              onChange={(e) => setPagesPerDay(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>10p</span><span>20p</span><span>30p</span><span>40p</span><span>50p</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PACE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPagesPerDay(p)}
                className={`rounded-lg border p-2 text-center transition-colors ${
                  pagesPerDay === p
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/50 hover:border-primary/40"
                }`}
              >
                <p className="text-base font-bold text-foreground">{p}</p>
                <p className="text-[9px] text-muted-foreground">pages/day</p>
                <p className={`text-[10px] font-semibold ${pagesPerDay === p ? "text-primary" : "text-muted-foreground"}`}>
                  {estimateDays(book.pages, p)} days
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2 text-center text-sm">
            At <span className="font-bold text-primary">{pagesPerDay}</span> pages/day →{" "}
            <span className="font-bold text-primary">{calcDays}</span> days to complete
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Override — set your own target days (optional)
            </label>
            <Input
              type="number"
              min={1}
              placeholder="Leave blank to use calculated days"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleStart} disabled={isPending}>
            {isPending ? "Starting…" : "📖 Begin Reading Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/books/pace-plan-dialog.tsx
git commit -m "feat: add PacePlanDialog component"
```

---

## Task 7: BookTracker

**Files:**
- Create: `src/components/books/book-tracker.tsx`

- [ ] **Step 1: Create `src/components/books/book-tracker.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { markBookDone, resetReadingPlan, toggleDailyLog } from "@/app/(app)/books/actions";
import { addDays, buildDailyPlan, fmtDate, tierClasses, todayISO } from "@/lib/books-data";
import type { BookWithStatus } from "@/lib/types";

interface BookTrackerProps {
  book: BookWithStatus;
  isOpen: boolean;
  onToggle: () => void;
}

export function BookTracker({ book, isOpen, onToggle }: BookTrackerProps) {
  const [isPending, startTransition] = useTransition();
  const plan = book.plan!;
  const today = todayISO();
  const dailyPlan = buildDailyPlan(book, plan.pages_per_day);

  let doneDays = 0;
  let missedDays = 0;
  dailyPlan.forEach((_, i) => {
    const d = addDays(plan.start_date, i);
    if (d < today) {
      if (book.loggedDates.includes(d)) doneDays++;
      else missedDays++;
    } else if (d === today && book.loggedDates.includes(d)) {
      doneDays++;
    }
  });

  const pagesRead = doneDays * plan.pages_per_day;
  const pct = Math.min(100, Math.round((pagesRead / book.pages) * 100));
  const origEnd = addDays(plan.start_date, dailyPlan.length - 1);
  const newEnd = addDays(origEnd, missedDays);
  const hasBL = missedDays > 0;

  return (
    <div className={`overflow-hidden rounded-lg border ${hasBL ? "border-amber-500/30" : "border-border"} bg-card`}>
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/30"
        onClick={onToggle}
      >
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tierClasses(book.tier)} text-xs font-bold text-white`}>
          #{book.rank}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{book.emoji} {book.title}</p>
          <p className="text-xs text-muted-foreground">
            {book.author} · {book.pages}p · {plan.pages_per_day}p/day · {dailyPlan.length} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-500">{pct}%</span>
          <div className="h-1 w-14 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-muted-foreground transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
            ⌄
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border">
          <div className="bg-muted/30 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { n: `${pagesRead}/${book.pages}`, label: "Pages Read (est.)", color: "text-primary" },
                { n: doneDays, label: "Days Done", color: "text-green-500" },
                { n: missedDays, label: "Days Missed", color: hasBL ? "text-destructive" : "text-muted-foreground" },
                { n: dailyPlan.length, label: "Total Days", color: "text-amber-500" },
              ].map(({ n, label, color }) => (
                <div key={label} className="rounded-lg border border-border bg-card px-3 py-2">
                  <p className={`text-base font-bold ${color}`}>{n}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <div className="mb-1 h-1 overflow-hidden rounded-full bg-border">
              <div className={`h-full rounded-full ${hasBL ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {pct}% complete · Target: {fmtDate(origEnd)}{hasBL ? " (original)" : ""}
            </p>

            {hasBL && (
              <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-400">
                ⚠️ <strong>{missedDays} day(s) behind</strong> — Revised completion:{" "}
                <strong>{fmtDate(newEnd)}</strong> (+{missedDays} day{missedDays !== 1 ? "s" : ""})
              </div>
            )}
          </div>

          <div className="p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Daily Reading Plan · {plan.pages_per_day} pages/day
            </p>
            <div className="flex flex-col gap-1.5">
              {dailyPlan.map((day, i) => {
                const dStr = addDays(plan.start_date, i);
                const isPast = dStr < today;
                const isToday = dStr === today;
                const isFuture = dStr > today;
                const isChecked = book.loggedDates.includes(dStr);
                const isMissed = isPast && !isChecked;

                return (
                  <div
                    key={dStr}
                    className={`flex items-start gap-2.5 rounded-lg border p-2 ${
                      isMissed
                        ? "border-destructive/30 bg-destructive/5"
                        : isToday
                        ? "border-amber-500/40 bg-amber-500/5"
                        : isPast && isChecked
                        ? "border-border opacity-60"
                        : "border-border opacity-55"
                    }`}
                  >
                    <button
                      disabled={isFuture || isPending}
                      onClick={() =>
                        startTransition(() => toggleDailyLog(book.bookKey, dStr, isChecked))
                      }
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-[1.5px] transition-colors ${
                        isChecked
                          ? "border-green-500 bg-green-500 text-white"
                          : isMissed
                          ? "border-destructive"
                          : "border-border"
                      } disabled:cursor-default`}
                    >
                      {isChecked && (
                        <svg width="10" height="8" viewBox="0 0 10 8">
                          <polyline points="1,4 3.5,7 9,1" fill="none" stroke="white" strokeWidth="1.8" />
                        </svg>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        {fmtDate(dStr)} · Day {i + 1}
                      </p>
                      <p className="text-xs text-foreground">
                        {day.titles.map((t, j) => `Ch.${day.chapterNums[j]}: ${t}`).join(" · ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        pp. {day.startPg}–{day.endPg} ({day.pages}p)
                      </p>
                    </div>

                    {isToday && <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">TODAY</span>}
                    {isMissed && <span className="rounded-full bg-destructive/20 px-1.5 py-0.5 text-[9px] font-bold text-destructive">MISSED</span>}
                    {isChecked && !isToday && <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-bold text-green-500">✓</span>}
                    {isFuture && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary/70">UPCOMING</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 border-t border-border px-4 py-3">
            <button
              disabled={isPending}
              onClick={() => startTransition(() => markBookDone(book.bookKey))}
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              ✓ Mark Completed
            </button>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => resetReadingPlan(book.bookKey))}
              className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-60"
            >
              Reset Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/books/book-tracker.tsx
git commit -m "feat: add BookTracker component with daily log checkboxes"
```

---

## Task 8: BookFormDialog

**Files:**
- Create: `src/components/books/book-form-dialog.tsx`

- [ ] **Step 1: Create `src/components/books/book-form-dialog.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCustomBook, updateCustomBook } from "@/app/(app)/books/actions";
import { BOOK_CATEGORIES, type BookWithStatus, type CustomBookInput } from "@/lib/types";

interface BookFormDialogProps {
  open: boolean;
  editing: BookWithStatus | null;
  onClose: () => void;
}

export function BookFormDialog({ open, editing, onClose }: BookFormDialogProps) {
  const [emoji, setEmoji] = useState(editing?.emoji ?? "📚");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [author, setAuthor] = useState(editing?.author ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [tier, setTier] = useState<1 | 2 | 3>(editing?.tier ?? 1);
  const [pages, setPages] = useState(editing?.pages?.toString() ?? "");
  const [summary, setSummary] = useState(editing?.summary ?? "");
  const [chapterInput, setChapterInput] = useState("");
  const [chapters, setChapters] = useState<string[]>(editing?.chapters ?? []);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setEmoji("📚"); setTitle(""); setAuthor(""); setCategory("");
    setTier(1); setPages(""); setSummary(""); setChapters([]); setError("");
    onClose();
  }

  function addChapter() {
    const v = chapterInput.trim();
    if (!v) return;
    setChapters((prev) => [...prev, v]);
    setChapterInput("");
  }

  function handleSave() {
    if (!title || !author || !category || !pages || !summary) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    const numPages = Number(pages);
    const finalChapters =
      chapters.length > 0
        ? chapters
        : Array.from({ length: Math.max(1, Math.round(numPages / 20)) }, (_, i) => `Chapter ${i + 1}`);

    const input: CustomBookInput = {
      emoji: emoji || "📚",
      title,
      author,
      category: category as CustomBookInput["category"],
      tier,
      pages: numPages,
      chapters: finalChapters,
      summary,
    };

    startTransition(async () => {
      if (editing?.customId) {
        await updateCustomBook(editing.customId, input);
      } else {
        await createCustomBook(input);
      }
      handleClose();
    });
  }

  const estDays = pages ? `${Math.ceil(Number(pages) / 20)}–${Math.ceil(Number(pages) / 30)} days` : "Set pages first";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "✏️ Edit Book" : "➕ Add Book Manually"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-[60px_1fr] gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Emoji</label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} className="text-center text-xl" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Good to Great" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Author *</label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Jim Collins" />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Select category —</option>
              {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Priority Tier *</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`flex-1 rounded-lg border p-2 text-center transition-colors ${
                    tier === t ? "border-primary bg-primary/10" : "border-border bg-muted/50"
                  }`}
                >
                  <p className="font-bold text-primary">{t}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {t === 1 ? "Must Read" : t === 2 ? "High Value" : "Supplementary"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total Pages *</label>
              <Input type="number" min={1} value={pages} onChange={(e) => setPages(e.target.value)} placeholder="e.g. 320" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Est. Days (auto)</label>
              <Input value={estDays} readOnly className="cursor-default text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Summary *</label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="2–3 lines about what this book covers and why it matters…"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Chapters <span className="font-normal normal-case text-muted-foreground">(optional — auto-generated if blank)</span>
            </label>
            <div className="mb-2 flex max-h-36 flex-col gap-1 overflow-y-auto">
              {chapters.map((c, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-border bg-muted/50 px-2 py-1">
                  <span className="w-8 text-[10px] text-muted-foreground">Ch.{i + 1}</span>
                  <span className="flex-1 text-xs">{c}</span>
                  <button onClick={() => setChapters((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-destructive/60 hover:text-destructive">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={chapterInput}
                onChange={(e) => setChapterInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChapter(); } }}
                placeholder="Chapter title…"
                className="flex-1 text-sm"
              />
              <button onClick={addChapter} className="rounded-md border border-primary bg-primary/10 px-3 text-xs text-primary hover:bg-primary/20">
                + Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : editing ? "✓ Save Changes" : "✓ Add Book"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/books/book-form-dialog.tsx
git commit -m "feat: add BookFormDialog for custom book add/edit"
```

---

## Task 9: BooksDashboard (Client Orchestrator)

**Files:**
- Create: `src/components/books/books-dashboard.tsx`

- [ ] **Step 1: Create `src/components/books/books-dashboard.tsx`**

```tsx
"use client";

import { useState, useTransition, useMemo } from "react";
import { deleteCustomBook } from "@/app/(app)/books/actions";
import { BookCard } from "./book-card";
import { BookTracker } from "./book-tracker";
import { BooksStatsHeader } from "./books-stats-header";
import { PacePlanDialog } from "./pace-plan-dialog";
import { BookFormDialog } from "./book-form-dialog";
import type { BookWithStatus } from "@/lib/types";

interface BooksDashboardProps {
  books: BookWithStatus[];
}

export function BooksDashboard({ books }: BooksDashboardProps) {
  const [search, setSearch] = useState("");
  const [activeTier, setActiveTier] = useState<"all" | "1" | "2" | "3">("all");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [paceBook, setPaceBook] = useState<BookWithStatus | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookWithStatus | null>(null);
  const [, startTransition] = useTransition();

  const categories = useMemo(() => {
    const cats = new Set(books.map((b) => b.category));
    return Array.from(cats).sort();
  }, [books]);

  const inProgress = books.filter((b) => b.status === "progress");
  const done = books.filter((b) => b.status === "done");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return books.filter((b) => {
      if (b.status === "progress" || b.status === "done") return false;
      if (activeTier !== "all" && String(b.tier) !== activeTier) return false;
      if (activeCat && b.category !== activeCat) return false;
      if (q && !b.title.toLowerCase().includes(q) && !b.author.toLowerCase().includes(q) && !b.category.toLowerCase().includes(q) && !b.summary.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [books, search, activeTier, activeCat]);

  const tier1 = filtered.filter((b) => b.tier === 1);
  const tier2 = filtered.filter((b) => b.tier === 2);
  const tier3 = filtered.filter((b) => b.tier === 3);

  function handleDelete(bookKey: string, customId: string) {
    if (!confirm("Remove this book from your dashboard?")) return;
    startTransition(() => deleteCustomBook(customId));
  }

  function openEdit(book: BookWithStatus) {
    setEditingBook(book);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <BooksStatsHeader
        total={books.length}
        done={done.length}
        inProgress={inProgress.length}
        custom={books.filter((b) => b.isCustom).length}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <input
          type="text"
          placeholder="🔍  Search title, author, topic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-40 flex-1 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <div className="flex gap-1">
          {(["all", "1", "2", "3"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setActiveTier(t); setActiveCat(null); }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${activeTier === t && !activeCat ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
            >
              {t === "all" ? "All" : `Tier ${t}`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(activeCat === c ? null : c)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${activeCat === c ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditingBook(null); setFormOpen(true); }}
          className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-500/20 dark:text-green-400"
        >
          ＋ Add Book
        </button>
      </div>

      {/* In progress panel */}
      {inProgress.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-500">⏳ Currently Reading</p>
          <div className="flex flex-col gap-2">
            {inProgress.map((book) => (
              <BookTracker
                key={book.bookKey}
                book={book}
                isOpen={expandedKey === book.bookKey}
                onToggle={() => setExpandedKey(expandedKey === book.bookKey ? null : book.bookKey)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed panel */}
      {done.length > 0 && (
        <div className="rounded-lg border border-green-500/25 bg-green-500/5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-green-500">✅ Completed</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {done.map((book) => (
              <BookCard
                key={book.bookKey}
                book={book}
                onStart={setPaceBook}
                onMarkDone={() => {}}
                onReset={() => startTransition(() => import("@/app/(app)/books/actions").then(a => a.resetReadingPlan(book.bookKey)))}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tier sections */}
      {[
        { label: "Tier 1 — Must Read", items: tier1 },
        { label: "Tier 2 — High Value", items: tier2 },
        { label: "Tier 3 — Supplementary", items: tier3 },
      ].map(({ label, items }) =>
        items.length > 0 ? (
          <div key={label}>
            <div className="mb-3 flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((book) => (
                <BookCard
                  key={book.bookKey}
                  book={book}
                  onStart={setPaceBook}
                  onMarkDone={(key) => startTransition(() => import("@/app/(app)/books/actions").then(a => a.markBookDone(key)))}
                  onReset={(key) => startTransition(() => import("@/app/(app)/books/actions").then(a => a.resetReadingPlan(key)))}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ) : null
      )}

      {tier1.length === 0 && tier2.length === 0 && tier3.length === 0 && inProgress.length === 0 && done.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">No books match your filters.</p>
      )}

      <PacePlanDialog book={paceBook} onClose={() => setPaceBook(null)} />
      <BookFormDialog open={formOpen} editing={editingBook} onClose={() => { setFormOpen(false); setEditingBook(null); }} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/books/books-dashboard.tsx
git commit -m "feat: add BooksDashboard client orchestrator"
```

---

## Task 10: Books Page + Nav Link

**Files:**
- Create: `src/app/(app)/books/page.tsx`
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Create `src/app/(app)/books/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BooksDashboard } from "@/components/books/books-dashboard";
import { createClient } from "@/lib/supabase/server";
import { fetchCustomBooks, fetchBookReadingPlans, fetchAllBookDailyLogs } from "@/lib/queries";
import { buildBooksWithStatus } from "@/lib/books-data";

export default async function BooksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [customBooks, plans, allLogs] = await Promise.all([
    fetchCustomBooks(supabase, user.id),
    fetchBookReadingPlans(supabase, user.id),
    fetchAllBookDailyLogs(supabase, user.id),
  ]);

  const books = buildBooksWithStatus(customBooks, plans, allLogs);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Books" }]} />
      <BooksDashboard books={books} />
    </div>
  );
}
```

- [ ] **Step 2: Read the home page to find where to add a Books card**

```bash
cat src/app/\(app\)/page.tsx
```

- [ ] **Step 3: Add a Books entry card to the home page**

In `src/app/(app)/page.tsx`, add a link/card to `/books` following the same pattern as existing home page cards (the exact placement depends on what you see in step 2 — add it alongside other navigation cards such as Industries, Readings, etc.).

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000/books` and confirm:
- Stats header renders with 29 total books, 0 done, 0 reading
- Tier 1/2/3 sections all show correct books
- Tier filter buttons (All / Tier 1 / Tier 2 / Tier 3) work
- Category filter buttons work
- Search filters by title/author/summary
- Clicking "○ Start" on any book opens the PacePlanDialog with the correct title and pace slider
- Setting a pace and clicking "Begin Reading Plan" creates a plan, book moves to "Currently Reading" panel
- Expanding a tracker shows daily plan with chapter breakdown
- Checking a day off toggles the checkbox (persists on refresh)
- "Mark Completed" moves book to Completed panel
- "Reset Plan" returns book to the unstarted grid
- "＋ Add Book" opens the form, filling and saving adds a custom book with a green "✦ Added" badge
- Edit/delete buttons appear on hover for custom books only

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/books/page.tsx src/app/\(app\)/page.tsx
git commit -m "feat: add /books page and home page entry card"
```
