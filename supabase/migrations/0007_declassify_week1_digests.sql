-- "PGPM — Week 1 Digests" was a one-time bucket (migration 0003) for 3
-- cross-course digest entries that don't belong to any single subject's
-- curriculum. Reclassify them out of entry_type = 'study_notes' so they stop
-- appearing as a "Subject" card on the home page and instead surface under
-- Reading & Briefings, where cross-course content belongs.

update public.knowledge_entries
set entry_type = 'industry_briefing', subject = null, session_label = null
where subject = 'PGPM — Week 1 Digests';

delete from public.subject_profiles where subject = 'PGPM — Week 1 Digests';
