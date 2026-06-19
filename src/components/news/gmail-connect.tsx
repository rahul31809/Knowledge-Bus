import { MailIcon } from "lucide-react";
import type { GmailConnectionStatus } from "@/lib/queries";
import { SyncKenButton } from "./sync-ken-button";

export function GmailConnect({ status }: { status: GmailConnectionStatus }) {
  if (!status.connected) {
    return (
      <a
        href="/api/auth/gmail/start"
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
      >
        <MailIcon className="size-4" />
        Connect Gmail (The Ken)
      </a>
    );
  }

  return <SyncKenButton email={status.email} />;
}
