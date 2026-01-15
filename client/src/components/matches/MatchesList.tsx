import { useMemo } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { MockMatch } from "./mockMatches";
import { EnhancedMatchCard } from "./EnhancedMatchCard";
import { Calendar } from "lucide-react";

interface MatchesListProps {
  matches: MockMatch[];
}

interface DateGroup {
  date: string;
  label: string;
  competitions: CompetitionGroup[];
}

interface CompetitionGroup {
  competition: string;
  matches: MockMatch[];
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, d MMMM");
}

export function MatchesList({ matches }: MatchesListProps) {
  const groupedMatches = useMemo(() => {
    const byDate: Record<string, MockMatch[]> = {};
    
    matches.forEach((match) => {
      const dateKey = format(new Date(match.dateISO), "yyyy-MM-dd");
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(match);
    });

    const dateGroups: DateGroup[] = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, dateMatches]) => {
        const byCompetition: Record<string, MockMatch[]> = {};
        
        dateMatches.forEach((match) => {
          if (!byCompetition[match.competition]) byCompetition[match.competition] = [];
          byCompetition[match.competition].push(match);
        });

        const competitions: CompetitionGroup[] = Object.entries(byCompetition).map(
          ([competition, compMatches]) => ({
            competition,
            matches: compMatches.sort(
              (a, b) => new Date(a.kickOffTime).getTime() - new Date(b.kickOffTime).getTime()
            ),
          })
        );

        return {
          date: dateKey,
          label: formatDateLabel(dateKey),
          competitions,
        };
      });

    return dateGroups;
  }, [matches]);

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No matches found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="matches-list">
      {groupedMatches.map((dateGroup) => (
        <div key={dateGroup.date} className="space-y-4">
          <h2 className="text-lg font-semibold sticky top-0 bg-background py-2 z-10" data-testid={`date-header-${dateGroup.date}`}>
            {dateGroup.label}
          </h2>
          
          {dateGroup.competitions.map((compGroup) => (
            <div key={compGroup.competition} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                {compGroup.matches.map((match) => (
                  <EnhancedMatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
