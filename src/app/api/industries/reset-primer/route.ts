import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { industry_slug, subsector_slug } = (await request.json()) as {
      industry_slug?: string;
      subsector_slug?: string;
    };
    if (!industry_slug || !subsector_slug) {
      return NextResponse.json({ error: "Missing industry_slug or subsector_slug" }, { status: 400 });
    }

    const { error } = await supabase
      .from("industry_primers")
      .delete()
      .eq("industry_slug", industry_slug)
      .eq("subsector_slug", subsector_slug);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[reset-primer]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
