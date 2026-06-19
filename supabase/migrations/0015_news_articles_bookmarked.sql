alter table public.news_articles add column if not exists is_bookmarked boolean not null default false;
