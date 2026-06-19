create table if not exists public.gmail_oauth_tokens (
  id text primary key default 'singleton',
  refresh_token text not null,
  email text,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS enabled with zero policies: this table holds a refresh token and must
-- only ever be touched by the service-role client (which bypasses RLS),
-- never by the cookie-based authenticated client used in pages/components.
alter table public.gmail_oauth_tokens enable row level security;

-- Safe, column-limited view for the UI to check connection status without
-- ever exposing the refresh_token to the client-side authenticated role.
create or replace view public.gmail_connection_status as
  select email, last_scanned_at, true as connected
  from public.gmail_oauth_tokens
  where id = 'singleton';

grant select on public.gmail_connection_status to authenticated;
