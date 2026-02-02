import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { seasons } from "@/data/tables-mock";

interface TablesFiltersProps {
  season: string;
  onSeasonChange: (value: string) => void;
  mobile?: boolean;
}

export function TablesFilters({
  season,
  onSeasonChange,
  mobile = false,
}: TablesFiltersProps) {
  if (mobile) {
    return (
      <div className="flex flex-col gap-3 items-center">
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
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 shrink-0">
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
    </div>
  );
}
