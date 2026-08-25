"use client";

import { useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SyncNowButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/match-sessions");
      const data = await res.json();
      if (data.ok) {
        setState("done");
        setMessage(`Synced ${(data.matched ?? []).length} sessions`);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setState("error");
        setMessage(data.error ?? "Sync failed");
      }
    } catch {
      setState("error");
      setMessage("Network error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={state === "loading"}
        className="gap-1.5"
      >
        <RefreshCwIcon className={`size-3.5 ${state === "loading" ? "animate-spin" : ""}`} />
        {state === "loading" ? "Syncing…" : "Sync Now"}
      </Button>
      {message ? (
        <span className={`text-xs ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
