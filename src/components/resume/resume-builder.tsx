"use client";

import { useState } from "react";
import { DownloadIcon, Loader2Icon, FileTextIcon, XIcon } from "lucide-react";

export function ResumeBuilder() {
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilename, setLastFilename] = useState<string | null>(null);

  async function handleGenerate() {
    if (!jdText.trim()) return;
    setLoading(true);
    setError(null);
    setLastFilename(null);

    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to generate resume");
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = nameMatch?.[1] ?? "Rahul_Agarwal_Resume.docx";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setLastFilename(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* JD input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Job Description</label>
          {jdText && (
            <button
              type="button"
              onClick={() => setJdText("")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3" /> Clear
            </button>
          )}
        </div>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the full job description here…"
          rows={14}
          className="w-full resize-none rounded-lg border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Paste the complete JD — role, responsibilities, requirements. More context = better bullet selection.
        </p>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!jdText.trim() || loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Reading master bank · Analysing JD · Matching bullets…
          </>
        ) : (
          <>
            <DownloadIcon className="size-4" />
            Generate & Download Resume
          </>
        )}
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {lastFilename && !loading && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <FileTextIcon className="size-4 shrink-0 text-primary" />
          Downloaded: <span className="font-medium text-foreground">{lastFilename}</span>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-xs font-semibold text-foreground mb-2">How it works</p>
        <ol className="flex flex-col gap-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Reads your master bank live from Google Drive (always latest version)</li>
          <li>Extracts keywords, role type, and core themes from the JD</li>
          <li>Selects the most relevant bullets from Parts A/B/C based on role track</li>
          <li>Generates a tailored DOCX matching your resume template</li>
        </ol>
      </div>
    </div>
  );
}
