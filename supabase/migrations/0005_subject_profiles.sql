-- Subject-level profile info (course outline, frameworks, revision highlights).
-- One row per subject name — keyed by the same string stored in
-- knowledge_entries.subject. No FK: subjects are free-text, derived values.

create table if not exists public.subject_profiles (
  subject text primary key,
  overview text,
  course_outline text,
  frameworks text,
  revision_highlights text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists subject_profiles_set_updated_at on public.subject_profiles;
create trigger subject_profiles_set_updated_at
  before update on public.subject_profiles
  for each row execute function public.set_updated_at();

alter table public.subject_profiles enable row level security;

drop policy if exists "Authenticated users can read subject profiles" on public.subject_profiles;
create policy "Authenticated users can read subject profiles"
  on public.subject_profiles for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert subject profiles" on public.subject_profiles;
create policy "Authenticated users can insert subject profiles"
  on public.subject_profiles for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update subject profiles" on public.subject_profiles;
create policy "Authenticated users can update subject profiles"
  on public.subject_profiles for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete subject profiles" on public.subject_profiles;
create policy "Authenticated users can delete subject profiles"
  on public.subject_profiles for delete
  to authenticated
  using (true);
