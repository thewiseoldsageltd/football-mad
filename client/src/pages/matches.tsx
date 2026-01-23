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
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [sortMode, setSortMode] = useState<"competition" | "kickoff">("competition");
  const [desktopCalendarOpen, setDesktopCalendarOpen] = useState(false);
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);

  const today = startOfDay(new Date());
  const isToday = isSameDay(selectedDate, today);
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const statusParam = activeTab === "all" ? "all" : activeTab === "live" ? "live" : activeTab === "scheduled" ? "scheduled" : "fulltime";
  
  const matchesUrl = `/api/matches/day?date=${dateStr}&status=${statusParam}&sort=${sortMode}${selectedCompetitionId ? `&competitionId=${selectedCompetitionId}` : ""}`;

  const { data: matchesData, isLoading } = useQuery<ApiMatch[]>({
    queryKey: ["matches-day", dateStr, statusParam, selectedCompetitionId, sortMode],
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
    // Server returns sorted by priority, kickoff time, then competition name
    // Just convert to MockMatch format without re-sorting
    return matchesData.map(apiMatchToMockMatch);
  }, [matchesData]);

  // Fetch all matches for the selected date (no competition filter) to populate the filter dropdown
  const allMatchesForDateUrl = `/api/matches/day?date=${dateStr}&status=${statusParam}`;
  const { data: allMatchesForDate } = useQuery<ApiMatch[]>({
    queryKey: ["matches-day-filter-options", dateStr, statusParam],
    queryFn: async () => {
      const res = await fetch(allMatchesForDateUrl);
      if (!res.ok) throw new Error("Failed to load matches for filter");
      return res.json();
    },
    staleTime: 30000,
  });

  const filterableMatches = useMemo(() => {
    if (!allMatchesForDate) return [];
    return allMatchesForDate.map(apiMatchToMockMatch);
  }, [allMatchesForDate]);

  const competitionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    // Use filterableMatches (all matches for this date/status) to populate the filter dropdown
    filterableMatches.forEach((m) => {
      // Use goalserveCompetitionId as unique key, fallback to competition display name as key
      const compId = m.goalserveCompetitionId || m.rawCompetition || m.competition;
      // Use rawCompetition if present, else use competition (display name)
      const rawName = m.rawCompetition || m.competition;
      if (compId && rawName) {
        seen.set(compId, rawName);
      }
    });

    // Priority tier map matching backend logic
    const LEAGUE_PRIORITY: Record<string, number> = {
      // Tier 0: UEFA competitions (1-3)
      "uefa|champions league": 1, "uefa|europa league": 2, "uefa|conference league": 3,
      // Tier 0: England (4-10)
      "england|premier league": 4, "england|championship": 5, "england|league one": 6,
      "england|league two": 7, "england|fa cup": 8, "england|efl cup": 9, "england|league cup": 9,
      "england|community shield": 10,
      // Tier 1: Big 5 Europe (200-299)
      "spain|la liga": 200, "spain|primera": 200, "germany|bundesliga": 210,
      "italy|serie a": 220, "france|ligue 1": 230,
      // Tier 1: Second divisions
      "spain|segunda": 240, "germany|2. bundesliga": 250, "italy|serie b": 260, "france|ligue 2": 270,
      // Tier 2: Scotland (300-399)
      "scotland|premiership": 300, "scotland|championship": 310, "scotland|league one": 320, "scotland|league two": 330,
    };

    const YOUTH_PATTERNS = /\b(u21|u23|u19|u18|u17|u16|youth|reserve|academy|friendly|premier league 2|premier league cup)\b/i;

    function getCompetitionPriority(rawName: string): number {
      const raw = rawName.toLowerCase();
      
      // Youth/reserve demoted
      if (YOUTH_PATTERNS.test(raw)) return 9000;
      
      // Parse country and league
      const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*\[/);
      if (match) {
        const leagueName = match[1].trim().toLowerCase();
        const country = match[2].trim().toLowerCase();
        
        // Handle UEFA first
        if (leagueName.startsWith("uefa ")) {
          const leagueKey = `uefa|${leagueName.replace("uefa ", "")}`;
          if (LEAGUE_PRIORITY[leagueKey]) return LEAGUE_PRIORITY[leagueKey];
          return 50; // Other UEFA
        }
        
        const leagueKey = `${country}|${leagueName}`;
        if (LEAGUE_PRIORITY[leagueKey]) return LEAGUE_PRIORITY[leagueKey];
        
        // Ambiguous leagues with unknown country
        if (country === "unknown") {
          const ambiguous = ["championship", "premiership", "serie a", "ligue 1"];
          if (ambiguous.includes(leagueName)) return 9000;
        }
      }
      
      return 1000; // Default priority
    }

    // Build options with priority
    const options = Array.from(seen.entries()).map(([id, rawName]) => ({
      id,
      displayName: getDisplayCompetitionName(rawName),
      rawName,
      priority: getCompetitionPriority(rawName),
    }));

    // Sort by priority, then alphabetically (no country disambiguation text)
    return options
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [filterableMatches]);

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleDesktopDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
      setDesktopCalendarOpen(false);
    }
  };
  const handleMobileDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
      setMobileCalendarOpen(false);
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
            
            <Popover open={desktopCalendarOpen} onOpenChange={setDesktopCalendarOpen}>
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
                  onSelect={handleDesktopDateSelect}
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
          </div>

          <Select
            value={selectedCompetitionId || "all"}
            onValueChange={(val) => setSelectedCompetitionId(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-competition">
              <span>Filter by...</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All competitions</SelectItem>
              {competitionOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <CompetitionOption competition={opt.rawName} displayName={opt.displayName} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortMode}
            onValueChange={(val) => setSortMode(val as "competition" | "kickoff")}
          >
            <SelectTrigger className="w-[120px]" data-testid="select-sort">
              <span>Sort by...</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="competition">Competition</SelectItem>
              <SelectItem value="kickoff">Kick-off time</SelectItem>
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

            <Popover open={mobileCalendarOpen} onOpenChange={setMobileCalendarOpen}>
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
                  onSelect={handleMobileDateSelect}
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
          </div>

          <Select
            value={selectedCompetitionId || "all"}
            onValueChange={(val) => setSelectedCompetitionId(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-full" data-testid="select-competition-mobile">
              <span className="text-sm">Filter by...</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All competitions</SelectItem>
              {competitionOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <CompetitionOption competition={opt.rawName} displayName={opt.displayName} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortMode}
            onValueChange={(val) => setSortMode(val as "competition" | "kickoff")}
          >
            <SelectTrigger className="w-full" data-testid="select-sort-mobile">
              <span className="text-sm">Sort by...</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="competition">Competition</SelectItem>
              <SelectItem value="kickoff">Kick-off time</SelectItem>
            </SelectContent>
          </Select>
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

function CompetitionOption({ competition, displayName }: { competition: string | null | undefined; displayName?: string }) {
  const parsed = parseCompetitionLabel(competition);
  const flagUrl = getCountryFlagUrl(parsed.country);
  // Use provided displayName (may include disambiguation) or fallback to parsed name
  const label = displayName || parsed.name;

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
      <span>{label}</span>
    </span>
  );
}

export { CompetitionBadge, parseCompetitionLabel };
