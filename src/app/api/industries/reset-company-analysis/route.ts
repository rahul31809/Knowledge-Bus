import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { industry_slug, subsector_slug, company_name } = (await request.json()) as {
      industry_slug?: string;
      subsector_slug?: string;
      company_name?: string;
    };
    if (!industry_slug || !subsector_slug || !company_name) {
      return NextResponse.json({ error: "Missing industry_slug, subsector_slug or company_name" }, { status: 400 });
    }

    const { error } = await supabase
      .from("company_analyses")
      .delete()
      .eq("industry_slug", industry_slug)
      .eq("subsector_slug", subsector_slug)
      .eq("company_name", company_name);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[reset-company-analysis]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
