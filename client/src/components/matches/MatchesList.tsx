import { useMemo } from "react";
import { format, isToday, isTomorrow, startOfWeek, endOfWeek } from "date-fns";
import { enGB } from "date-fns/locale";
import { MockMatch } from "./mockMatches";
import { EnhancedMatchCard } from "./EnhancedMatchCard";
import { Calendar } from "lucide-react";

interface MatchesListProps {
  matches: MockMatch[];
  activeTab?: string;
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
  const dateContext = format(date, "EEE d MMM", { locale: enGB });
  
  if (isToday(date)) return `Today — ${dateContext}`;
  if (isTomorrow(date)) return `Tomorrow — ${dateContext}`;
  return format(date, "EEEE, d MMMM", { locale: enGB });
}

function formatWeekRange(): string {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const startStr = format(weekStart, "EEE d MMM", { locale: enGB });
  const endStr = format(weekEnd, "EEE d MMM", { locale: enGB });
  return `This Week — ${startStr} – ${endStr}`;
}

function MatchesEmptyState() {
  return (
    <div className="text-center py-16" data-testid="empty-matches">
      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">No matches scheduled</h3>
      <p className="text-sm text-muted-foreground">Try Tomorrow or Results.</p>
    </div>
  );
}

export function MatchesList({ matches, activeTab }: MatchesListProps) {
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
    return <MatchesEmptyState />;
  }

  const sectionTitle = activeTab === "thisWeek" ? formatWeekRange() : null;

  return (
    <div className="space-y-8" data-testid="matches-list">
      {sectionTitle && (
        <h2 className="text-lg font-semibold text-muted-foreground" data-testid="week-header">
          {sectionTitle}
        </h2>
      )}
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
