import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Calendar, Loader2, Globe } from "lucide-react";
import { format, startOfDay, isSameDay, addDays, subDays } from "date-fns";
import { MatchesTabs, type MatchTab } from "@/components/matches/MatchesTabs";
import { MatchesFilters } from "@/components/matches/MatchesFilters";
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
  return LIVE_STATUSES.some(s => status.toLowerCase().includes(s.toLowerCase()));
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
  };
}

function getDateDaysFromToday(selectedDate: Date): number {
  const today = startOfDay(new Date());
  const selected = startOfDay(selectedDate);
  const diff = Math.ceil((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<MatchTab>("all");
  const [sortBy, setSortBy] = useState("kickoff");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");

  const today = startOfDay(new Date());
  const daysDiff = getDateDaysFromToday(selectedDate);
  const isInFuture = daysDiff >= 0;
  const isInPast = daysDiff < 0;

  const fixturesDays = Math.max(1, isInFuture ? daysDiff + 7 : 7);
  const fixturesUrl = selectedCompetitionId
    ? `/api/matches/fixtures?days=${fixturesDays}&competitionId=${selectedCompetitionId}`
    : `/api/matches/fixtures?days=${fixturesDays}`;

  const { data: fixturesData, isLoading: fixturesLoading } = useQuery<ApiMatch[]>({
    queryKey: ["fixtures", fixturesDays, selectedCompetitionId],
    queryFn: async () => {
      const res = await fetch(fixturesUrl);
      if (!res.ok) throw new Error("Failed to load fixtures");
      return res.json();
    },
  });

  const resultsDays = isInPast ? Math.abs(daysDiff) + 7 : 30;
  const resultsUrl = selectedCompetitionId
    ? `/api/matches/results?days=${resultsDays}&competitionId=${selectedCompetitionId}`
    : `/api/matches/results?days=${resultsDays}`;

  const { data: resultsData, isLoading: resultsLoading } = useQuery<ApiMatch[]>({
    queryKey: ["results", resultsDays, selectedCompetitionId],
    queryFn: async () => {
      const res = await fetch(resultsUrl);
      if (!res.ok) throw new Error("Failed to load results");
      return res.json();
    },
    enabled: activeTab === "all" || activeTab === "fulltime",
  });

  const liveUrl = `/api/matches/live`;
  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useQuery<ApiMatch[]>({
    queryKey: ["live"],
    queryFn: async () => {
      const res = await fetch(liveUrl);
      if (!res.ok) throw new Error("Failed to load live matches");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: activeTab === "all" || activeTab === "live",
  });

  const allFixtures = useMemo(() => {
    if (!fixturesData) return [];
    return fixturesData.map(apiMatchToMockMatch);
  }, [fixturesData]);

  const allResults = useMemo(() => {
    if (!resultsData) return [];
    return resultsData.map(apiMatchToMockMatch);
  }, [resultsData]);

  const allLive = useMemo(() => {
    if (!liveData) return [];
    return liveData.map(apiMatchToMockMatch);
  }, [liveData]);

  const filterByDate = (matches: MockMatch[]): MockMatch[] => {
    const selected = startOfDay(selectedDate);
    return matches.filter((match) => {
      const kickoff = new Date(match.kickOffTime);
      return isSameDay(kickoff, selected);
    });
  };

  const applyFilters = (matches: MockMatch[]): MockMatch[] => {
    let filtered = [...matches];

    if (sortBy === "kickoff") {
      filtered.sort((a, b) => new Date(a.kickOffTime).getTime() - new Date(b.kickOffTime).getTime());
    } else if (sortBy === "competition") {
      filtered.sort((a, b) => a.competition.localeCompare(b.competition));
    }

    return filtered;
  };

  const fixturesForDate = useMemo(() => filterByDate(allFixtures), [allFixtures, selectedDate]);
  const resultsForDate = useMemo(() => filterByDate(allResults), [allResults, selectedDate]);
  const liveForDate = useMemo(() => {
    return allLive.filter((match) => {
      const kickoff = new Date(match.kickOffTime);
      return isSameDay(kickoff, selectedDate);
    });
  }, [allLive, selectedDate]);

  const scheduledMatches = useMemo(() => {
    return fixturesForDate.filter(m => m.status === "scheduled" || m.status === "postponed");
  }, [fixturesForDate]);

  const fulltimeMatches = useMemo(() => {
    return resultsForDate.filter(m => m.status === "finished" || m.status === "postponed");
  }, [resultsForDate]);

  const allMatches = useMemo(() => {
    const combined = [...liveForDate, ...scheduledMatches, ...fulltimeMatches];
    const seen = new Set<string>();
    return combined.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [liveForDate, scheduledMatches, fulltimeMatches]);

  const counts = {
    all: allMatches.length,
    live: liveForDate.length,
    scheduled: scheduledMatches.length,
    fulltime: fulltimeMatches.length,
  };

  const currentMatches = useMemo(() => {
    let matches: MockMatch[];
    switch (activeTab) {
      case "live":
        matches = liveForDate;
        break;
      case "scheduled":
        matches = scheduledMatches;
        break;
      case "fulltime":
        matches = fulltimeMatches;
        break;
      case "all":
      default:
        matches = allMatches;
    }
    return applyFilters(matches);
  }, [activeTab, sortBy, liveForDate, scheduledMatches, fulltimeMatches, allMatches]);

  const competitionOptions = useMemo(() => {
    const allData = [...(fixturesData || []), ...(resultsData || [])];
    const seen = new Map<string, string>();
    allData.forEach((m) => {
      if (m.goalserveCompetitionId && m.competition) {
        seen.set(m.goalserveCompetitionId, m.competition);
      }
    });
    return Array.from(seen.entries())
      .map(([id, rawName]) => ({ id, displayName: getDisplayCompetitionName(rawName), rawName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [fixturesData, resultsData]);

  const isLoading = fixturesLoading || (activeTab === "fulltime" && resultsLoading) || (activeTab === "live" && liveLoading);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="heading-matches">Matches</h1>
            <p className="text-muted-foreground text-lg">
              Football fixtures and results
            </p>
          </div>
        </div>

        <div className="hidden md:flex md:flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <MatchesTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={counts}
              variant="desktop"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                  data-testid="btn-date-picker"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "EEE, d MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                data-testid="btn-prev-day"
              >
                &larr;
              </Button>
              <Button
                size="sm"
                variant={isSameDay(selectedDate, today) ? "default" : "outline"}
                onClick={() => setSelectedDate(today)}
                data-testid="btn-today"
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                data-testid="btn-next-day"
              >
                &rarr;
              </Button>
            </div>

            <Select
              value={selectedCompetitionId}
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

            <MatchesFilters
              sortBy={sortBy}
              onSortChange={setSortBy}
              variant="inline"
            />
          </div>
        </div>

        <div className="md:hidden">
          <MatchesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
            variant="mobile"
          />

          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-left font-normal"
                    data-testid="btn-date-picker-mobile"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "EEE, d MMM") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                data-testid="btn-prev-day-mobile"
              >
                &larr;
              </Button>
              <Button
                size="sm"
                variant={isSameDay(selectedDate, today) ? "default" : "outline"}
                onClick={() => setSelectedDate(today)}
                data-testid="btn-today-mobile"
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                data-testid="btn-next-day-mobile"
              >
                &rarr;
              </Button>
            </div>

            <Select
              value={selectedCompetitionId}
              onValueChange={(val) => setSelectedCompetitionId(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-full" data-testid="select-competition-mobile">
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
          </div>

          <MatchesFilters
            sortBy={sortBy}
            onSortChange={setSortBy}
            variant="stacked"
          />
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
