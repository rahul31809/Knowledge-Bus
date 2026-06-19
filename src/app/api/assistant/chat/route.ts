import { GoogleGenAI, Type } from "@google/genai";
import type { Content, FunctionDeclaration } from "@google/genai";
import { NextResponse } from "next/server";
import { INDUSTRY_TAXONOMY } from "@/lib/industry-taxonomy";
import {
  fetchEntries,
  fetchEntriesBySession,
  fetchIndustryPrimer,
  fetchSessions,
  fetchSubjectProfile,
  fetchSubjects,
  searchMagazineArticles,
  searchNewsArticles,
  withDriveOnlySubjects,
} from "@/lib/queries";
import { fetchDriveSubjectNames, fetchSubjectDriveResources, type DriveFileGroup } from "@/lib/drive-sync/client";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_ITERATIONS = 6;

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "list_subjects",
    description: "List all MBA subjects/courses tracked in the Knowledge Base, with session and note counts.",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "list_sessions",
    description: "List all sessions recorded for a given MBA subject.",
    parameters: {
      type: Type.OBJECT,
      properties: { subject: { type: Type.STRING, description: "Exact subject name as returned by list_subjects" } },
      required: ["subject"],
    },
  },
  {
    name: "get_subject_overview",
    description: "Get the saved course overview, outline, frameworks and revision highlights for a subject.",
    parameters: {
      type: Type.OBJECT,
      properties: { subject: { type: Type.STRING } },
      required: ["subject"],
    },
  },
  {
    name: "get_session_notes",
    description: "Get the study notes saved for a specific subject + session.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        session: { type: Type.STRING, description: "Exact session label as returned by list_sessions" },
      },
      required: ["subject", "session"],
    },
  },
  {
    name: "find_pre_reads",
    description: "Find Google Drive pre-read files for a subject, optionally narrowed to one session.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        session: { type: Type.STRING, description: "Optional session label/number to narrow down to one session's pre-reads" },
      },
      required: ["subject"],
    },
  },
  {
    name: "search_news",
    description: "Search already-scraped current-affairs news articles (markets, business, economy, energy, AI, valuation) by keyword.",
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ["query"],
    },
  },
  {
    name: "search_industry_topics",
    description: "Fuzzy-search the industry/subsector taxonomy by keyword to find matching slugs. Call this before get_industry_overview.",
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ["query"],
    },
  },
  {
    name: "get_industry_overview",
    description: "Get the AI-generated industry primer overview (market size, key stats, major players) for an industry/subsector slug pair returned by search_industry_topics.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        industrySlug: { type: Type.STRING },
        subsectorSlug: { type: Type.STRING },
      },
      required: ["industrySlug", "subsectorSlug"],
    },
  },
  {
    name: "search_readings",
    description: "Search magazine articles and saved readings/briefings by keyword.",
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ["query"],
    },
  },
];

function extractNumber(s: string): number | null {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function summarizeGroup(g: DriveFileGroup) {
  return { folder: g.folderName, files: g.files.map((f) => ({ name: f.name, link: f.webViewLink })) };
}

async function findPreReads(subject: string, session?: string) {
  const lookup = await fetchSubjectDriveResources(subject);
  if (lookup.status === "unavailable") return { error: "Drive is not configured or unreachable right now." };
  if (lookup.status === "not_found") return { error: `No Drive folder found for subject "${subject}".` };

  const preReadGroups = lookup.files.filter((g) => {
    const name = g.folderName?.toLowerCase() ?? "";
    return name.includes("pre-read") || name.includes("pre read") || name.includes("preread");
  });

  if (preReadGroups.length === 0) {
    return { groups: [], note: "No Pre-Reads folder found for this subject in Drive." };
  }

  if (session) {
    const sessionNum = extractNumber(session);
    if (sessionNum !== null) {
      const matched = preReadGroups.filter((g) => extractNumber(g.folderName ?? "") === sessionNum);
      if (matched.length > 0) return { groups: matched.map(summarizeGroup) };
    }
    return {
      groups: preReadGroups.map(summarizeGroup),
      note: "Could not match a specific session by name — showing all pre-reads for this subject.",
    };
  }

  return { groups: preReadGroups.map(summarizeGroup) };
}

function searchIndustryTopics(query: string) {
  const q = query.toLowerCase();
  const matches: { industryName: string; subsectorName: string; industrySlug: string; subsectorSlug: string }[] = [];
  for (const industry of INDUSTRY_TAXONOMY) {
    for (const sub of industry.subsectors) {
      if (sub.name.toLowerCase().includes(q) || industry.name.toLowerCase().includes(q)) {
        matches.push({
          industryName: industry.name,
          subsectorName: sub.name,
          industrySlug: industry.slug,
          subsectorSlug: sub.slug,
        });
      }
    }
  }
  return matches.slice(0, 10);
}

async function executeTool(name: string, args: Record<string, unknown>, supabase: SupabaseServerClient): Promise<unknown> {
  try {
    switch (name) {
      case "list_subjects": {
        const [subjects, driveNames] = await Promise.all([
          fetchSubjects(supabase),
          fetchDriveSubjectNames().catch(() => null),
        ]);
        const merged = withDriveOnlySubjects(subjects, driveNames);
        return merged.map((s) => ({
          subject: s.subject,
          sessionCount: s.sessionCount,
          entryCount: s.entryCount,
          latestDate: s.latestDate,
          notesSynced: s.entryCount > 0,
        }));
      }
      case "list_sessions": {
        const subject = String(args.subject ?? "");
        const sessions = await fetchSessions(supabase, subject);
        if (sessions.length === 0) return { error: `No sessions found for subject "${subject}".` };
        return sessions.map((s) => ({ session: s.session_label, entryCount: s.entryCount, latestDate: s.latestDate }));
      }
      case "get_subject_overview": {
        const subject = String(args.subject ?? "");
        const profile = await fetchSubjectProfile(supabase, subject);
        if (!profile) return { error: `No saved overview for "${subject}" yet.` };
        return profile;
      }
      case "get_session_notes": {
        const subject = String(args.subject ?? "");
        const session = String(args.session ?? "");
        const entries = await fetchEntriesBySession(supabase, subject, session);
        if (entries.length === 0) return { error: `No study notes found for "${subject}" / "${session}".` };
        return entries.slice(0, 10).map((e) => ({
          title: e.title,
          date: e.entry_date,
          summary: (e.summary || e.body_text || "").slice(0, 400),
        }));
      }
      case "find_pre_reads": {
        const subject = String(args.subject ?? "");
        const session = args.session ? String(args.session) : undefined;
        return await findPreReads(subject, session);
      }
      case "search_news": {
        const query = String(args.query ?? "");
        const articles = await searchNewsArticles(supabase, query);
        if (articles.length === 0) return { error: `No news articles found for "${query}".` };
        return articles.slice(0, 8).map((a) => ({
          title: a.title,
          source: a.source,
          date: a.publishedAt,
          summary: a.summary.slice(0, 300),
          link: a.link,
          category: a.category,
        }));
      }
      case "search_industry_topics": {
        const query = String(args.query ?? "");
        const matches = searchIndustryTopics(query);
        if (matches.length === 0) return { error: `No industry/subsector matched "${query}".` };
        return matches;
      }
      case "get_industry_overview": {
        const industrySlug = String(args.industrySlug ?? "");
        const subsectorSlug = String(args.subsectorSlug ?? "");
        const primer = await fetchIndustryPrimer(supabase, industrySlug, subsectorSlug);
        if (!primer) return { error: "No primer generated yet for this subsector. Visit its page in the app to generate one." };
        return {
          industryName: primer.industry_name,
          subsectorName: primer.subsector_name,
          overview: primer.overview,
          marketSize: primer.market_size_growth,
          majorPlayers: primer.major_players?.players?.slice(0, 6),
        };
      }
      case "search_readings": {
        const query = String(args.query ?? "");
        const [magazines, entries] = await Promise.all([
          searchMagazineArticles(supabase, query),
          fetchEntries(supabase, { query, excludeType: "study_notes" }),
        ]);
        if (magazines.length === 0 && entries.length === 0) return { error: `No readings found for "${query}".` };
        return {
          magazineArticles: magazines.slice(0, 8).map((a) => ({ title: a.title, section: a.section, link: a.webViewLink, issue: a.issueLabel })),
          savedReadings: entries.slice(0, 8).map((e) => ({ title: e.title, type: e.entry_type, date: e.entry_date, summary: (e.summary || "").slice(0, 300) })),
        };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool execution failed" };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { messages?: ChatMessage[] };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUser = messages.filter((m) => m.role === "user").at(-1);
  if (!lastUser) return NextResponse.json({ error: "No message provided" }, { status: 400 });

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured" }, { status: 500 });

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().slice(0, 10);

  const systemInstruction = `You are an assistant embedded in Rahul's personal Knowledge Base app, built for his MBA (SPJIMR) studies and Big 4/Accenture Strategy consulting placement prep. Today's date is ${today}.

You have tools to look up real data already stored in this app:
- list_subjects / list_sessions / get_subject_overview / get_session_notes / find_pre_reads — MBA Study Materials (subjects, sessions, course overviews, study notes, Drive pre-read files)
- search_news — already-scraped current-affairs news articles
- search_industry_topics then get_industry_overview — AI-generated industry/subsector primers (always call search_industry_topics first to get the correct slug pair)
- search_readings — magazine articles and saved readings/briefings

Rules:
- Always call a tool before answering questions about app content — never guess or invent what's "in" the app.
- If the user names a specific subject/session/topic, try the most direct tool first (e.g. find_pre_reads or get_session_notes) using the name as given — don't first check list_subjects and refuse if it's not an exact match there. list_subjects only reflects subjects with synced study notes plus Drive folder names it could detect; a subject can still be valid in Drive even if absent or differently capitalized there. Only fall back to suggesting alternatives if the direct tool itself returns "not_found" or an error.
- If a tool returns an error or no results, say so plainly. Don't make up subjects, sessions, articles, files, or primers that weren't returned by a tool.
- When citing an internal page, format as a markdown link using these URL patterns:
  - Subject page: /subjects/<subject>
  - Session page: /subjects/<subject>/<session>
  - Industry primer page: /industries/<industrySlug>/<subsectorSlug>
- For news articles, magazine articles, and Drive files, link directly to the "link"/"webViewLink" field a tool returned (external link).
- Be concise. Lead with the direct answer, not background. Use bullet points when listing multiple items.
- If asked something with no relevant tool (general knowledge, advice, brainstorming), answer directly and naturally without forcing a tool call.`;

  let contents: Content[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents,
      config: { systemInstruction, tools: [{ functionDeclarations: TOOL_DECLARATIONS }] },
    });

    const calls = result.functionCalls;
    if (!calls || calls.length === 0) {
      const text = (result.text ?? "").trim();
      return NextResponse.json({ answer: text || "I couldn't generate a response — try rephrasing." });
    }

    const modelTurn: Content = result.candidates?.[0]?.content ?? {
      role: "model",
      parts: calls.map((c) => ({ functionCall: c })),
    };
    contents = [...contents, modelTurn];

    const responseParts = [];
    for (const call of calls) {
      const output = await executeTool(call.name ?? "", call.args ?? {}, supabase);
      responseParts.push({ functionResponse: { name: call.name, response: { output } } });
    }
    contents = [...contents, { role: "user", parts: responseParts }];
  }

  return NextResponse.json({ answer: "This is taking more steps than expected — try asking something more specific." });
}
