import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PositionFilter = "all" | "GK" | "DEF" | "MID" | "FWD";
export type SortOption = "rating" | "minutes" | "goals" | "assists" | "number";

interface SquadControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  positionFilter: PositionFilter;
  onPositionFilterChange: (value: PositionFilter) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

const positionFilters: { value: PositionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "GK", label: "GK" },
  { value: "DEF", label: "DEF" },
  { value: "MID", label: "MID" },
  { value: "FWD", label: "FWD" },
];

export function SquadControls({
  searchQuery,
  onSearchChange,
  positionFilter,
  onPositionFilterChange,
  sortBy,
  onSortChange,
}: SquadControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          data-testid="input-squad-search"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {positionFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={positionFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => onPositionFilterChange(filter.value)}
              data-testid={`button-filter-${filter.value.toLowerCase()}`}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        
        <Select value={sortBy} onValueChange={(val) => onSortChange(val as SortOption)}>
          <SelectTrigger className="w-[130px]" data-testid="select-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="goals">Goals</SelectItem>
            <SelectItem value="assists">Assists</SelectItem>
            <SelectItem value="number">Shirt No.</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
