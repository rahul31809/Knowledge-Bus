-- Knowledge Base — initial schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push`) on a fresh project.
-- Safe to re-run: drops and recreates the table.

create extension if not exists "pgcrypto";

drop table if exists public.knowledge_entries cascade;

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  entry_type text not null check (entry_type in ('study_notes', 'industry_briefing', 'energy_scan', 'ppt_notes', 'other')),
  source_routine text,
  subject_tags text[] not null default '{}',
  entry_date date not null default current_date,
  summary text,
  body_html text not null,
  body_text text not null default '',
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_entries_search_idx on public.knowledge_entries using gin (search_vector);
create index knowledge_entries_tags_idx on public.knowledge_entries using gin (subject_tags);
create index knowledge_entries_type_idx on public.knowledge_entries (entry_type);
create index knowledge_entries_date_idx on public.knowledge_entries (entry_date desc);

-- Populate search_vector via trigger (to_tsvector isn't IMMUTABLE, so it can't be
-- used in a generated column — a BEFORE INSERT/UPDATE trigger is the standard fix)
create or replace function public.knowledge_entries_search_vector_trigger()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.subject_tags, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.body_text, '')), 'C');
  return new;
end;
$$ language plpgsql;

drop trigger if exists knowledge_entries_search_vector_update on public.knowledge_entries;
create trigger knowledge_entries_search_vector_update
  before insert or update on public.knowledge_entries
  for each row execute function public.knowledge_entries_search_vector_trigger();

-- Keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists knowledge_entries_set_updated_at on public.knowledge_entries;
create trigger knowledge_entries_set_updated_at
  before update on public.knowledge_entries
  for each row execute function public.set_updated_at();

-- Row Level Security: this is a single-user app — only an authenticated user may read/write
alter table public.knowledge_entries enable row level security;

drop policy if exists "Authenticated users can read entries" on public.knowledge_entries;
create policy "Authenticated users can read entries"
  on public.knowledge_entries for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert entries" on public.knowledge_entries;
create policy "Authenticated users can insert entries"
  on public.knowledge_entries for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update entries" on public.knowledge_entries;
create policy "Authenticated users can update entries"
  on public.knowledge_entries for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete entries" on public.knowledge_entries;
create policy "Authenticated users can delete entries"
  on public.knowledge_entries for delete
  to authenticated
  using (true);

-- Lightweight health-check view for the keep-alive ping (Step 9)
create or replace view public.health_check as select 1 as ok;
