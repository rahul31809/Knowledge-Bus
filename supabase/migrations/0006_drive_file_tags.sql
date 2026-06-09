create table if not exists public.drive_file_tags (
  file_id             text        primary key,
  subject             text        not null,
  file_name           text        not null,
  mime_type           text        not null,
  web_view_link       text        not null,
  tags                text[]      not null default '{}',
  drive_modified_time text,
  tagged_at           timestamptz not null default now()
);

create index if not exists drive_file_tags_subject_idx
  on public.drive_file_tags (subject);

-- GIN index for fast `tags @> ARRAY[...]` containment queries
create index if not exists drive_file_tags_tags_gin_idx
  on public.drive_file_tags using gin (tags);

alter table public.drive_file_tags enable row level security;

create policy "authenticated users can read drive file tags"
  on public.drive_file_tags for select
  to authenticated
  using (true);
