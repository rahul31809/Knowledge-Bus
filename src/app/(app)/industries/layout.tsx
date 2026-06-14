import { IndustrySidebar } from "@/components/industry-sidebar";

export default function IndustriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <IndustrySidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
