import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 ? <ChevronRightIcon className="size-3.5 text-neutral-300" /> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-neutral-900 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-neutral-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
