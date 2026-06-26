"use client";

import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";

export function ResetCompanyAnalysisButton({
  industrySlug,
  subsectorSlug,
  companyName,
}: {
  industrySlug: string;
  subsectorSlug: string;
  companyName: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!confirm("Delete cached analysis and regenerate from scratch?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/industries/reset-company-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry_slug: industrySlug,
          subsector_slug: subsectorSlug,
          company_name: companyName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { error?: string })?.error ?? "Failed to reset");
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      <RefreshCwIcon className={`size-3 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Resetting…" : "Regenerate Analysis"}
    </button>
  );
}
