-- AI-generated industry/sub-sector primers for the Industries section.
-- One row per (industry_slug, subsector_slug) pair from src/lib/industry-taxonomy.ts.
-- Generated on first visit via Gemini, then cached here.

create table if not exists public.industry_primers (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null,
  subsector_slug text not null,
  industry_name text not null,
  subsector_name text not null,
  overview text,
  market_size_growth text,
  future_outlook text,
  value_chain text,
  policy_regulatory text,
  technology_trends text,
  ai_digital_integration text,
  major_players text,
  key_metrics text,
  consulting_lens text,
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
