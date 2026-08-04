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
  LevelFormat,
  UnderlineType,
} from "docx";
import type { MatchedResume } from "./bullet-matcher";
import type { ParsedJD } from "./jd-parser";

const NAVY = "0D2840";
const NAVY_HEADER = "0E2841";
const GRAY_FILL = "D1D1D1";
const BLUE_FILL = "A3B5D9";
const FONT = "Times New Roman";

function noBorder() {
  const none = { style: BorderStyle.NONE, size: 0, color: "auto" };
  return {
    top: none,
    bottom: none,
    left: none,
    right: none,
    insideHorizontal: none,
    insideVertical: none,
  };
}

function sectionHeaderTable(text: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder(),
            shading: { type: ShadingType.CLEAR, color: "auto", fill: GRAY_FILL },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    bold: true,
                    font: FONT,
                    size: 18,
                    color: NAVY,
                  }),
                ],
                spacing: { before: 0, after: 0 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function companyTable(
  companyName: string,
  dates: string,
  subtitle: string,
  role: string
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder(),
            shading: { type: ShadingType.CLEAR, color: "auto", fill: BLUE_FILL },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: companyName, bold: true, font: FONT, size: 18, color: NAVY }),
                  new TextRun({ text: "      ", font: FONT, size: 18, color: NAVY }),
                  new TextRun({ text: dates, bold: true, font: FONT, size: 18, color: NAVY }),
                ],
                spacing: { before: 0, after: 0 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: subtitle, italics: true, font: FONT, size: 16, color: NAVY }),
                ],
                spacing: { before: 0, after: 0 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: role, font: FONT, size: 18, color: NAVY }),
                ],
                spacing: { before: 0, after: 0 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function subHeader(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        underline: { type: UnderlineType.SINGLE },
        font: FONT,
        size: 18,
        color: NAVY,
      }),
    ],
    spacing: { before: 80, after: 0 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 17, color: NAVY })],
    numbering: { reference: "resume-bullets", level: 0 },
    spacing: { before: 0, after: 0 },
  });
}

function educationRow(course: string, institute: string, year: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders: noBorder(),
        children: [new Paragraph({ children: [new TextRun({ text: course, font: FONT, size: 18, color: NAVY })] })],
      }),
      new TableCell({
        borders: noBorder(),
        children: [new Paragraph({ children: [new TextRun({ text: institute, font: FONT, size: 18, color: NAVY })] })],
      }),
      new TableCell({
        borders: noBorder(),
        children: [new Paragraph({ children: [new TextRun({ text: year, font: FONT, size: 18, color: NAVY })] })],
      }),
    ],
  });
}

export async function buildResumeDocx(
  matched: MatchedResume,
  jd: ParsedJD
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Rahul Agarwal",
          bold: true,
          font: FONT,
          size: 24,
          color: NAVY_HEADER,
        }),
      ],
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Email:", bold: true, font: FONT, size: 18, color: "000000" }),
        new TextRun({ text: " pgpm2026.rahul@spjimr.org", font: FONT, size: 18, color: "000000" }),
        new TextRun({ text: " | ", font: FONT, size: 18, color: "000000" }),
        new TextRun({ text: "Contact No:", bold: true, font: FONT, size: 18, color: "000000" }),
        new TextRun({ text: " 9927582289", font: FONT, size: 18, color: "000000" }),
        new TextRun({ text: " | ", font: FONT, size: 18, color: "000000" }),
        new TextRun({ text: "LinkedIn:", bold: true, font: FONT, size: 18, color: "000000" }),
        new TextRun({ text: " https://www.linkedin.com/in/rahul-agarwal-0703a9a3", font: FONT, size: 18, color: "1155CC" }),
      ],
      spacing: { before: 0, after: 60 },
    })
  );

  // ── Career Summary ───────────────────────────────────────────────────────
  children.push(sectionHeaderTable("Career Summary"));
  for (const b of matched.careerSummary) {
    children.push(bullet(b));
  }

  // ── Professional Summary ─────────────────────────────────────────────────
  children.push(sectionHeaderTable("Professional Summary  8+ Years"));

  // Fourth Partner Energy
  children.push(
    companyTable(
      "Fourth Partner Energy Pvt Ltd, Asset Management",
      "Jul 2021 – Jan 2025",
      "(Backed by IFC, ADB, TPG; ₹1,652 Cr revenue; 1.5+ GW C&I renewable energy portfolio across 24 states; Hyderabad-based)",
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
    companyTable(
      "CleanMax Enviro Energy Solutions Ltd, Asset Management",
      "Jul 2017 – Jun 2021",
      "(Brookfield-backed; $215M revenue; 2.5 GW C&I renewable energy portfolio; NSE-listed; Mumbai-based)",
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
  children.push(sectionHeaderTable("Education"));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorder(),
      rows: [
        new TableRow({
          children: [
            new TableCell({ borders: noBorder(), children: [new Paragraph({ children: [new TextRun({ text: "COURSE", bold: true, font: FONT, size: 18, color: NAVY })] })] }),
            new TableCell({ borders: noBorder(), children: [new Paragraph({ children: [new TextRun({ text: "INSTITUTE", bold: true, font: FONT, size: 18, color: NAVY })] })] }),
            new TableCell({ borders: noBorder(), children: [new Paragraph({ children: [new TextRun({ text: "YEAR", bold: true, font: FONT, size: 18, color: NAVY })] })] }),
          ],
        }),
        educationRow("PGPM", "S.P. Jain Institute of Management & Research, Mumbai", "2025–2027"),
        educationRow("B.Tech, Mechanical Engineering (CGPA 3.10/4.0)", "UPES, Dehradun", "2013–2017"),
      ],
    })
  );

  // ── Live Projects ─────────────────────────────────────────────────────────
  children.push(sectionHeaderTable("Academic Projects / Live Projects"));
  for (const p of matched.liveProjects) {
    children.push(bullet(p));
  }

  // ── Achievements ─────────────────────────────────────────────────────────
  children.push(sectionHeaderTable("Achievements & Extra-Curricular"));
  for (const line of [
    "Placement Committee Course Coordinator, Operations & Supply Chain majors, SPJIMR (2025–2027)",
    "Lean Six Sigma Green Belt, KPMG (2026)",
    "Lean Six Sigma Yellow Belt, Cleanmax Solar (2021)",
    "Tools: Python, Tableau, Power BI, MS Excel (Advanced), Dynamics 365 ERP, SpotDraft",
  ]) {
    children.push(bullet(line));
  }

  if (jd.companyName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Tailored for: ${jd.roleTitle}${jd.companyName ? ` at ${jd.companyName}` : ""}`,
            italics: true,
            size: 16,
            color: "888888",
            font: FONT,
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120 },
      })
    );
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "resume-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 360, hanging: 180 },
                },
                run: {
                  font: FONT,
                  color: NAVY,
                },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 18, color: NAVY },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
