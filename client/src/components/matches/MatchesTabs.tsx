import { cn } from "@/lib/utils";

export type MatchTab = "all" | "live" | "scheduled" | "fulltime";

interface MatchesTabsProps {
  activeTab: MatchTab;
  onTabChange: (tab: MatchTab) => void;
  counts: {
    all: number;
    live: number;
    scheduled: number;
    fulltime: number;
  };
  variant?: "desktop" | "mobile";
}

const tabs: { value: MatchTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "fulltime", label: "Full-time" },
];

export function MatchesTabs({ activeTab, onTabChange, counts, variant = "desktop" }: MatchesTabsProps) {
  const getCount = (tab: MatchTab): number => {
    switch (tab) {
      case "all": return counts.all;
      case "live": return counts.live;
      case "scheduled": return counts.scheduled;
      case "fulltime": return counts.fulltime;
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
          <div className="inline-flex gap-2 bg-muted p-1 rounded-lg min-w-max pr-8">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  tab.value === "live" && counts.live > 0 && activeTab !== "live"
                    ? "text-red-500"
                    : ""
                )}
                data-testid={`tab-${tab.value}-mobile`}
              >
                {tab.value === "live" && counts.live > 0 && (
                  <span className="relative flex h-2 w-2 mr-1.5 inline-flex">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
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
            "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center",
            activeTab === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            tab.value === "live" && counts.live > 0 && activeTab !== "live"
              ? "text-red-500"
              : ""
          )}
          data-testid={`tab-${tab.value}`}
        >
          {tab.value === "live" && counts.live > 0 && (
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
          {tab.label} ({getCount(tab.value)})
        </button>
      ))}
    </div>
  );
}
