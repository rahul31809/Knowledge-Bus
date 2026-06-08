-- Add Subject -> Session structure for study notes
-- Subjects and sessions are derived from distinct values on these columns —
-- no separate tables needed for a single-user app at this scale.

alter table public.knowledge_entries
  add column if not exists subject text,
  add column if not exists session_label text;

create index if not exists knowledge_entries_subject_idx
  on public.knowledge_entries (subject);

create index if not exists knowledge_entries_subject_session_idx
  on public.knowledge_entries (subject, session_label);

-- Include subject/session in full-text search alongside subject_tags
create or replace function public.knowledge_entries_search_vector_trigger()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.subject, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.session_label, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.subject_tags, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.body_text, '')), 'C');
  return new;
end;
$$ language plpgsql;

-- Re-run the trigger over existing rows so search_vector picks up the new fields,
-- without bumping updated_at on every row
alter table public.knowledge_entries disable trigger knowledge_entries_set_updated_at;
update public.knowledge_entries set updated_at = updated_at;
alter table public.knowledge_entries enable trigger knowledge_entries_set_updated_at;
