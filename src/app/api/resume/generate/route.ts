import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readMasterBank } from "@/lib/resume/master-bank";
import { parseJD } from "@/lib/resume/jd-parser";
import { matchBullets } from "@/lib/resume/bullet-matcher";
import { buildResumeDocx } from "@/lib/resume/docx-builder";

export const maxDuration = 120;

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return text;
  }

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.files["word/document.xml"].async("string");
    const paragraphs = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)];
    return paragraphs
      .map((p) =>
        [...p[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("")
      )
      .filter(Boolean)
      .join("\n");
  }

  // Plain text fallback
  return new TextDecoder().decode(buffer);
}

async function getJdText(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("jdFile") as File | null;
    if (!file) throw new Error("No file uploaded");
    return extractTextFromFile(file);
  }

  const { jdText } = (await request.json()) as { jdText?: string };
  if (!jdText?.trim()) throw new Error("JD text is required");
  return jdText;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const jdText = await getJdText(request);

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
