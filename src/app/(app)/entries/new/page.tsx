import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EntryForm } from "@/components/entry-form";
import { createEntry } from "./actions";

export default function NewEntryPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Add Entry" }]} />

      <Card>
        <CardHeader>
          <CardTitle>Add Entry</CardTitle>
          <CardDescription>
            Save a routine output (Weekly Study Notes, Industry Briefing, Energy Scan, PPT Notes) or any other note to
            your knowledge base. Paste the HTML straight from your Gmail draft — it&apos;ll be cleaned up and made
            searchable automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EntryForm action={createEntry} submitLabel="Save entry" pendingLabel="Saving…" />
        </CardContent>
      </Card>
    </div>
  );
}
