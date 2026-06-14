import Link from "next/link";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_CLASSES = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
} as const;

interface DashboardSectionProps {
  icon: LucideIcon;
  accent: keyof typeof ACCENT_CLASSES;
  title: string;
  meta?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
}

export function DashboardSection({
  icon: Icon,
  accent,
  title,
  meta,
  viewAllHref,
  viewAllLabel = "View all",
  children,
}: DashboardSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", ACCENT_CLASSES[accent])}>
            <Icon className="size-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
            {meta ? <span className="text-xs text-neutral-400">{meta}</span> : null}
          </div>
        </div>

        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="group flex shrink-0 items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
          >
            {viewAllLabel}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}
