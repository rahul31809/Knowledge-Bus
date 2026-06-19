import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { exchangeCodeForRefreshToken, saveGmailToken } from "@/lib/gmail/client";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/news?gmail=error&reason=${encodeURIComponent(error ?? "no_code")}`, request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.redirect(new URL("/news?gmail=error&reason=supabase_not_configured", request.url));
  }

  try {
    const redirectUri = new URL("/api/auth/gmail/callback", request.url).toString();
    const { refreshToken, email } = await exchangeCodeForRefreshToken(code, redirectUri);

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    await saveGmailToken(supabase, refreshToken, email);

    return NextResponse.redirect(new URL("/news?gmail=connected", request.url));
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(new URL(`/news?gmail=error&reason=${encodeURIComponent(reason)}`, request.url));
  }
}
