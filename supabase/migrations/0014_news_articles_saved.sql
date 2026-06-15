alter table public.news_articles add column if not exists is_saved boolean not null default false;
