-- Track entries that were auto-created/updated from a synced Google Drive doc,
-- so manual entries and Drive-synced entries can coexist without colliding.
-- drive_file_id + session_label is the natural key the sync job upserts on:
-- one Master Notes doc covers many sessions, appended to over time.

alter table public.knowledge_entries
  add column if not exists drive_file_id text,
  add column if not exists drive_synced_at timestamptz;

create unique index if not exists knowledge_entries_drive_session_idx
  on public.knowledge_entries (drive_file_id, session_label)
  where drive_file_id is not null;
