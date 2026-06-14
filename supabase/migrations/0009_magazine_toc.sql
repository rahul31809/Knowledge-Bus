create table if not exists public.magazine_issues (
  file_id             text        primary key,
  source              text        not null,
  file_name           text        not null,
  web_view_link       text        not null,
  drive_modified_time text,
  toc_extracted_at    timestamptz
);

create table if not exists public.magazine_articles (
  id            uuid        primary key default gen_random_uuid(),
  issue_file_id text        not null references public.magazine_issues(file_id) on delete cascade,
  title         text        not null,
  section       text        not null,
  order_index   int         not null default 0,
  is_read       boolean     not null default false,
  read_at       timestamptz
);

create index if not exists magazine_articles_section_idx
  on public.magazine_articles (section);

create index if not exists magazine_articles_issue_idx
  on public.magazine_articles (issue_file_id);

alter table public.magazine_issues enable row level security;
alter table public.magazine_articles enable row level security;

create policy "authenticated users can read magazine issues"
  on public.magazine_issues for select
  to authenticated
  using (true);

create policy "authenticated users can read magazine articles"
  on public.magazine_articles for select
  to authenticated
  using (true);

create policy "authenticated users can update magazine articles"
  on public.magazine_articles for update
  to authenticated
  using (true)
  with check (true);
