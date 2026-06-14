"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setArticleReadStatus(articleId: string, isRead: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("magazine_articles")
    .update({ is_read: isRead, read_at: isRead ? new Date().toISOString() : null })
    .eq("id", articleId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/magazines");
}
