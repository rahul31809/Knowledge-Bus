import { Breadcrumbs } from "@/components/breadcrumbs";
import { QuizApp } from "@/components/quiz/quiz-app";
import { fetchDriveSubjectNames } from "@/lib/drive-sync/client";

export default async function QuizPage() {
  const subjects = (await fetchDriveSubjectNames().catch(() => null)) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Quiz" }]} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Quiz</h1>
        <p className="text-sm text-muted-foreground">
          Pick a subject and session PPTs, set your difficulty mix, and get a fresh exam-style quiz every time.
        </p>
      </div>

      <QuizApp subjects={[...subjects].sort((a, b) => a.localeCompare(b))} />
    </div>
  );
}
