import Link from "next/link";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_CLASSES = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
} as const;

interface DashboardCardProps {
  href: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENT_CLASSES;
  title: string;
  description: string;
  meta?: string;
}

export function DashboardCard({ href, icon: Icon, accent, title, description, meta }: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
            ACCENT_CLASSES[accent]
          )}
        >
          <Icon className="size-5" />
        </div>
        <ArrowRightIcon className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {meta ? <span className="text-xs font-medium text-muted-foreground">{meta}</span> : null}
    </Link>
  );
}
