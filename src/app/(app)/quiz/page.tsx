import { Breadcrumbs } from "@/components/breadcrumbs";
import { QuizApp } from "@/components/quiz/quiz-app";
import { fetchDriveSubjectsByCategory } from "@/lib/drive-sync/client";

export default async function QuizPage() {
  const categories = (await fetchDriveSubjectsByCategory().catch(() => null)) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Quiz" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Quiz</h1>
        <p className="text-sm text-muted-foreground">
          Pick a term and subject, select session PPTs, set your difficulty mix, and get a fresh exam-style quiz every time.
        </p>
      </div>

      <QuizApp categories={categories.map((c) => ({ category: c.category, subjects: c.subjects.map((s) => s.name) }))} />
    </div>
  );
}
