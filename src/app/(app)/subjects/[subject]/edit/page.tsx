import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectProfileForm } from "@/components/subject-profile-form";
import { fetchSessions, fetchSubjectProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { upsertSubjectProfile } from "./actions";

export default async function EditSubjectInfoPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectParam } = await params;
  const subject = decodeURIComponent(subjectParam);

  const supabase = await createClient();
  const [sessions, profile] = await Promise.all([
    fetchSessions(supabase, subject),
    fetchSubjectProfile(supabase, subject),
  ]);

  if (sessions.length === 0) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: subject, href: `/subjects/${encodeURIComponent(subject)}` },
          { label: "Edit info" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Subject info — {subject}</CardTitle>
          <CardDescription>
            Course-level context that sits above individual sessions: overview, outline, frameworks, revision
            highlights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectProfileForm
            subject={subject}
            action={upsertSubjectProfile}
            defaults={{
              overview: profile?.overview,
              course_outline: profile?.course_outline,
              frameworks: profile?.frameworks,
              revision_highlights: profile?.revision_highlights,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
