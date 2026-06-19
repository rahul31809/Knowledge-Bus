import { ChatWidget } from "@/components/assistant/chat-widget";
import { NavHeader } from "@/components/nav-header";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader userEmail={user?.email ?? null} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <ChatWidget />
    </div>
  );
}
