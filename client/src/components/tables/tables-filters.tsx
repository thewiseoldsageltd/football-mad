import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { seasons } from "@/data/tables-mock";

interface TablesFiltersProps {
  season: string;
  onSeasonChange: (value: string) => void;
  mobile?: boolean;
}

// PRODUCT DECISION: "Overall" table view dropdown removed - only season selector remains
export function TablesFilters({
  season,
  onSeasonChange,
  mobile = false,
}: TablesFiltersProps) {
  if (mobile) {
    return (
      <Select value={season} onValueChange={onSeasonChange}>
        <SelectTrigger className="w-full" data-testid="select-season-mobile">
          <span className="flex-1 text-center truncate">{season}</span>
        </SelectTrigger>
        <SelectContent>
          {seasons.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={season} onValueChange={onSeasonChange}>
      <SelectTrigger className="w-[120px]" data-testid="select-season">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
