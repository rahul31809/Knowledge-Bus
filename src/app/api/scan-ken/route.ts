import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getMessageHtml, getStoredGmailToken, listKenMessages, updateLastScanned } from "@/lib/gmail/client";
import { extractKenArticles } from "@/lib/gmail/ken-extractor";
import { categorizeArticles } from "@/lib/news/categorizer";

export const maxDuration = 60;

const SOURCE_NAME = "The Ken";
const DEFAULT_LOOKBACK_DAYS = 7;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Called by cron or curl with the secret — allowed
  } else {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const stored = await getStoredGmailToken(supabase);
  if (!stored) {
    return NextResponse.json({
      ok: false,
      error: "Gmail not connected yet. Visit /api/auth/gmail/start while logged in to connect.",
    });
  }

  const afterDate = stored.last_scanned_at
    ? new Date(stored.last_scanned_at)
    : new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  let messages;
  try {
    messages = await listKenMessages(stored.refresh_token, afterDate);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed to list Gmail messages" }, { status: 500 });
  }

  if (messages.length === 0) {
    await updateLastScanned(supabase, new Date().toISOString());
    return NextResponse.json({ ok: true, scannedAt: new Date().toISOString(), messagesScanned: 0, categorized: 0 });
  }

  interface ParsedArticle {
    source: string;
    title: string;
    link: string;
    summary: string;
    publishedAt: string | null;
  }

  const allItems: ParsedArticle[] = [];
  let messageErrors = 0;

  for (const message of messages) {
    try {
      const html = await getMessageHtml(stored.refresh_token, message.id);
      if (!html) continue;
      const articles = await extractKenArticles(html);
      for (const article of articles) {
        allItems.push({
          source: SOURCE_NAME,
          title: article.title,
          link: article.url,
          summary: article.snippet.slice(0, 500),
          publishedAt: null,
        });
      }
    } catch {
      messageErrors += 1;
    }
  }

  await updateLastScanned(supabase, new Date().toISOString());

  if (allItems.length === 0) {
    return NextResponse.json({
      ok: true,
      scannedAt: new Date().toISOString(),
      messagesScanned: messages.length,
      categorized: 0,
      messageErrors,
    });
  }

  const { data: existing, error: existingError } = await supabase
    .from("news_articles")
    .select("link")
    .in("link", allItems.map((item) => item.link));

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }

  const existingLinks = new Set((existing ?? []).map((row) => row.link as string));
  const newItems = allItems.filter((item) => !existingLinks.has(item.link));

  let categorized = 0;

  if (newItems.length > 0) {
    const categories = await categorizeArticles(newItems.map((item) => ({ title: item.title, summary: item.summary })));

    const { error: insertError } = await supabase.from("news_articles").upsert(
      newItems.map((item, i) => ({
        source: item.source,
        title: item.title,
        link: item.link,
        summary: item.summary,
        published_at: item.publishedAt,
        category: categories[i] ?? "Other",
      })),
      { onConflict: "link", ignoreDuplicates: true }
    );

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    categorized = newItems.length;
  }

  return NextResponse.json({
    ok: true,
    scannedAt: new Date().toISOString(),
    messagesScanned: messages.length,
    categorized,
    messageErrors,
  });
}
