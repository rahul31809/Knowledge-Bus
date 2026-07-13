"use client";

import { PrinterIcon } from "lucide-react";
import type { CompanyAnalysis } from "@/lib/types";

function mdToHtml(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, '<p class="h3">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="h2">$1</p>')
    .replace(/^# (.+)$/gm, '<p class="h1">$1</p>')
    .replace(/^[-•*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[^]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, "<br>");
}

function buildHtml(analysis: CompanyAnalysis): string {
  const all = [
    ...analysis.chunk_foundation.sections,
    ...analysis.chunk_market.sections,
    ...analysis.chunk_execution.sections,
    ...analysis.chunk_outlook.sections,
    ...analysis.chunk_strategy_prep.sections,
  ];

  const sections = all
    .map(
      (s) => `
    <div class="section">
      <div class="section-title">${s.title}</div>
      <div class="section-body">${mdToHtml(s.markdown)}</div>
    </div>`
    )
    .join("");

  const date = new Date(analysis.generated_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${analysis.company_name} — Tear-Sheet</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:8.5pt;color:#1e293b;background:#fff}
.header{padding:10px 14px 8px;border-bottom:2px solid #4f46e5;display:flex;align-items:baseline;gap:12px;margin-bottom:10px}
.header h1{font-size:14pt;font-weight:700;color:#1e293b}
.header span{font-size:8pt;color:#64748b}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:0 10px}
.section{border:1px solid #e2e8f0;border-radius:4px;padding:7px;break-inside:avoid}
.section-title{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#4f46e5;margin-bottom:4px}
.section-body{font-size:7.5pt;line-height:1.45;color:#334155}
.section-body ul{padding-left:11px;margin:2px 0}
.section-body li{margin:1px 0}
.section-body strong{font-weight:600;color:#0f172a}
.section-body code{font-family:monospace;background:#f1f5f9;padding:0 2px;border-radius:2px;font-size:7pt}
.section-body .h1,.section-body .h2,.section-body .h3{font-weight:600;color:#0f172a;margin:3px 0 2px}
.footer{margin-top:10px;padding:6px 14px;font-size:6.5pt;color:#94a3b8;border-top:1px solid #e2e8f0}
@media print{@page{size:A4 landscape;margin:.45in}}
</style>
</head>
<body>
<div class="header">
  <h1>${analysis.company_name}</h1>
  <span>Company Analysis · ${date}</span>
</div>
<div class="grid">${sections}</div>
<div class="footer">AI-generated — verify key figures before use in presentations or interviews · Knowledge Bus</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`;
}

export function TearSheetButton({ analysis }: { analysis: CompanyAnalysis }) {
  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildHtml(analysis));
    win.document.close();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      <PrinterIcon className="size-3.5" />
      Print Tear-Sheet
    </button>
  );
}
