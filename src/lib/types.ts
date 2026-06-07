export const ENTRY_TYPES = [
  { value: "study_notes", label: "Study Notes" },
  { value: "industry_briefing", label: "Industry Briefing" },
  { value: "energy_scan", label: "Energy Scan" },
  { value: "ppt_notes", label: "PPT Notes" },
  { value: "other", label: "Other" },
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number]["value"];

export function entryTypeLabel(type: string): string {
  return ENTRY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  entry_type: EntryType;
  source_routine: string | null;
  subject_tags: string[];
  entry_date: string; // YYYY-MM-DD
  summary: string | null;
  body_html: string;
  body_text: string;
  created_at: string;
  updated_at: string;
}

export type KnowledgeEntryInput = Pick<
  KnowledgeEntry,
  "title" | "entry_type" | "source_routine" | "subject_tags" | "entry_date" | "summary" | "body_html" | "body_text"
>;
