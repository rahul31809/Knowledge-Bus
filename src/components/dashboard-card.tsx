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
        "group flex flex-col gap-4 rounded-md border border-border bg-card transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/40",
        isFeatured ? "p-6" : "p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md",
            isFeatured ? "size-10" : "size-9",
            ACCENT_CLASSES[accent]
          )}
        >
          <Icon className={isFeatured ? "size-5" : "size-4"} />
        </div>
        <ArrowRightIcon className="size-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className={cn("font-semibold text-foreground", isFeatured ? "text-lg" : "text-sm")}>{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {meta ? (
        <span className="inline-flex w-fit items-center rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </Link>
  );
}
