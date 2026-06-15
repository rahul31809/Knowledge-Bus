import Parser from "rss-parser";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { NEWS_SOURCES } from "@/lib/news/sources";
import { categorizeArticles } from "@/lib/news/categorizer";
import { htmlToPlainText } from "@/lib/sanitize";

export const maxDuration = 60;

type NewsFeedItem = { description?: string };

interface ParsedArticle {
  source: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
}

interface SourceResult {
  source: string;
  fetched: number;
  new: number;
  error?: string;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Called by cron or curl with the secret — allowed
  } else {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const parser = new Parser<Record<string, unknown>, NewsFeedItem>({
    customFields: { item: ["description"] },
  });

  const perSource: SourceResult[] = [];
  const allItems: ParsedArticle[] = [];

  await Promise.all(
    NEWS_SOURCES.map(async ({ name, feedUrl }) => {
      try {
        const feed = await parser.parseURL(feedUrl);
        const items = (feed.items ?? [])
          .filter((item) => item.link && item.title)
          .map((item) => ({
            source: name,
            title: item.title!.trim(),
            link: item.link!.trim(),
            summary: htmlToPlainText(item.description ?? item.contentSnippet ?? "").slice(0, 500),
            publishedAt: item.isoDate ?? null,
          }));

        perSource.push({ source: name, fetched: items.length, new: 0 });
        allItems.push(...items);
      } catch (err) {
        perSource.push({
          source: name,
          fetched: 0,
          new: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  if (allItems.length === 0) {
    return NextResponse.json({
      ok: true,
      scannedAt: new Date().toISOString(),
      perSource,
      categorized: 0,
      errors: perSource.filter((r) => r.error).length,
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
    const categories = await categorizeArticles(
      newItems.map((item) => ({ title: item.title, summary: item.summary }))
    );

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

    const newLinks = new Set(newItems.map((item) => item.link));
    for (const result of perSource) {
      result.new = allItems.filter((item) => item.source === result.source && newLinks.has(item.link)).length;
    }
  }

  return NextResponse.json({
    ok: true,
    scannedAt: new Date().toISOString(),
    perSource,
    categorized,
    errors: perSource.filter((r) => r.error).length,
  });
}
