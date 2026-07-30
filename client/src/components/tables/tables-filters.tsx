import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export type TablesSeasonOption = {
  key: string;
  label: string;
  slug: string;
};

interface TablesFiltersProps {
  /** Selected season in UI label form (e.g. 2026/27) or canonical — matched against options. */
  season: string;
  seasons: TablesSeasonOption[];
  seasonsLoading?: boolean;
  onSeasonChange: (value: string) => void;
  mobile?: boolean;
}

export function TablesFilters({
  season,
  seasons,
  seasonsLoading = false,
  onSeasonChange,
  mobile = false,
}: TablesFiltersProps) {
  const value =
    seasons.find((s) => s.label === season || s.key === season || s.slug === season)?.label ??
    season;

  if (seasonsLoading && seasons.length === 0) {
    return mobile ? (
      <Skeleton className="h-10 w-full" />
    ) : (
      <Skeleton className="h-10 w-[120px]" />
    );
  }

  if (mobile) {
    return (
      <div className="flex flex-col gap-3 items-center">
        <Select value={value} onValueChange={onSeasonChange} disabled={seasons.length === 0}>
          <SelectTrigger className="w-full" data-testid="select-season-mobile">
            <span className="flex-1 text-center truncate">{value || "Season"}</span>
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s.key} value={s.label}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 shrink-0">
      <Select value={value} onValueChange={onSeasonChange} disabled={seasons.length === 0}>
        <SelectTrigger className="w-[120px]" data-testid="select-season">
          <SelectValue placeholder="Season" />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((s) => (
            <SelectItem key={s.key} value={s.label}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
