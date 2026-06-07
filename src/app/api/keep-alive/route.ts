import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/health_check?select=ok`;
  const res = await fetch(url, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status }, { status: 502 });
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
