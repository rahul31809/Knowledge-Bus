"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SubjectProfileFormState } from "@/lib/types";

const initialState: SubjectProfileFormState = { error: null };

export interface SubjectProfileFormDefaults {
  overview?: string | null;
  course_outline?: string | null;
  frameworks?: string | null;
  revision_highlights?: string | null;
}

interface SubjectProfileFormProps {
  subject: string;
  action: (state: SubjectProfileFormState, formData: FormData) => Promise<SubjectProfileFormState>;
  defaults?: SubjectProfileFormDefaults;
}

export function SubjectProfileForm({ subject, action, defaults }: SubjectProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="subject" value={subject} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="overview">Overview</Label>
        <p className="text-xs text-neutral-500">What this course is about and why it matters — a few lines.</p>
        <Textarea
          id="overview"
          name="overview"
          rows={3}
          defaultValue={defaults?.overview ?? ""}
          placeholder="e.g. Examines how strategic frameworks apply to real-world business transformation cases…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="course_outline">Course outline</Label>
        <p className="text-xs text-neutral-500">Topics, structure, evaluation — paste from the syllabus or summarize.</p>
        <Textarea
          id="course_outline"
          name="course_outline"
          rows={6}
          defaultValue={defaults?.course_outline ?? ""}
          className="font-mono text-xs"
          placeholder="e.g. Week 1: Foundations · Week 2: Five Forces · Week 3: VRIO …"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="frameworks">Important frameworks</Label>
        <p className="text-xs text-neutral-500">The recurring models worth knowing cold for exams and interviews.</p>
        <Textarea
          id="frameworks"
          name="frameworks"
          rows={5}
          defaultValue={defaults?.frameworks ?? ""}
          className="font-mono text-xs"
          placeholder="e.g. Porter's Five Forces — industry attractiveness; VRIO — sustainable advantage …"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="revision_highlights">Revision highlights</Label>
        <p className="text-xs text-neutral-500">The points you&apos;d want surfaced the night before an exam or interview.</p>
        <Textarea
          id="revision_highlights"
          name="revision_highlights"
          rows={5}
          defaultValue={defaults?.revision_highlights ?? ""}
          className="font-mono text-xs"
          placeholder="e.g. Industry vs firm effect on profitability — ~20% vs ~45% …"
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save subject info"}
        </Button>
      </div>
    </form>
  );
}
