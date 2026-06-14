import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: issues } = await supabase
    .from("magazine_issues")
    .select("file_id, source, file_name, toc_extracted_at")
    .order("toc_extracted_at", { ascending: false });

  const { count: articleCount } = await supabase
    .from("magazine_articles")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    ok: true,
    issueCount: issues?.length ?? 0,
    articleCount: articleCount ?? 0,
    issues,
  });
}
