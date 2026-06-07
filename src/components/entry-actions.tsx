"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface EntryActionsProps {
  entryId: string;
  title: string;
  onDelete: () => Promise<void>;
}

export function EntryActions({ entryId, title, onDelete }: EntryActionsProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await onDelete();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/entries/${entryId}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Edit
      </Link>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}>Delete</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              &quot;{title}&quot; will be permanently removed from your knowledge base. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
