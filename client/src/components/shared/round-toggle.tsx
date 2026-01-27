import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoundInfo {
  key: string;
  label: string;
  startDate?: string | null;
  endDate?: string | null;
  matchesCount: number;
}

interface RoundToggleProps {
  labelType: "Matchday" | "Matchweek";
  rounds: RoundInfo[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

function formatDateRange(startDate?: string | null, endDate?: string | null): string | null {
  if (!startDate) return null;
  
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    
    const formatDate = (d: Date) => {
      const day = d.getDate();
      const month = d.toLocaleDateString("en-GB", { month: "short" });
      return `${day} ${month}`;
    };
    
    const startStr = formatDate(start);
    const endStr = formatDate(end);
    
    if (startStr === endStr) {
      return startStr;
    }
    
    return `${startStr} – ${endStr}`;
  } catch {
    return null;
  }
}

export function RoundToggle({ 
  labelType, 
  rounds, 
  value, 
  onChange,
  className 
}: RoundToggleProps) {
  const currentIndex = rounds.findIndex(r => r.key === value);
  const currentRound = rounds[currentIndex];
  
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < rounds.length - 1;
  
  const handlePrev = () => {
    if (canGoPrev) {
      onChange(rounds[currentIndex - 1].key);
    }
  };
  
  const handleNext = () => {
    if (canGoNext) {
      onChange(rounds[currentIndex + 1].key);
    }
  };
  
  const displayLabel = currentRound?.label || value;
  const dateRange = formatDateRange(currentRound?.startDate, currentRound?.endDate);
  
  return (
    <div className={cn("flex items-center justify-between gap-2", className)} data-testid="round-toggle">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrev}
        disabled={!canGoPrev}
        className="shrink-0"
        data-testid="button-round-prev"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex flex-col items-center text-center min-w-0">
        <span className="font-semibold text-sm" data-testid="text-round-label">
          {labelType} {displayLabel}
        </span>
        {dateRange && (
          <span className="text-xs text-muted-foreground" data-testid="text-round-dates">
            {dateRange}
          </span>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        disabled={!canGoNext}
        className="shrink-0"
        data-testid="button-round-next"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function pickDefaultRound(rounds: RoundInfo[], latestRoundKey?: string | null): string {
  if (latestRoundKey && rounds.some(r => r.key === latestRoundKey)) {
    return latestRoundKey;
  }
  if (rounds.length > 0) {
    return rounds[rounds.length - 1].key;
  }
  return "";
}
