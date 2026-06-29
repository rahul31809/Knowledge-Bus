import { google, gmail_v1, calendar_v3 } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";

// Calendar read access is requested in the same consent screen as Gmail —
// one refresh token then covers both APIs. Anyone who connected before this
// scope was added needs to reconnect once for Calendar access to apply;
// Google doesn't retroactively widen an already-issued refresh token's scope.
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function getOAuth2Client(redirectUri: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET not configured");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGmailAuthUrl(redirectUri: string): string {
  const oauth2Client = getOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });
}

export async function exchangeCodeForRefreshToken(
  code: string,
  redirectUri: string
): Promise<{ refreshToken: string; email: string | null }> {
  const oauth2Client = getOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token — try again and make sure to approve full access.");
  }

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return { refreshToken: tokens.refresh_token, email: data.email ?? null };
}

interface StoredToken {
  refresh_token: string;
  email: string | null;
  last_scanned_at: string | null;
}

export async function getStoredGmailToken(supabase: SupabaseClient): Promise<StoredToken | null> {
  const { data, error } = await supabase
    .from("gmail_oauth_tokens")
    .select("refresh_token, email, last_scanned_at")
    .eq("id", "singleton")
    .maybeSingle();

  if (error || !data) return null;
  return data as StoredToken;
}

export async function saveGmailToken(supabase: SupabaseClient, refreshToken: string, email: string | null): Promise<void> {
  const { error } = await supabase.from("gmail_oauth_tokens").upsert(
    { id: "singleton", refresh_token: refreshToken, email, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function updateLastScanned(supabase: SupabaseClient, when: string): Promise<void> {
  await supabase.from("gmail_oauth_tokens").update({ last_scanned_at: when }).eq("id", "singleton");
}

function getGmailClient(refreshToken: string): gmail_v1.Gmail {
  // redirectUri isn't needed for token refresh — pass empty string
  const oauth2Client = getOAuth2Client("");
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export interface KenMessageRef {
  id: string;
}

export async function listKenMessages(refreshToken: string, afterDate: Date): Promise<KenMessageRef[]> {
  const gmail = getGmailClient(refreshToken);
  const after = afterDate.toISOString().slice(0, 10).replace(/-/g, "/");
  const res = await gmail.users.messages.list({
    userId: "me",
    q: `from:info@the-ken.com after:${after}`,
    maxResults: 50,
  });
  return (res.data.messages ?? []).filter((m): m is { id: string } => Boolean(m.id));
}

function findHtmlPart(part: gmail_v1.Schema$MessagePart): string | null {
  if (part.mimeType === "text/html" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8");
  }
  for (const sub of part.parts ?? []) {
    const found = findHtmlPart(sub);
    if (found) return found;
  }
  return null;
}

export async function getMessageHtml(refreshToken: string, messageId: string): Promise<string | null> {
  const gmail = getGmailClient(refreshToken);
  const res = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  const payload = res.data.payload;
  if (!payload) return null;
  return findHtmlPart(payload);
}

function getCalendarClient(refreshToken: string): calendar_v3.Calendar {
  const oauth2Client = getOAuth2Client("");
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export interface CalendarEventSummary {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
}

// Lists events on the user's primary calendar starting from now through
// `daysAhead` days out. Used to find tomorrow's class sessions.
export async function listUpcomingEvents(refreshToken: string, daysAhead: number): Promise<CalendarEventSummary[]> {
  const calendar = getCalendarClient(refreshToken);
  const timeMin = new Date();
  const timeMax = new Date(timeMin.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  return (res.data.items ?? [])
    .filter((event): event is calendar_v3.Schema$Event & { id: string } => Boolean(event.id))
    .map((event) => ({
      id: event.id,
      title: event.summary ?? "(untitled event)",
      description: event.description ?? null,
      start: event.start?.dateTime ?? event.start?.date ?? null,
      end: event.end?.dateTime ?? event.end?.date ?? null,
    }));
}
