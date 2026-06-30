import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { extractQuizSourceFiles, fetchSubjectDriveResources } from "@/lib/drive-sync/client";

export async function GET(request: Request) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subject = new URL(request.url).searchParams.get("subject");
  if (!subject) return NextResponse.json({ error: "Missing subject" }, { status: 400 });

  const drive = await fetchSubjectDriveResources(subject);
  if (drive.status !== "found") {
    return NextResponse.json({ files: [] });
  }

  const files = extractQuizSourceFiles(drive.files);
  return NextResponse.json({ files });
}
