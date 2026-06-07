"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { createClient } from "@/lib/supabase/server";
import { ENTRY_TYPES, type EntryType } from "@/lib/types";

export interface EntryFormState {
  error: string | null;
}

const ENTRY_TYPE_VALUES: string[] = ENTRY_TYPES.map((t) => t.value);

export async function createEntry(_prevState: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const entryType = String(formData.get("entry_type") ?? "");
  const sourceRoutine = String(formData.get("source_routine") ?? "").trim();
  const tagsRaw = String(formData.get("subject_tags") ?? "");
  const entryDate = String(formData.get("entry_date") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const bodyRaw = String(formData.get("body_html") ?? "");

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

  const body_html = DOMPurify.sanitize(bodyRaw);
  const body_text = DOMPurify.sanitize(bodyRaw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\s+/g, " ")
    .trim();

  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_entries").insert({
    title,
    entry_type: entryType as EntryType,
    source_routine: sourceRoutine || null,
    subject_tags,
    entry_date: entryDate,
    summary: summary || null,
    body_html,
    body_text,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
