import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MatchesFiltersProps {
  sortBy: string;
  onSortChange: (value: string) => void;
  variant?: "inline" | "stacked";
}

export function MatchesFilters({
  sortBy,
  onSortChange,
  variant = "inline",
}: MatchesFiltersProps) {
  if (variant === "stacked") {
    return (
      <div className="mb-6" data-testid="filters-matches-mobile">
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full" data-testid="select-sort-mobile">
            <span className="flex-1 text-center">
              <SelectValue placeholder="Sort by" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kickoff">Kick-off time</SelectItem>
            <SelectItem value="competition">Competition</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3" data-testid="filters-matches-desktop">
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[150px]" data-testid="select-sort">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="kickoff">Kick-off time</SelectItem>
          <SelectItem value="competition">Competition</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
