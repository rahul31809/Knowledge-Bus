import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResumeBuilder } from "@/components/resume/resume-builder";

export const metadata = { title: "Resume Builder" };

export default async function ResumePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Resume Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a JD — your master bank is read live from Drive, bullets are matched to the role, and a tailored DOCX downloads automatically.
        </p>
      </div>
      <ResumeBuilder />
    </div>
  );
}
