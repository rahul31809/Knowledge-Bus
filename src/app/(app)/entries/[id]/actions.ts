"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sanitizeBodyHtml, htmlToPlainText } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import { ENTRY_TYPES, UNSORTED_LABEL, type EntryFormState, type EntryType } from "@/lib/types";

const ENTRY_TYPE_VALUES: string[] = ENTRY_TYPES.map((t) => t.value);

export async function updateEntry(_prevState: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const entryType = String(formData.get("entry_type") ?? "");
  const sourceRoutine = String(formData.get("source_routine") ?? "").trim();
  const tagsRaw = String(formData.get("subject_tags") ?? "");
  const subjectRaw = String(formData.get("subject") ?? "").trim();
  const sessionRaw = String(formData.get("session_label") ?? "").trim();
  const entryDate = String(formData.get("entry_date") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const bodyRaw = String(formData.get("body_html") ?? "");

  if (!id) return { error: "Missing entry id." };
  if (!title) return { error: "Title is required." };
  if (!ENTRY_TYPE_VALUES.includes(entryType)) return { error: "Choose a valid entry type." };
  if (!entryDate) return { error: "Entry date is required." };
  if (!bodyRaw.trim()) return { error: "Paste the content you want to save." };

  const subject_tags = Array.from(
    new Set(
      tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );

  const isStudyNotes = entryType === "study_notes";
  const subject = isStudyNotes && subjectRaw && subjectRaw !== UNSORTED_LABEL ? subjectRaw : null;
  const session_label = isStudyNotes && sessionRaw && sessionRaw !== UNSORTED_LABEL ? sessionRaw : null;

  const body_html = sanitizeBodyHtml(bodyRaw);
  const body_text = htmlToPlainText(bodyRaw);

  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_entries")
    .update({
      title,
      entry_type: entryType as EntryType,
      source_routine: sourceRoutine || null,
      subject_tags,
      subject,
      session_label,
      entry_date: entryDate,
      summary: summary || null,
      body_html,
      body_text,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/entries/${id}`);
  redirect(`/entries/${id}`);
}

export async function deleteEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_entries").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  redirect("/");
}
