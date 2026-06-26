"use client";

import { useEffect, useState } from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { IndustrySidebar } from "@/components/industry-sidebar";

const STORAGE_KEY = "industry-sidebar-collapsed";

export default function IndustryLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-3">
      <div className={`w-full shrink-0 sm:w-64 ${collapsed ? "sm:hidden" : ""}`}>
        <IndustrySidebar />
      </div>

      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Show industries sidebar" : "Collapse industries sidebar"}
        className="hidden h-8 w-6 shrink-0 items-center justify-center self-start rounded-md border border-border bg-card text-muted-foreground hover:text-foreground sm:flex"
      >
        {collapsed ? <PanelLeftOpenIcon className="size-3.5" /> : <PanelLeftCloseIcon className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
