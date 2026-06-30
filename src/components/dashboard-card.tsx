import Link from "next/link";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_CLASSES = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
} as const;

interface DashboardCardProps {
  href: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENT_CLASSES;
  title: string;
  description: string;
  meta?: string;
  size?: "featured" | "default";
  style?: React.CSSProperties;
  className?: string;
}

export function DashboardCard({
  href,
  icon: Icon,
  accent,
  title,
  description,
  meta,
  size = "default",
  style,
  className,
}: DashboardCardProps) {
  const isFeatured = size === "featured";

  return (
    <Link
      href={href}
      style={style}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
        isFeatured ? "p-6" : "p-5",
        className
      )}
    >
      {isFeatured ? (
        <div
          className={cn(
            "pointer-events-none absolute -top-10 -right-10 size-40 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-70",
            ACCENT_CLASSES[accent].split(" ")[0],
            "opacity-40"
          )}
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
            isFeatured ? "size-12" : "size-10",
            ACCENT_CLASSES[accent]
          )}
        >
          <Icon className={isFeatured ? "size-6" : "size-5"} />
        </div>
        <ArrowRightIcon className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>

      <div className="relative flex flex-col gap-1">
        <h2 className={cn("font-semibold text-foreground", isFeatured ? "text-xl" : "text-base")}>{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {meta ? (
        <span className="relative inline-flex w-fit items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </Link>
  );
}
