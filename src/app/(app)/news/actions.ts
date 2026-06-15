"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setNewsArticleReadStatus(articleId: string, isRead: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("news_articles").update({ is_read: isRead }).eq("id", articleId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/news");
}
