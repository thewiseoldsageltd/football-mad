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

interface ApiMatch {
  id: string;
  slug: string;
  kickoffTime: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  competition: string | null;
  competitionId?: string | null;
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

function normStatus(s?: string | null) {
  return (s || "").toLowerCase();
}

function isFinishedStatus(s?: string | null) {
  const x = normStatus(s);
  return ["finished", "ft", "full_time", "ended", "final", "aet", "pen"].includes(x);
}

function isLiveStatus(s?: string | null) {
  const x = normStatus(s);
  return ["live", "inplay", "in_play", "ht", "halftime", "et", "extra_time", "pen", "penalties", "1h", "2h"].includes(x) || /^\d+$/.test(x);
}

function isScheduledStatus(s?: string | null) {
  const x = normStatus(s);
  return !isLiveStatus(x) && !isFinishedStatus(x);
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
  const liveEnabled = statusParam === "live";
  const baseDayUrl = `/api/matches/day?date=${dateStr}&status=all&sort=competition`;

  const { data: baseMatches = [], isLoading: baseLoading, isError: baseError } = useQuery<ApiMatch[]>({
    queryKey: ["matches-day-base", dateStr],
    queryFn: async () => {
      const res = await fetch(baseDayUrl);
      if (!res.ok) throw new Error("Failed to fetch matches day");
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: liveMatches = [], isLoading: liveLoading, isError: liveError } = useQuery<ApiMatch[]>({
    queryKey: ["matches-live"],
    queryFn: async () => {
      const res = await fetch("/api/matches/live");
      if (!res.ok) throw new Error("Failed to fetch live matches");
      return res.json();
    },
    enabled: liveEnabled,
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const sourceMatches = liveEnabled ? liveMatches : baseMatches;
  const isLoading = liveEnabled ? liveLoading : baseLoading;
  const isError = liveEnabled ? liveError : baseError;

  const allMatches = useMemo(() => {
    return baseMatches.map(apiMatchToMockMatch);
  }, [baseMatches]);

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

  const competitionOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; rawName: string }>();
    for (const m of baseMatches) {
      const id = String(m.competitionId || m.goalserveCompetitionId || m.competition || "");
      if (!id) continue;
      const label = String(m.competition || "Unknown");
      if (!map.has(id)) {
        map.set(id, { id, label, rawName: label });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [baseMatches]);

  const filteredByComp = useMemo(() => {
    if (!selectedCompetitionId) return sourceMatches;
    return sourceMatches.filter(
      (m) => String(m.competitionId || m.goalserveCompetitionId || "") === String(selectedCompetitionId),
    );
  }, [sourceMatches, selectedCompetitionId]);

  const statusFiltered = useMemo(() => {
    if (liveEnabled) return filteredByComp;
    if (statusParam === "scheduled") return filteredByComp.filter((m) => isScheduledStatus(m.status));
    if (statusParam === "fulltime") return filteredByComp.filter((m) => isFinishedStatus(m.status));
    return filteredByComp;
  }, [filteredByComp, statusParam, liveEnabled]);

  const matchesToRender = useMemo(() => {
    if (sortMode !== "kickoff") return statusFiltered;
    return [...statusFiltered].sort((a, b) => {
      const ta = new Date(a.kickoffTime).getTime();
      const tb = new Date(b.kickoffTime).getTime();
      return ta - tb;
    });
  }, [statusFiltered, sortMode]);

  const currentMatches = useMemo(() => {
    return matchesToRender.map(apiMatchToMockMatch);
  }, [matchesToRender]);

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
                  <CompetitionOption competition={opt.rawName} displayName={opt.label} />
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
              <span className="text-sm flex-1 text-center">Filter by...</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All competitions</SelectItem>
              {competitionOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <CompetitionOption competition={opt.rawName} displayName={opt.label} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortMode}
            onValueChange={(val) => setSortMode(val as "competition" | "kickoff")}
          >
            <SelectTrigger className="w-full" data-testid="select-sort-mobile">
              <span className="text-sm flex-1 text-center">Sort by...</span>
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
        ) : isError ? (
          <div className="text-center py-16" data-testid="error-matches">
            <h3 className="text-lg font-medium mb-2">Unable to load matches</h3>
            <p className="text-sm text-muted-foreground">Please try again in a moment.</p>
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
