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

// AI-generated industry/sub-sector primer — 10 structured sections rendered
// with charts, infographics and card grids (no HTML, plain data only).
export interface PrimerStat {
  label: string;
  value: string;
}

export interface PrimerOverview {
  summary: string;
  key_stats: PrimerStat[];
}

export interface PrimerTrendPoint {
  label: string;
  value: number;
}

export interface PrimerMarketSizeGrowth {
  current_size_label: string;
  cagr_label: string;
  trend_unit: string;
  historical_trend: PrimerTrendPoint[];
  commentary: string;
}

export interface PrimerDriver {
  title: string;
  description: string;
}

export interface PrimerFutureOutlook {
  projection_label: string;
  projected_cagr_label: string;
  trend_unit: string;
  comparison: PrimerTrendPoint[];
  drivers: PrimerDriver[];
}

export type ValueCapture = "high" | "medium" | "low";

export interface PrimerValueChainStage {
  name: string;
  description: string;
  value_capture: ValueCapture;
}

export interface PrimerValueChain {
  stages: PrimerValueChainStage[];
}

export interface PrimerPolicyItem {
  title: string;
  authority: string;
  year: string;
  description: string;
}

export interface PrimerPolicyRegulatory {
  items: PrimerPolicyItem[];
}

export type Maturity = "emerging" | "scaling" | "mainstream";

export interface PrimerTechTrend {
  title: string;
  description: string;
  maturity: Maturity;
}

export interface PrimerTechnologyTrends {
  trends: PrimerTechTrend[];
}

export type ImpactLevel = "high" | "medium" | "low";

export interface PrimerAiUseCase {
  title: string;
  description: string;
  impact: ImpactLevel;
}

export interface PrimerAiDigitalIntegration {
  use_cases: PrimerAiUseCase[];
}

export interface PrimerPlayer {
  name: string;
  origin: "Indian" | "Global";
  positioning: string;
}

export interface PrimerMajorPlayers {
  players: PrimerPlayer[];
}

export interface PrimerMetric {
  name: string;
  benchmark: string;
  description: string;
}

export interface PrimerKeyMetrics {
  metrics: PrimerMetric[];
}

export interface PrimerFramework {
  name: string;
  application: string;
}

export interface PrimerCaseTheme {
  title: string;
  description: string;
}

export interface PrimerConsultingLens {
  frameworks: PrimerFramework[];
  case_themes: PrimerCaseTheme[];
}

export interface IndustryPrimerContent {
  overview: PrimerOverview;
  market_size_growth: PrimerMarketSizeGrowth;
  future_outlook: PrimerFutureOutlook;
  value_chain: PrimerValueChain;
  policy_regulatory: PrimerPolicyRegulatory;
  technology_trends: PrimerTechnologyTrends;
  ai_digital_integration: PrimerAiDigitalIntegration;
  major_players: PrimerMajorPlayers;
  key_metrics: PrimerKeyMetrics;
  consulting_lens: PrimerConsultingLens;
}

export interface IndustryPrimer extends IndustryPrimerContent {
  id: string;
  industry_slug: string;
  subsector_slug: string;
  industry_name: string;
  subsector_name: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

// AI-generated 20-section deep-dive on a single company, reachable from an
// industry primer's Major Players list. Each section is free-form markdown
// (not structured fields like the primer) — the brief itself is a long-form
// consulting report, so markdown is the natural shape and avoids needing a
// bespoke schema per section.
export interface CompanyAnalysisSection {
  title: string;
  markdown: string;
}

export interface CompanyAnalysisChunk {
  sections: CompanyAnalysisSection[];
}

export interface CompanyAnalysisContent {
  chunk_foundation: CompanyAnalysisChunk;
  chunk_market: CompanyAnalysisChunk;
  chunk_execution: CompanyAnalysisChunk;
  chunk_outlook: CompanyAnalysisChunk;
  chunk_strategy_prep: CompanyAnalysisChunk;
}

export interface CompanyAnalysis extends CompanyAnalysisContent {
  id: string;
  industry_slug: string;
  subsector_slug: string;
  company_name: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface QaSource {
  uri: string;
  title: string;
}

export interface IndustryPrimerNote {
  id: string;
  industry_slug: string;
  subsector_slug: string;
  question: string;
  answer: string;
  sources: QaSource[];
  created_at: string;
}

export interface PrimerComparisonResult {
  synthesis: string;
  parameters: string[];
  rows: { player: string; values: string[] }[];
}

export interface FrameworkFactor {
  name: string;
  rating: "High" | "Medium" | "Low";
  description: string;
}

export interface FrameworkInsight {
  framework: string;
  summary: string;
  factors: FrameworkFactor[];
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

// Fixed taxonomy for magazine article categories — used to prompt Gemini for
// table-of-contents extraction, to normalize its output, and to order the
// category segments on the /magazines page.
export const MAGAZINE_SECTIONS = [
  "Strategy & Competition",
  "Management & Leadership",
  "Industries & Sectors",
  "Economics, Markets & Policy",
  "Technology & Innovation",
  "Careers & Management Lessons",
  "Other",
] as const;

export type MagazineSection = (typeof MAGAZINE_SECTIONS)[number];

export interface MagazineArticle {
  id: string;
  title: string;
  section: MagazineSection;
  isRead: boolean;
  webViewLink: string;
  issueLabel: string;
  source: string;
}

export interface MagazineCategoryGroup {
  section: MagazineSection;
  articles: MagazineArticle[];
}

export interface UpcomingSessionFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export interface UpcomingSession {
  eventDate: string;
  eventTitle: string;
  subject: string | null;
  sessionLabel: string | null;
  files: UpcomingSessionFile[];
}

export const NEWS_SECTIONS = [
  "Markets & Investing",
  "Business & Corporate Strategy",
  "Economy & Policy",
  "Energy & Infrastructure",
  "Valuation & Corporate Finance",
  "AI & Emerging Tech",
  "Other",
] as const;

export type NewsSection = (typeof NEWS_SECTIONS)[number];

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  summary: string;
  category: NewsSection;
  publishedAt: string | null;
  isRead: boolean;
  isSaved: boolean;
  isBookmarked: boolean;
}

export interface NewsCategoryGroup {
  section: NewsSection;
  articles: NewsArticle[];
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
