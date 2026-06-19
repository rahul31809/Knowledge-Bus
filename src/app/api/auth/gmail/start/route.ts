import { NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/gmail/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const redirectUri = new URL("/api/auth/gmail/callback", request.url).toString();
  const authUrl = getGmailAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
