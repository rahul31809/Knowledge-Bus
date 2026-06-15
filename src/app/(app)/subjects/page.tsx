import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubjectCard } from "@/components/subject-card";
import { fetchDriveSubjectsByCategory } from "@/lib/drive-sync/client";
import { fetchSubjects, withDriveOnlySubjects } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const { term } = await searchParams;
  const supabase = await createClient();

  const [subjects, categories] = await Promise.all([fetchSubjects(supabase), fetchDriveSubjectsByCategory()]);

  if (categories === null) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "MBA Study Materials" }]} />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">MBA Study Materials</h1>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Drive isn&apos;t configured, so term folders can&apos;t be loaded right now.
        </div>
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.category === term);

  if (activeCategory) {
    const termSubjectNames = new Set(activeCategory.subjects.map((s) => s.name));
    const termSubjects = withDriveOnlySubjects(subjects, activeCategory.subjects.map((s) => s.name)).filter((s) =>
      termSubjectNames.has(s.subject)
    );

    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "MBA Study Materials", href: "/subjects" },
            { label: activeCategory.category },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{activeCategory.category}</h1>
          <p className="text-sm text-muted-foreground">{plural(termSubjects.length, "subject")}</p>
        </div>

        {termSubjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No subjects yet in this term.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {termSubjects.map((subject) => (
              <SubjectCard key={subject.subject} subject={subject} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "MBA Study Materials" }]} />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">MBA Study Materials</h1>
        <p className="text-sm text-muted-foreground">Course materials organized by term</p>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No term folders found in Drive yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <Link
              key={category.category}
              href={`/subjects?term=${encodeURIComponent(category.category)}`}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground group-hover:underline">{category.category}</h3>
                <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {category.subjects.length > 0 ? plural(category.subjects.length, "subject") : "Coming soon"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
