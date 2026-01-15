import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MatchesFiltersProps {
  competition: string;
  onCompetitionChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  teamSearch: string;
  onTeamSearchChange: (value: string) => void;
  variant?: "inline" | "stacked";
}

export function MatchesFilters({
  competition,
  onCompetitionChange,
  sortBy,
  onSortChange,
  teamSearch,
  onTeamSearchChange,
  variant = "inline",
}: MatchesFiltersProps) {
  if (variant === "stacked") {
    return (
      <div className="space-y-3 mb-6" data-testid="filters-matches-mobile">
        <Select value={competition} onValueChange={onCompetitionChange}>
          <SelectTrigger className="w-full" data-testid="select-competition-mobile">
            <span className="flex-1 text-center">
              <SelectValue placeholder="Competition" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Competitions</SelectItem>
            <SelectItem value="premier-league">Premier League</SelectItem>
            <SelectItem value="champions-league">Champions League</SelectItem>
            <SelectItem value="fa-cup">FA Cup</SelectItem>
            <SelectItem value="carabao-cup">Carabao Cup</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            type="text"
            placeholder="Search team..."
            value={teamSearch}
            onChange={(e) => onTeamSearchChange(e.target.value)}
            className="text-center pr-9 placeholder:text-center"
            data-testid="input-team-search-mobile"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

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
      <Select value={competition} onValueChange={onCompetitionChange}>
        <SelectTrigger className="w-[180px]" data-testid="select-competition">
          <SelectValue placeholder="Competition" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Competitions</SelectItem>
          <SelectItem value="premier-league">Premier League</SelectItem>
          <SelectItem value="champions-league">Champions League</SelectItem>
          <SelectItem value="fa-cup">FA Cup</SelectItem>
          <SelectItem value="carabao-cup">Carabao Cup</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search team..."
          value={teamSearch}
          onChange={(e) => onTeamSearchChange(e.target.value)}
          className="w-[160px] pl-9"
          data-testid="input-team-search"
        />
      </div>

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
