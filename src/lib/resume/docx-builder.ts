import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
} from "docx";
import type { MatchedResume } from "./bullet-matcher";
import type { ParsedJD } from "./jd-parser";

function noBorder() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
}

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 20, font: "Calibri" })],
    shading: { type: ShadingType.SOLID, color: "D9D9D9" },
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 40 },
  });
}

function subHeader(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 19, font: "Calibri" })],
    spacing: { before: 60, after: 40 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 19, font: "Calibri" })],
    bullet: { level: 0 },
    spacing: { before: 20, after: 20 },
  });
}

function companyBlock(
  name: string,
  dates: string,
  subtitle: string,
  role: string
): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: name, bold: true, size: 20, font: "Calibri" }),
        new TextRun({ text: `  ${dates}`, size: 19, font: "Calibri" }),
      ],
      spacing: { before: 80, after: 20 },
    }),
    new Paragraph({
      children: [new TextRun({ text: subtitle, italics: true, size: 18, font: "Calibri" })],
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: [new TextRun({ text: role, bold: true, size: 19, font: "Calibri" })],
      spacing: { after: 40 },
    }),
  ];
}

export async function buildResumeDocx(
  matched: MatchedResume,
  jd: ParsedJD
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Rahul Agarwal", bold: true, size: 28, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "pgpm2026.rahul@spjimr.org  |  9927582289  |  ", size: 19, font: "Calibri" }),
        new TextRun({ text: "linkedin.com/in/rahul-agarwal-0703a9a3", size: 19, font: "Calibri", color: "1155CC" }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    })
  );

  // ── Career Summary ───────────────────────────────────────────────────────
  children.push(sectionHeader("Career Summary"));
  for (const b of matched.careerSummary) {
    children.push(bullet(b));
  }

  // ── Professional Summary ─────────────────────────────────────────────────
  children.push(sectionHeader("Professional Summary  8+ Years"));

  // Fourth Partner Energy
  children.push(
    ...companyBlock(
      "Fourth Partner Energy Pvt Ltd, Asset Management",
      "Jul 2021 – Jan 2025",
      "Backed by IFC, ADB, TPG; ₹1,652 Cr revenue; 1.5+ GW C&I renewable energy portfolio across 24 states; Hyderabad-based",
      "Zonal Manager (2021) → Regional Manager (2023)"
    )
  );

  for (const section of matched.fourthPartnerBullets) {
    children.push(subHeader(section.header));
    for (const b of section.bullets) {
      children.push(bullet(b));
    }
  }

  // CleanMax Solar
  children.push(
    ...companyBlock(
      "CleanMax Enviro Energy Solutions Ltd, Asset Management",
      "Jul 2017 – Jun 2021",
      "Brookfield-backed; $215M revenue; 2.5 GW C&I renewable energy portfolio; NSE-listed; Mumbai-based",
      "GET (2017) → Engineer (2018) → Senior Engineer (2020)"
    )
  );

  for (const section of matched.cleanmaxBullets) {
    children.push(subHeader(section.header));
    for (const b of section.bullets) {
      children.push(bullet(b));
    }
  }

  // ── Education ────────────────────────────────────────────────────────────
  children.push(sectionHeader("Education"));
  children.push(
    new Table({
      borders: noBorder(),
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "COURSE", bold: true, size: 19, font: "Calibri" })] })], borders: noBorder() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "INSTITUTE", bold: true, size: 19, font: "Calibri" })] })], borders: noBorder() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "YEAR", bold: true, size: 19, font: "Calibri" })] })], borders: noBorder() }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PGPM", size: 19, font: "Calibri" })] })], borders: noBorder() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "S.P. Jain Institute of Management & Research, Mumbai", size: 19, font: "Calibri" })] })], borders: noBorder() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "2025–2027", size: 19, font: "Calibri" })] })], borders: noBorder() }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "B.Tech, Mechanical Engineering (CGPA 3.10/4.0)", size: 19, font: "Calibri" })] })], borders: noBorder() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "UPES, Dehradun", size: 19, font: "Calibri" })] })], borders: noBorder() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "2013–2017", size: 19, font: "Calibri" })] })], borders: noBorder() }),
          ],
        }),
      ],
    })
  );

  // ── Live Projects ─────────────────────────────────────────────────────────
  children.push(sectionHeader("Academic Projects / Live Projects"));
  for (const p of matched.liveProjects) {
    children.push(bullet(p));
  }

  // ── Achievements ─────────────────────────────────────────────────────────
  children.push(sectionHeader("Achievements & Extra-Curricular"));
  for (const line of [
    "Placement Committee Course Coordinator, Operations & Supply Chain majors, SPJIMR (2025–2027)",
    "Lean Six Sigma Green Belt, KPMG (2026)",
    "Lean Six Sigma Yellow Belt, Cleanmax Solar (2021)",
    "Tools: Python, Tableau, Power BI, MS Excel (Advanced), Dynamics 365 ERP, SpotDraft",
  ]) {
    children.push(bullet(line));
  }

  // ── Tailored for note ────────────────────────────────────────────────────
  if (jd.companyName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Tailored for: ${jd.roleTitle}${jd.companyName ? ` at ${jd.companyName}` : ""}`,
            italics: true,
            size: 16,
            color: "888888",
            font: "Calibri",
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120 },
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 19 },
        },
      },
    },
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
