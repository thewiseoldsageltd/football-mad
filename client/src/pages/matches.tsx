import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Calendar, Loader2, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay, isSameDay, addDays, subDays } from "date-fns";
import { enGB } from "date-fns/locale";
import { MatchesTabs, type MatchTab } from "@/components/matches/MatchesTabs";
import { MatchesList } from "@/components/matches/MatchesList";
import { type MockMatch } from "@/components/matches/mockMatches";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { getCountryFlagUrl } from "@/lib/flags";
import { cn } from "@/lib/utils";

interface ApiMatch {
  id: string;
  slug: string;
  kickoffTime: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  competition: string | null;
  goalserveCompetitionId: string | null;
  goalserveMatchId: string | null;
  goalserveRound: string | null;
  homeTeam: { id?: string; name?: string; slug?: string; goalserveTeamId?: string; nameFromRaw?: string; logoUrl?: string };
  awayTeam: { id?: string; name?: string; slug?: string; goalserveTeamId?: string; nameFromRaw?: string; logoUrl?: string };
}

interface ParsedCompetition {
  name: string;
  country?: string;
  id?: string;
}

function parseCompetitionLabel(competition: string | null | undefined): ParsedCompetition {
  if (!competition) return { name: "Unknown" };
  
  const fullMatch = competition.match(/^(.+?)\s*\(([^)]+)\)\s*\[(\d+)\]$/);
  if (fullMatch) {
    return { name: fullMatch[1].trim(), country: fullMatch[2].trim(), id: fullMatch[3] };
  }
  
  const colonMatch = competition.match(/^([^:]+):\s*(.+)$/);
  if (colonMatch) {
    return { name: colonMatch[2].trim(), country: colonMatch[1].trim() };
  }
  
  return { name: competition };
}

function CompetitionBadge({ competition }: { competition: string | null | undefined }) {
  const parsed = parseCompetitionLabel(competition);
  const flagUrl = getCountryFlagUrl(parsed.country);

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {flagUrl ? (
        <img 
          src={flagUrl} 
          alt={parsed.country || ""} 
          className="w-4 h-3 object-cover rounded-sm"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Globe className="w-4 h-4 text-muted-foreground" />
      )}
      <span>{parsed.name}</span>
    </div>
  );
}

function getDisplayCompetitionName(competition: string | null | undefined): string {
  const parsed = parseCompetitionLabel(competition);
  return parsed.name;
}

const LIVE_STATUSES = ["playing", "1st half", "2nd half", "half time", "ht", "extra time", "pen."];
const FINISHED_STATUSES = ["finished", "ft", "full-time", "aet", "pen", "awarded", "postponed", "cancelled", "abandoned"];

function isLiveStatus(status: string): boolean {
  return LIVE_STATUSES.some(s => status.toLowerCase().includes(s.toLowerCase())) || /^\d+$/.test(status);
}

function isFinishedStatus(status: string): boolean {
  return FINISHED_STATUSES.some(s => status.toLowerCase().includes(s.toLowerCase()));
}

const UK_PRIORITY: Record<string, number> = {
  "Premier League": 1,
  "Championship": 2,
  "League One": 3,
  "League Two": 4,
  "National League": 5,
  "FA Cup": 6,
  "EFL Cup": 7,
  "League Cup": 7,
  "Carabao Cup": 7,
};

const BIG5_PRIORITY: Record<string, number> = {
  "La Liga": 10,
  "LaLiga": 10,
  "Serie A": 11,
  "Bundesliga": 12,
  "Ligue 1": 13,
  "Eredivisie": 14,
  "Champions League": 15,
  "UEFA Champions League": 15,
  "Europa League": 16,
  "UEFA Europa League": 16,
  "Conference League": 17,
  "UEFA Europa Conference League": 17,
};

function getCompetitionPriority(competitionName: string, goalserveCompetitionId: string | null): number {
  const ukPriority = UK_PRIORITY[competitionName];
  if (ukPriority !== undefined) return ukPriority;
  
  const big5Priority = BIG5_PRIORITY[competitionName];
  if (big5Priority !== undefined) return big5Priority;
  
  for (const [key, priority] of Object.entries(UK_PRIORITY)) {
    if (competitionName.toLowerCase().includes(key.toLowerCase())) return priority;
  }
  for (const [key, priority] of Object.entries(BIG5_PRIORITY)) {
    if (competitionName.toLowerCase().includes(key.toLowerCase())) return priority;
  }
  
  return 100;
}

function apiMatchToMockMatch(match: ApiMatch): MockMatch {
  const homeName = match.homeTeam.name || match.homeTeam.nameFromRaw || "Unknown";
  const awayName = match.awayTeam.name || match.awayTeam.nameFromRaw || "Unknown";
  const competitionDisplay = getDisplayCompetitionName(match.competition);
  
  let mockStatus: MockMatch["status"] = "scheduled";
  if (isLiveStatus(match.status)) {
    mockStatus = "live";
  } else if (isFinishedStatus(match.status)) {
    mockStatus = "finished";
  } else if (match.status.toLowerCase().includes("postponed")) {
    mockStatus = "postponed";
  }
  
  return {
    id: match.id,
    competition: competitionDisplay,
    rawCompetition: match.competition,
    dateISO: match.kickoffTime,
    kickOffTime: match.kickoffTime,
    status: mockStatus,
    homeTeam: {
      id: match.homeTeam.id || match.homeTeam.goalserveTeamId || match.id,
      name: homeName,
      shortName: homeName.substring(0, 3).toUpperCase(),
      primaryColor: "#1a1a2e",
      logoUrl: match.homeTeam.logoUrl,
    },
    awayTeam: {
      id: match.awayTeam.id || match.awayTeam.goalserveTeamId || match.id,
      name: awayName,
      shortName: awayName.substring(0, 3).toUpperCase(),
      primaryColor: "#1a1a2e",
      logoUrl: match.awayTeam.logoUrl,
    },
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    venue: match.venue || undefined,
    goalserveCompetitionId: match.goalserveCompetitionId,
  };
}

function formatDateLabel(date: Date, isToday: boolean): string {
  if (isToday) {
    return `Today — ${format(date, "EEE d MMM", { locale: enGB })}`;
  }
  return format(date, "EEE d MMM yyyy", { locale: enGB });
}

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<MatchTab>("all");
  const [sortBy, setSortBy] = useState("kickoff");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const today = startOfDay(new Date());
  const isToday = isSameDay(selectedDate, today);
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const statusParam = activeTab === "all" ? "all" : activeTab === "live" ? "live" : activeTab === "scheduled" ? "scheduled" : "fulltime";
  
  const matchesUrl = selectedCompetitionId
    ? `/api/matches/day?date=${dateStr}&status=${statusParam}&competitionId=${selectedCompetitionId}`
    : `/api/matches/day?date=${dateStr}&status=${statusParam}`;

  const { data: matchesData, isLoading } = useQuery<ApiMatch[]>({
    queryKey: ["matches-day", dateStr, statusParam, selectedCompetitionId],
    queryFn: async () => {
      const res = await fetch(matchesUrl);
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
  });

  const allMatchesUrl = `/api/matches/day?date=${dateStr}&status=all${selectedCompetitionId ? `&competitionId=${selectedCompetitionId}` : ""}`;
  const { data: allMatchesData } = useQuery<ApiMatch[]>({
    queryKey: ["matches-day", dateStr, "all", selectedCompetitionId],
    queryFn: async () => {
      const res = await fetch(allMatchesUrl);
      if (!res.ok) throw new Error("Failed to load all matches");
      return res.json();
    },
    staleTime: 30000,
  });

  const allMatches = useMemo(() => {
    if (!allMatchesData) return [];
    return allMatchesData.map(apiMatchToMockMatch);
  }, [allMatchesData]);

  const counts = useMemo(() => {
    const live = allMatches.filter(m => m.status === "live").length;
    const scheduled = allMatches.filter(m => m.status === "scheduled" || m.status === "postponed").length;
    const fulltime = allMatches.filter(m => m.status === "finished").length;
    return {
      all: allMatches.length,
      live,
      scheduled,
      fulltime,
    };
  }, [allMatches]);

  const currentMatches = useMemo(() => {
    if (!matchesData) return [];
    let matches = matchesData.map(apiMatchToMockMatch);

    if (sortBy === "competition") {
      matches.sort((a, b) => a.competition.localeCompare(b.competition));
    } else {
      matches.sort((a, b) => {
        const priorityA = getCompetitionPriority(a.competition, a.goalserveCompetitionId || null);
        const priorityB = getCompetitionPriority(b.competition, b.goalserveCompetitionId || null);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(a.kickOffTime).getTime() - new Date(b.kickOffTime).getTime();
      });
    }

    return matches;
  }, [matchesData, sortBy]);

  const competitionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    allMatches.forEach((m) => {
      const compId = m.goalserveCompetitionId;
      if (compId && m.rawCompetition) {
        seen.set(compId, m.rawCompetition);
      }
    });
    return Array.from(seen.entries())
      .map(([id, rawName]) => ({ id, displayName: getDisplayCompetitionName(rawName), rawName }))
      .sort((a, b) => {
        const priorityA = getCompetitionPriority(a.displayName, a.id);
        const priorityB = getCompetitionPriority(b.displayName, b.id);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [allMatches]);

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(today);
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
      setCalendarOpen(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" data-testid="heading-matches">Matches</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Football fixtures and results
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 flex-wrap mb-6">
          <MatchesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
            variant="desktop"
          />

          <div className="flex items-center gap-1 ml-auto">
            <Button
              size="icon"
              variant="outline"
              onClick={handlePrevDay}
              data-testid="btn-prev-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[180px] justify-center font-normal"
                  data-testid="btn-date-picker"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formatDateLabel(selectedDate, isToday)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              size="icon"
              variant="outline"
              onClick={handleNextDay}
              data-testid="btn-next-day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant={isToday ? "default" : "outline"}
              onClick={handleToday}
              className="ml-1"
              data-testid="btn-today"
            >
              Today
            </Button>
          </div>

          <Select
            value={selectedCompetitionId || "all"}
            onValueChange={(val) => setSelectedCompetitionId(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-competition">
              <SelectValue placeholder="All competitions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All competitions</SelectItem>
              {competitionOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <CompetitionOption competition={opt.rawName} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kickoff">Kick-off time</SelectItem>
              <SelectItem value="competition">Competition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:hidden space-y-3 mb-4">
          <MatchesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
            variant="mobile"
          />

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={handlePrevDay}
              data-testid="btn-prev-day-mobile"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-center font-normal"
                  data-testid="btn-date-picker-mobile"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formatDateLabel(selectedDate, isToday)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              size="icon"
              variant="outline"
              onClick={handleNextDay}
              data-testid="btn-next-day-mobile"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant={isToday ? "default" : "outline"}
              onClick={handleToday}
              data-testid="btn-today-mobile"
            >
              Today
            </Button>
          </div>

          <div className="flex gap-2">
            <Select
              value={selectedCompetitionId || "all"}
              onValueChange={(val) => setSelectedCompetitionId(val === "all" ? "" : val)}
            >
              <SelectTrigger className="flex-1" data-testid="select-competition-mobile">
                <SelectValue placeholder="All competitions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All competitions</SelectItem>
                {competitionOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <CompetitionOption competition={opt.rawName} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px]" data-testid="select-sort-mobile">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kickoff">Kick-off</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16" data-testid="loading-matches">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">
              Loading matches...
            </span>
          </div>
        ) : currentMatches.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-matches">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No matches found
            </h3>
            <p className="text-sm text-muted-foreground">
              No {activeTab === "live" ? "live" : activeTab === "scheduled" ? "scheduled" : activeTab === "fulltime" ? "completed" : ""} matches for {format(selectedDate, "EEEE, d MMMM yyyy")}.
            </p>
          </div>
        ) : (
          <MatchesList matches={currentMatches} activeTab={activeTab} />
        )}
      </div>
    </MainLayout>
  );
}

function CompetitionOption({ competition }: { competition: string | null | undefined }) {
  const parsed = parseCompetitionLabel(competition);
  const flagUrl = getCountryFlagUrl(parsed.country);

  return (
    <span className="inline-flex items-center gap-1.5">
      {flagUrl ? (
        <img 
          src={flagUrl} 
          alt={parsed.country || ""} 
          className="w-4 h-3 object-cover rounded-sm"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Globe className="w-4 h-4 text-muted-foreground" />
      )}
      <span>{parsed.name}</span>
    </span>
  );
}

export { CompetitionBadge, parseCompetitionLabel };
