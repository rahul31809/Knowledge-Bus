import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryForm } from "./entry-form";

export default function NewEntryPage() {
  return (
    <div className="mx-auto max-w-3xl">
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
          <EntryForm />
        </CardContent>
      </Card>
    </div>
  );
}
