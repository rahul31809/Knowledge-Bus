"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, MailCheckIcon } from "lucide-react";

export function SyncKenButton({ email }: { email: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan-ken");
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) throw new Error(data?.error ?? "Failed to sync");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <a
          href="/api/auth/gmail/start"
          title="Re-run Google consent — needed after adding a new scope like Calendar"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Reconnect
        </a>
        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          title={email ? `Connected as ${email}` : undefined}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <MailCheckIcon className="size-4 text-emerald-500" />}
          Sync The Ken
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
