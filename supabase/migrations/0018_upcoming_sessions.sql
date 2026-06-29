create table if not exists public.upcoming_sessions (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  event_title text not null,
  subject text,
  session_label text,
  files jsonb not null default '[]'::jsonb,
  matched_at timestamptz not null default now()
);

create index if not exists upcoming_sessions_event_date_idx on public.upcoming_sessions (event_date);

-- Only the daily cron (service-role client) writes this table; the
-- dashboard just reads it.
alter table public.upcoming_sessions enable row level security;

create policy "Allow read for authenticated" on public.upcoming_sessions
  for select to authenticated using (true);
