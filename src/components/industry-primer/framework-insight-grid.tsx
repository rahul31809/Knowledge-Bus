import { FrameworkInsightCard } from "./framework-insight-card";

export function FrameworkInsightGrid({
  items,
  industryName,
  subsectorName,
  searchContext,
}: {
  items: { title: string; description: string }[];
  industryName: string;
  subsectorName: string;
  searchContext: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <FrameworkInsightCard
          key={item.title}
          title={item.title}
          description={item.description}
          industryName={industryName}
          subsectorName={subsectorName}
          searchContext={searchContext}
        />
      ))}
    </div>
  );
}
