import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { seasons, tableViews } from "@/data/tables-mock";

type TopTab = "leagues" | "cups" | "europe";

interface TablesFiltersProps {
  topTab: TopTab;
  season: string;
  tableView: string;
  onSeasonChange: (value: string) => void;
  onTableViewChange: (value: string) => void;
  mobile?: boolean;
}

export function TablesFilters({
  topTab,
  season,
  tableView,
  onSeasonChange,
  onTableViewChange,
  mobile = false,
}: TablesFiltersProps) {
  if (mobile) {
    return (
      <div className="flex flex-col gap-3">
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

        {topTab === "leagues" && (
          <Select value={tableView} onValueChange={onTableViewChange}>
            <SelectTrigger className="w-full" data-testid="select-view-mobile">
              <span className="flex-1 text-center truncate">
                {tableViews.find((v) => v.value === tableView)?.label || "Overall"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {tableViews.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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

      {topTab === "leagues" && (
        <Select value={tableView} onValueChange={onTableViewChange}>
          <SelectTrigger className="w-[120px]" data-testid="select-view">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            {tableViews.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
