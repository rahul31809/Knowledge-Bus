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
  subject: string | null;
  session_label: string | null;
  drive_file_id: string | null;
  drive_synced_at: string | null;
  entry_date: string; // YYYY-MM-DD
  summary: string | null;
  body_html: string;
  body_text: string;
  created_at: string;
  updated_at: string;
}

export type KnowledgeEntryInput = Pick<
  KnowledgeEntry,
  | "title"
  | "entry_type"
  | "source_routine"
  | "subject_tags"
  | "subject"
  | "session_label"
  | "entry_date"
  | "summary"
  | "body_html"
  | "body_text"
>;

export interface SubjectProfile {
  subject: string;
  overview: string | null;
  course_outline: string | null;
  frameworks: string | null;
  revision_highlights: string | null;
  created_at: string;
  updated_at: string;
}

export type SubjectProfileInput = Pick<
  SubjectProfile,
  "subject" | "overview" | "course_outline" | "frameworks" | "revision_highlights"
>;

export interface SubjectProfileFormState {
  error: string | null;
}

export interface DriveFileTag {
  file_id: string;
  subject: string;
  file_name: string;
  mime_type: string;
  web_view_link: string;
  tags: string[];
  drive_modified_time: string | null;
  tagged_at: string;
  ai_summary: string | null;
  summary_generated_at: string | null;
}

export const UNSORTED_LABEL = "Unsorted";

export interface EntryFormState {
  error: string | null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// entry_date is a plain "YYYY-MM-DD" string — parse the parts directly so the
// displayed date can't shift by a day under local-timezone conversion.
export function formatEntryDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
