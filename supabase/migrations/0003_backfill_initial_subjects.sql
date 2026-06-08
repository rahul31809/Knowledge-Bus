-- One-time backfill: file the 3 existing study-notes entries (cross-course
-- weekly digests, not single-course session notes) under one subject bucket
-- so they show up in Subjects instead of "Unsorted". Easy to re-file later
-- via the Edit page if a different grouping makes more sense.

update public.knowledge_entries set subject = 'PGPM — Week 1 Digests', session_label = 'Class Prep Briefing'
  where id = 'e49d62a7-6ea2-4e4c-8db0-efe856362f6a';

update public.knowledge_entries set subject = 'PGPM — Week 1 Digests', session_label = 'Energy Lens'
  where id = '3d5cbde2-ec8c-45b6-92f4-8919bdcf11c3';

update public.knowledge_entries set subject = 'PGPM — Week 1 Digests', session_label = 'Consulting Lens'
  where id = 'e3dfb2be-afb9-4d09-9bf5-67b883883319';
