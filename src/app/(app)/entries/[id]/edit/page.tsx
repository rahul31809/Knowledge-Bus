import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryForm } from "@/components/entry-form";
import { fetchEntryById } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { updateEntry } from "../actions";

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const entry = await fetchEntryById(supabase, id);

  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Entry</CardTitle>
          <CardDescription>Update the details or content of &quot;{entry.title}&quot;.</CardDescription>
        </CardHeader>
        <CardContent>
          <EntryForm
            action={updateEntry}
            defaults={{
              id: entry.id,
              title: entry.title,
              entry_type: entry.entry_type,
              source_routine: entry.source_routine,
              subject_tags: entry.subject_tags,
              subject: entry.subject,
              session_label: entry.session_label,
              entry_date: entry.entry_date,
              summary: entry.summary,
              body_html: entry.body_html,
            }}
            submitLabel="Save changes"
            pendingLabel="Saving…"
          />
        </CardContent>
      </Card>
    </div>
  );
}
