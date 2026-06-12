alter table public.drive_file_tags
  add column if not exists ai_summary text,
  add column if not exists summary_generated_at timestamptz;
