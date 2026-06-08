// Parses the "rolling Master Notes" doc convention: a single Google Doc per
// subject that gets appended to as lectures happen, with each lecture's notes
// introduced by a "SESSION <number>: <topic>" line.

export interface ParsedSessionBlock {
  sessionNumber: number;
  topic: string;
  bodyText: string;
}

const SESSION_HEADER_RE = /^SESSION\s+(\d+)\s*[:—-]\s*(.+?)\s*$/i;

export function parseSessionBlocks(docText: string): ParsedSessionBlock[] {
  const lines = docText.split(/\r?\n/);
  const blocks: ParsedSessionBlock[] = [];
  let current: { sessionNumber: number; topic: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const bodyText = current.lines.join("\n").trim();
    if (bodyText) {
      blocks.push({ sessionNumber: current.sessionNumber, topic: current.topic, bodyText });
    }
    current = null;
  };

  for (const rawLine of lines) {
    const headerMatch = rawLine.trim().match(SESSION_HEADER_RE);
    if (headerMatch) {
      flush();
      current = { sessionNumber: Number(headerMatch[1]), topic: headerMatch[2].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(rawLine);
  }
  flush();

  return blocks;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Drive's plain-text export has no markup — wrap paragraphs (blank-line
// separated) in <p> tags so the result is valid input for sanitizeBodyHtml.
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}
