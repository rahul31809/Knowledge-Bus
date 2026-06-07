"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ENTRY_TYPES } from "@/lib/types";
import { createEntry, type EntryFormState } from "./actions";

const initialState: EntryFormState = { error: null };

function todayISO(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function EntryForm() {
  const [state, formAction, pending] = useActionState(createEntry, initialState);
  const [entryType, setEntryType] = useState<string>(ENTRY_TYPES[0].value);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="e.g. Carbon Markets — Weekly Study Notes" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="entry_type">Type</Label>
          <input type="hidden" name="entry_type" value={entryType} />
          <Select value={entryType} onValueChange={(value) => value && setEntryType(value)}>
            <SelectTrigger id="entry_type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="entry_date">Date</Label>
          <Input id="entry_date" name="entry_date" type="date" defaultValue={todayISO()} required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="source_routine">Source (optional)</Label>
          <Input id="source_routine" name="source_routine" placeholder="e.g. SPJIMR Weekly Study Notes" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subject_tags">Tags (comma-separated)</Label>
        <Input id="subject_tags" name="subject_tags" placeholder="e.g. carbon markets, policy, IEA" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="summary">Summary (optional)</Label>
        <Textarea
          id="summary"
          name="summary"
          rows={2}
          placeholder="One or two lines on the so-what — shows up in the browse list"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="body_html">Content</Label>
        <p className="text-xs text-neutral-500">
          Paste directly from your Gmail draft (formatting is preserved and sanitized) or plain text.
        </p>
        <Textarea
          id="body_html"
          name="body_html"
          rows={14}
          required
          className="font-mono text-xs"
          placeholder="Paste the routine output here…"
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </form>
  );
}
