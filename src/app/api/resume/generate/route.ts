import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readMasterBank } from "@/lib/resume/master-bank";
import { parseJD } from "@/lib/resume/jd-parser";
import { matchBullets } from "@/lib/resume/bullet-matcher";
import { buildResumeDocx } from "@/lib/resume/docx-builder";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jdText } = (await request.json()) as { jdText?: string };
    if (!jdText?.trim()) {
      return NextResponse.json({ error: "JD text is required" }, { status: 400 });
    }

    // Run master bank read and JD parse in parallel
    const [masterBank, jd] = await Promise.all([
      readMasterBank(),
      parseJD(jdText),
    ]);

    const matched = await matchBullets(masterBank, jd);
    const docxBuffer = await buildResumeDocx(matched, jd);

    const filename = jd.companyName
      ? `Rahul_Agarwal_Resume_${jd.companyName.replace(/\s+/g, "_")}.docx`
      : "Rahul_Agarwal_Resume.docx";

    return new NextResponse(docxBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[resume/generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
