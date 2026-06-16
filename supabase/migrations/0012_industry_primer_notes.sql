-- Saved Q&A notes for industry primers. Each row is a question/answer pair
-- the user explicitly chose to keep from the "Ask About This Sub-Sector" box;
-- unsaved Q&A pairs are not persisted.

create table public.industry_primer_notes (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null,
  subsector_slug text not null,
  question text not null,
  answer text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.industry_primer_notes enable row level security;

drop policy if exists "Authenticated users can read industry primer notes" on public.industry_primer_notes;
create policy "Authenticated users can read industry primer notes"
  on public.industry_primer_notes for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert industry primer notes" on public.industry_primer_notes;
create policy "Authenticated users can insert industry primer notes"
  on public.industry_primer_notes for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can delete industry primer notes" on public.industry_primer_notes;
create policy "Authenticated users can delete industry primer notes"
  on public.industry_primer_notes for delete
  to authenticated
  using (true);
