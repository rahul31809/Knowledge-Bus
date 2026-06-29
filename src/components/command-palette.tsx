"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkIcon,
  Building2Icon,
  FilePlusIcon,
  GraduationCapIcon,
  NewspaperIcon,
  RssIcon,
  SearchIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { INDUSTRY_TAXONOMY } from "@/lib/industry-taxonomy";

const SECTIONS = [
  { label: "Home", href: "/", icon: SearchIcon },
  { label: "Subjects", href: "/subjects", icon: GraduationCapIcon },
  { label: "Industries", href: "/industries", icon: Building2Icon },
  { label: "Articles (Magazines)", href: "/magazines", icon: NewspaperIcon },
  { label: "Current News", href: "/news", icon: RssIcon },
  { label: "Readings & Briefings", href: "/readings", icon: BookmarkIcon },
  { label: "Search", href: "/search", icon: SearchIcon },
  { label: "Add Entry", href: "/entries/new", icon: FilePlusIcon },
] as const;

export interface CommandPaletteSubject {
  name: string;
}

export function CommandPalette({ subjects }: { subjects: CommandPaletteSubject[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onOpenRequest() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpenRequest);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpenRequest);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a section, subject or industry…" />
      <CommandList>
        <CommandEmpty>No matches. Try a different term.</CommandEmpty>

        <CommandGroup heading="Sections">
          {SECTIONS.map((section) => (
            <CommandItem key={section.href} value={section.label} onSelect={() => go(section.href)}>
              <section.icon className="text-muted-foreground" />
              {section.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {subjects.length > 0 ? (
          <CommandGroup heading="Subjects">
            {subjects.map((subject) => (
              <CommandItem
                key={subject.name}
                value={subject.name}
                onSelect={() => go(`/subjects/${encodeURIComponent(subject.name)}`)}
              >
                <GraduationCapIcon className="text-muted-foreground" />
                {subject.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {INDUSTRY_TAXONOMY.map((industry) => (
          <CommandGroup key={industry.slug} heading={industry.name}>
            {industry.subsectors.map((sub) => (
              <CommandItem
                key={sub.slug}
                value={`${industry.name} ${sub.name}`}
                onSelect={() => go(`/industries/${industry.slug}/${sub.slug}`)}
              >
                <Building2Icon className="text-muted-foreground" />
                {sub.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
