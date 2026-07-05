import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCompanyAnalysis } from "@/lib/company-analysis/generator";
import { findSubsector } from "@/lib/industry-taxonomy";
import { fetchCompanyAnalysis, saveCompanyAnalysis } from "@/lib/queries";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const industrySlug = searchParams.get("industry");
    const subsectorSlug = searchParams.get("subsector");
    const companyName = searchParams.get("company");

    if (!industrySlug || !subsectorSlug || !companyName) {
      return NextResponse.json(
        { error: "Missing industry, subsector, or company" },
        { status: 400 }
      );
    }

    let analysis = await fetchCompanyAnalysis(supabase, industrySlug, subsectorSlug, companyName);

    if (!analysis) {
      const match = findSubsector(industrySlug, subsectorSlug);
      if (!match) {
        return NextResponse.json({ error: "Unknown industry or subsector" }, { status: 404 });
      }
      const content = await generateCompanyAnalysis(
        companyName,
        match.industry.name,
        match.subsector.name
      );
      analysis = await saveCompanyAnalysis(supabase, industrySlug, subsectorSlug, companyName, content);
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
