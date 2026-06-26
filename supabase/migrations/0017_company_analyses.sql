-- Per-company deep-dive analysis, generated on first visit from within an
-- industry primer's Major Players section. 20-section MBA/consulting-grade
-- report, stored as 5 jsonb chunks (each chunk = one parallel Gemini call,
-- each containing 4 sections of {title, markdown}) — mirrors the chunked
-- generation pattern used for company-news.

create table public.company_analyses (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null,
  subsector_slug text not null,
  company_name text not null,
  chunk_foundation jsonb,
  chunk_market jsonb,
  chunk_execution jsonb,
  chunk_outlook jsonb,
  chunk_strategy_prep jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (industry_slug, subsector_slug, company_name)
);

drop trigger if exists company_analyses_set_updated_at on public.company_analyses;
create trigger company_analyses_set_updated_at
  before update on public.company_analyses
  for each row execute function public.set_updated_at();

alter table public.company_analyses enable row level security;

drop policy if exists "Authenticated users can read company analyses" on public.company_analyses;
create policy "Authenticated users can read company analyses"
  on public.company_analyses for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert company analyses" on public.company_analyses;
create policy "Authenticated users can insert company analyses"
  on public.company_analyses for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update company analyses" on public.company_analyses;
create policy "Authenticated users can update company analyses"
  on public.company_analyses for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete company analyses" on public.company_analyses;
create policy "Authenticated users can delete company analyses"
  on public.company_analyses for delete
  to authenticated
  using (true);
