"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UNSORTED_LABEL, type SubjectProfileFormState } from "@/lib/types";

export async function upsertSubjectProfile(
  _prevState: SubjectProfileFormState,
  formData: FormData
): Promise<SubjectProfileFormState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();
  const courseOutline = String(formData.get("course_outline") ?? "").trim();
  const frameworks = String(formData.get("frameworks") ?? "").trim();
  const revisionHighlights = String(formData.get("revision_highlights") ?? "").trim();

  if (!subject || subject === UNSORTED_LABEL) return { error: "Missing subject." };

  const supabase = await createClient();
  const { error } = await supabase.from("subject_profiles").upsert({
    subject,
    overview: overview || null,
    course_outline: courseOutline || null,
    frameworks: frameworks || null,
    revision_highlights: revisionHighlights || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/subjects/${encodeURIComponent(subject)}`);
  redirect(`/subjects/${encodeURIComponent(subject)}`);
}
