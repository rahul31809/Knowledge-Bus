"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PrepStatus, QaSource } from "@/lib/types";

export async function updatePrepStatus(
  industrySlug: string,
  subsectorSlug: string,
  status: PrepStatus
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("industry_prep").upsert(
    { industry_slug: industrySlug, subsector_slug: subsectorSlug, status, updated_at: new Date().toISOString() },
    { onConflict: "industry_slug,subsector_slug" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/industries/${industrySlug}/${subsectorSlug}`);
  revalidatePath("/industries");
}

export async function saveQaNote(
  industrySlug: string,
  subsectorSlug: string,
  question: string,
  answer: string,
  sources: QaSource[]
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("industry_primer_notes")
    .insert({
      industry_slug: industrySlug,
      subsector_slug: subsectorSlug,
      question,
      answer,
      sources,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/industries/${industrySlug}/${subsectorSlug}`);
  return { id: data.id as string };
}

export async function deleteQaNote(id: string, industrySlug: string, subsectorSlug: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("industry_primer_notes").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/industries/${industrySlug}/${subsectorSlug}`);
}
