-- Visual redesign of industry primers: each of the 10 sections becomes
-- structured jsonb (charts, infographics, card grids) instead of HTML
-- strings. Cached primers from 0010 are in the old HTML format and are
-- regenerated on next visit, so the table is dropped and recreated.

drop table if exists public.industry_primers;

create table public.industry_primers (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null,
  subsector_slug text not null,
  industry_name text not null,
  subsector_name text not null,
  overview jsonb,
  market_size_growth jsonb,
  future_outlook jsonb,
  value_chain jsonb,
  policy_regulatory jsonb,
  technology_trends jsonb,
  ai_digital_integration jsonb,
  major_players jsonb,
  key_metrics jsonb,
  consulting_lens jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (industry_slug, subsector_slug)
);

drop trigger if exists industry_primers_set_updated_at on public.industry_primers;
create trigger industry_primers_set_updated_at
  before update on public.industry_primers
  for each row execute function public.set_updated_at();

alter table public.industry_primers enable row level security;

drop policy if exists "Authenticated users can read industry primers" on public.industry_primers;
create policy "Authenticated users can read industry primers"
  on public.industry_primers for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert industry primers" on public.industry_primers;
create policy "Authenticated users can insert industry primers"
  on public.industry_primers for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update industry primers" on public.industry_primers;
create policy "Authenticated users can update industry primers"
  on public.industry_primers for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete industry primers" on public.industry_primers;
create policy "Authenticated users can delete industry primers"
  on public.industry_primers for delete
  to authenticated
  using (true);
