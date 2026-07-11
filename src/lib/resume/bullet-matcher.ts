import { GoogleGenAI } from "@google/genai";
import type { ParsedJD } from "./jd-parser";

export interface MatchedResume {
  careerSummary: string[];
  fourthPartnerBullets: { header: string; bullets: string[] }[];
  cleanmaxBullets: { header: string; bullets: string[] }[];
  liveProjects: string[];
}

export async function matchBullets(
  masterBankText: string,
  jd: ParsedJD
): Promise<MatchedResume> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

  const trackInstruction = {
    strategy: "Prefer Part B bullets (strategy consulting register). Draw from Part A where Part B lacks coverage.",
    ops: "Prefer Part A bullets (operational fact base). Use Part B only where it adds framing without overstating.",
    digital: "Prefer Part A Section 2 (Digital & AI-led Transformation) and Part B Section B4 (Digital & Technology Strategy). Supplement with Part A operations.",
    gm: "Prefer Part C bullets (General Management register). Draw from Part A for operational specifics.",
  }[jd.track];

  const prompt = `You are a consulting resume expert. You have the candidate's master resume bank below and a parsed job description. Select and arrange the best bullets for a tailored one-page consulting resume.

ROLE: ${jd.roleTitle} at ${jd.companyName || "the company"}
TRACK: ${jd.track}
MUST-HAVE KEYWORDS: ${jd.mustHaveKeywords.join(", ")}
CORE THEMES: ${jd.coreThemes.join(", ")}
TRACK INSTRUCTION: ${trackInstruction}

MASTER BANK:
${masterBankText}

INSTRUCTIONS:
- Career Summary: Select 4 bullets from the existing Career Summary bullets in the template. Prefer bullets that match JD keywords. Return them verbatim — do NOT rewrite.
- Fourth Partner Energy: Select 3–4 sections with 3–4 bullets each. Each section must have a header (e.g. "COST TRANSFORMATION & PORTFOLIO STRATEGY"). Pull bullets verbatim from the bank.
- CleanMax Solar: Select 2–3 sections with 2–3 bullets each. Pull verbatim.
- Live Projects: Select 2–3 live project entries most relevant to the JD. Pull verbatim.

Return ONLY valid JSON:
{
  "careerSummary": ["bullet1", "bullet2", "bullet3", "bullet4"],
  "fourthPartnerBullets": [
    { "header": "SECTION HEADER", "bullets": ["bullet1", "bullet2", "bullet3"] }
  ],
  "cleanmaxBullets": [
    { "header": "SECTION HEADER", "bullets": ["bullet1", "bullet2"] }
  ],
  "liveProjects": ["project entry 1", "project entry 2"]
}`;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const text = result.text?.trim() ?? "{}";
  return JSON.parse(text) as MatchedResume;
}
