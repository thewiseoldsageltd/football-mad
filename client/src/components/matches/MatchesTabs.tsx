import { cn } from "@/lib/utils";

export type MatchTab = "today" | "tomorrow" | "thisWeek" | "results";

interface MatchesTabsProps {
  activeTab: MatchTab;
  onTabChange: (tab: MatchTab) => void;
  counts: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    results: number;
  };
  variant?: "desktop" | "mobile";
}

const tabs: { value: MatchTab; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "thisWeek", label: "This Week" },
  { value: "results", label: "Results" },
];

export function MatchesTabs({ activeTab, onTabChange, counts, variant = "desktop" }: MatchesTabsProps) {
  const getCount = (tab: MatchTab): number => {
    switch (tab) {
      case "today": return counts.today;
      case "tomorrow": return counts.tomorrow;
      case "thisWeek": return counts.thisWeek;
      case "results": return counts.results;
    }
  };

  if (variant === "mobile") {
    return (
      <div className="relative mb-6" data-testid="tabs-matches-mobile">
        <div 
          className="overflow-x-auto scrollbar-hide"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <div className="inline-flex gap-1 bg-muted p-1 rounded-lg w-max">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`tab-${tab.value}-mobile`}
              >
                {tab.label} ({getCount(tab.value)})
              </button>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
      </div>
    );
  }

  return (
    <div className="inline-flex gap-1 bg-muted p-1 rounded-lg" data-testid="tabs-matches">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-testid={`tab-${tab.value}`}
        >
          {tab.label} ({getCount(tab.value)})
        </button>
      ))}
    </div>
  );
}
