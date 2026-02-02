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
    
    // Same day: show single date
    if (startStr === endStr) {
      return startStr;
    }
    
    // Calculate span in days
    const dayMs = 24 * 60 * 60 * 1000;
    const spanDays = Math.round((end.getTime() - start.getTime()) / dayMs);
    
    // Span > 3 days: show "Various dates" (handles rearranged EFL fixtures)
    if (spanDays > 3) {
      return "Various dates";
    }
    
    // Normal range (<=3 days): show "31 Jan – 2 Feb"
    return `${startStr} – ${endStr}`;
  } catch {
    return null;
  }
}

/**
 * Extract numeric portion from a round key or label for sorting.
 * Handles: "1", "8", "MD8", "matchday_8", "Matchday 8", etc.
 * Returns Infinity for non-numeric keys (knockout rounds like "PO", "QF", "SF", "F").
 */
function extractRoundNumber(keyOrLabel: string): number {
  const match = keyOrLabel.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  // Non-numeric keys (knockout rounds) sort after matchdays
  return Infinity;
}

export function RoundToggle({ 
  labelType, 
  rounds, 
  value, 
  onChange,
  className 
}: RoundToggleProps) {
  // Ensure rounds are sorted numerically for consistent navigation
  const sortedRounds = [...rounds].sort((a, b) => {
    const numA = extractRoundNumber(a.key);
    const numB = extractRoundNumber(b.key);
    if (numA !== numB) return numA - numB;
    // Fallback to lexicographic for same number
    return a.key.localeCompare(b.key);
  });

  // Find current index; if not found, default to last round (most recent)
  let currentIndex = sortedRounds.findIndex(r => r.key === value);
  if (currentIndex === -1 && sortedRounds.length > 0) {
    currentIndex = sortedRounds.length - 1;
  }
  
  const currentRound = sortedRounds[currentIndex];
  
  // Non-wrapping navigation: disable at boundaries
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < sortedRounds.length - 1;
  
  const handlePrev = () => {
    if (canGoPrev) {
      onChange(sortedRounds[currentIndex - 1].key);
    }
  };
  
  const handleNext = () => {
    if (canGoNext) {
      onChange(sortedRounds[currentIndex + 1].key);
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
