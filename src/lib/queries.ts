import type { createClient } from "@/lib/supabase/server";
import type { KnowledgeEntry } from "./types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface EntryFilters {
  query?: string;
  entryType?: string;
  tag?: string;
}

export async function fetchEntries(supabase: SupabaseServerClient, filters: EntryFilters = {}): Promise<KnowledgeEntry[]> {
  let request = supabase.from("knowledge_entries").select("*").order("entry_date", { ascending: false });

  const trimmedQuery = filters.query?.trim();
  if (trimmedQuery) {
    request = request.textSearch("search_vector", trimmedQuery, { type: "websearch", config: "english" });
  }
  if (filters.entryType) {
    request = request.eq("entry_type", filters.entryType);
  }
  if (filters.tag) {
    request = request.contains("subject_tags", [filters.tag]);
  }

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as KnowledgeEntry[];
}

export async function fetchEntryById(supabase: SupabaseServerClient, id: string): Promise<KnowledgeEntry | null> {
  const { data, error } = await supabase.from("knowledge_entries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as KnowledgeEntry | null;
}
