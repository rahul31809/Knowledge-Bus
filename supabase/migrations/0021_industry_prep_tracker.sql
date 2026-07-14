-- Tracks per-user readiness status for each industry sub-sector.
-- status: 'not_started' | 'familiar' | 'case_ready'

create table public.industry_prep (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null,
  subsector_slug text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'familiar', 'case_ready')),
  updated_at timestamptz not null default now(),
  unique (industry_slug, subsector_slug)
);

alter table public.industry_prep enable row level security;

drop policy if exists "Authenticated users can read industry prep" on public.industry_prep;
create policy "Authenticated users can read industry prep"
  on public.industry_prep for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can upsert industry prep" on public.industry_prep;
create policy "Authenticated users can upsert industry prep"
  on public.industry_prep for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update industry prep" on public.industry_prep;
create policy "Authenticated users can update industry prep"
  on public.industry_prep for update
  to authenticated
  using (true);
