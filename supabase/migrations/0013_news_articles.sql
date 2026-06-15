create table if not exists public.news_articles (
  id            uuid        primary key default gen_random_uuid(),
  source        text        not null,
  title         text        not null,
  link          text        not null unique,
  summary       text,
  published_at  timestamptz,
  category      text        not null default 'Other',
  is_read       boolean     not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists news_articles_category_idx on public.news_articles (category);
create index if not exists news_articles_published_at_idx on public.news_articles (published_at desc);

alter table public.news_articles enable row level security;

create policy "authenticated users can read news articles"
  on public.news_articles for select to authenticated using (true);

create policy "authenticated users can update news articles"
  on public.news_articles for update to authenticated using (true) with check (true);
