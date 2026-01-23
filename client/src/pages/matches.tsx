import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Calendar, Loader2 } from "lucide-react";
import { isToday, isTomorrow, addDays, startOfDay, isBefore, isAfter } from "date-fns";
import { MatchesTabs, type MatchTab } from "@/components/matches/MatchesTabs";
import { MatchesFilters } from "@/components/matches/MatchesFilters";
import { MatchesList } from "@/components/matches/MatchesList";
import { type MockMatch } from "@/components/matches/mockMatches";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const countryFlags: Record<string, string> = {
  "Brazil": "🇧🇷", "Argentina": "🇦🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "Ireland": "🇮🇪", "Northern Ireland": "🇬🇧", "France": "🇫🇷",
  "Germany": "🇩🇪", "Spain": "🇪🇸", "Italy": "🇮🇹", "Portugal": "🇵🇹",
  "Netherlands": "🇳🇱", "Belgium": "🇧🇪", "USA": "🇺🇸", "Mexico": "🇲🇽",
  "Uruguay": "🇺🇾", "Colombia": "🇨🇴", "Chile": "🇨🇱", "Peru": "🇵🇪",
  "Ecuador": "🇪🇨", "Paraguay": "🇵🇾", "Bolivia": "🇧🇴", "Venezuela": "🇻🇪",
  "Jamaica": "🇯🇲", "Egypt": "🇪🇬", "Iraq": "🇮🇶", "Qatar": "🇶🇦",
  "Saudi Arabia": "🇸🇦", "UAE": "🇦🇪", "Morocco": "🇲🇦", "Algeria": "🇩🇿",
  "Tunisia": "🇹🇳", "Libya": "🇱🇾", "South Africa": "🇿🇦", "Guatemala": "🇬🇹",
  "El Salvador": "🇸🇻", "intl": "🌍", "India": "🇮🇳", "Japan": "🇯🇵",
  "South Korea": "🇰🇷", "China": "🇨🇳", "Australia": "🇦🇺", "New Zealand": "🇳🇿",
};

function getFlagEmoji(countryName: string | undefined): string | null {
  if (!countryName) return null;
  return countryFlags[countryName] || "🌍";
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

function displayCompetitionWithFlag(competition: string | null | undefined): string {
  const parsed = parseCompetitionLabel(competition);
  const flag = getFlagEmoji(parsed.country);
  return flag ? `${flag} ${parsed.name}` : parsed.name;
}

function apiMatchToMockMatch(match: ApiMatch): MockMatch {
  const homeName = match.homeTeam.name || match.homeTeam.nameFromRaw || "Unknown";
  const awayName = match.awayTeam.name || match.awayTeam.nameFromRaw || "Unknown";
  const competitionDisplay = displayCompetitionWithFlag(match.competition);
  
  return {
    id: match.id,
    competition: competitionDisplay,
    dateISO: match.kickoffTime,
    kickOffTime: match.kickoffTime,
    status: match.status as MockMatch["status"],
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

type ResultsMode = "quick" | "browse";
type QuickPeriod = "yesterday" | "thisWeek" | "last30";

const quickPeriodDays: Record<QuickPeriod, number> = {
  yesterday: 1,
  thisWeek: 7,
  last30: 30,
};

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<MatchTab>("today");
  const [sortBy, setSortBy] = useState("kickoff");
  const [teamSearch, setTeamSearch] = useState("");
  const [fixtureDays, setFixtureDays] = useState(7);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");

  const [resultsMode, setResultsMode] = useState<ResultsMode>("quick");
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>("yesterday");
  const [browseCompetitionId, setBrowseCompetitionId] = useState("");
  const [browseRound, setBrowseRound] = useState("");

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const endOfWeek = addDays(today, 7);

  const fixturesUrl = selectedCompetitionId
    ? `/api/matches/fixtures?days=${fixtureDays}&competitionId=${selectedCompetitionId}`
    : `/api/matches/fixtures?days=${fixtureDays}`;

  const { data: fixturesData, isLoading: fixturesLoading } = useQuery<ApiMatch[]>({
    queryKey: ["fixtures", fixtureDays, selectedCompetitionId],
    queryFn: async () => {
      const res = await fetch(fixturesUrl);
      if (!res.ok) throw new Error("Failed to load fixtures");
      return res.json();
    },
  });

  const resultsDays = resultsMode === "quick" ? quickPeriodDays[quickPeriod] : 30;
  const resultsUrl = useMemo(() => {
    const params = new URLSearchParams({ days: String(resultsDays) });
    if (resultsMode === "browse" && browseCompetitionId) {
      params.set("competitionId", browseCompetitionId);
      if (browseRound) params.set("round", browseRound);
    }
    return `/api/matches/results?${params.toString()}`;
  }, [resultsDays, resultsMode, browseCompetitionId, browseRound]);

  const { data: resultsData, isLoading: resultsLoading } = useQuery<ApiMatch[]>({
    queryKey: ["results", resultsDays, resultsMode, browseCompetitionId, browseRound],
    queryFn: async () => {
      const res = await fetch(resultsUrl);
      if (!res.ok) throw new Error("Failed to load results");
      return res.json();
    },
  });

  const { data: roundsData } = useQuery<{ ok: boolean; rounds: string[] }>({
    queryKey: ["rounds", browseCompetitionId],
    queryFn: async () => {
      const res = await fetch(`/api/matches/rounds?competitionId=${browseCompetitionId}&days=30`);
      if (!res.ok) throw new Error("Failed to load rounds");
      return res.json();
    },
    enabled: resultsMode === "browse" && !!browseCompetitionId,
  });

  const fixtureCompetitionOptions = useMemo(() => {
    if (!fixturesData) return [];
    const seen = new Map<string, string>();
    fixturesData.forEach((m) => {
      if (m.goalserveCompetitionId && m.competition) {
        seen.set(m.goalserveCompetitionId, m.competition);
      }
    });
    return Array.from(seen.entries())
      .map(([id, rawName]) => ({ id, displayName: displayCompetitionWithFlag(rawName) }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [fixturesData]);

  const resultsCompetitionOptions = useMemo(() => {
    if (!resultsData) return [];
    const seen = new Map<string, string>();
    resultsData.forEach((m) => {
      if (m.goalserveCompetitionId && m.competition) {
        seen.set(m.goalserveCompetitionId, m.competition);
      }
    });
    return Array.from(seen.entries())
      .map(([id, rawName]) => ({ id, displayName: displayCompetitionWithFlag(rawName) }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [resultsData]);

  const liveFixtures = useMemo(() => {
    if (!fixturesData) return [];
    return fixturesData.map(apiMatchToMockMatch);
  }, [fixturesData]);

  const liveResults = useMemo(() => {
    if (!resultsData) return [];
    return resultsData.map(apiMatchToMockMatch);
  }, [resultsData]);

  const filterByTab = (matches: MockMatch[], tab: MatchTab): MockMatch[] => {
    return matches.filter((match) => {
      const kickoff = new Date(match.kickOffTime);
      const kickoffDay = startOfDay(kickoff);
      
      switch (tab) {
        case "today":
          return isToday(kickoff);
        case "tomorrow":
          return isTomorrow(kickoff);
        case "thisWeek":
          return isAfter(kickoffDay, tomorrow) && isBefore(kickoff, endOfWeek);
        case "results":
          return true;
        default:
          return true;
      }
    });
  };

  const applyFilters = (matches: MockMatch[]): MockMatch[] => {
    let filtered = [...matches];

    if (teamSearch.trim()) {
      const search = teamSearch.toLowerCase().trim();
      filtered = filtered.filter(
        m =>
          m.homeTeam.name.toLowerCase().includes(search) ||
          m.awayTeam.name.toLowerCase().includes(search) ||
          m.homeTeam.shortName.toLowerCase().includes(search) ||
          m.awayTeam.shortName.toLowerCase().includes(search)
      );
    }

    if (sortBy === "kickoff") {
      filtered.sort((a, b) => new Date(a.kickOffTime).getTime() - new Date(b.kickOffTime).getTime());
    } else if (sortBy === "competition") {
      filtered.sort((a, b) => a.competition.localeCompare(b.competition));
    }

    return filtered;
  };

  const todaysMatches = useMemo(() => filterByTab(liveFixtures, "today"), [liveFixtures]);
  const tomorrowsMatches = useMemo(() => filterByTab(liveFixtures, "tomorrow"), [liveFixtures]);
  const thisWeekMatches = useMemo(() => filterByTab(liveFixtures, "thisWeek"), [liveFixtures]);

  const counts = {
    today: todaysMatches.length,
    tomorrow: tomorrowsMatches.length,
    thisWeek: thisWeekMatches.length,
    results: liveResults.length,
  };

  const currentMatches = useMemo(() => {
    if (activeTab === "results") {
      return applyFilters(liveResults);
    }
    const tabMatches = filterByTab(liveFixtures, activeTab);
    return applyFilters(tabMatches);
  }, [activeTab, sortBy, teamSearch, liveFixtures, liveResults]);

  const isFixturesTab = activeTab !== "results";
  const isResultsTab = activeTab === "results";
  const isLoading = isFixturesTab ? fixturesLoading : resultsLoading;

  const ResultsControls = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2" data-testid="results-mode-toggle">
        <Button
          size="sm"
          variant={resultsMode === "quick" ? "default" : "outline"}
          onClick={() => { setResultsMode("quick"); setBrowseRound(""); }}
          data-testid="btn-quick"
        >
          Quick
        </Button>
        <Button
          size="sm"
          variant={resultsMode === "browse" ? "default" : "outline"}
          onClick={() => setResultsMode("browse")}
          data-testid="btn-browse"
        >
          Browse
        </Button>
      </div>

      {resultsMode === "quick" && (
        <div className="flex items-center gap-2" data-testid="quick-period-selector">
          <Button
            size="sm"
            variant={quickPeriod === "yesterday" ? "default" : "outline"}
            onClick={() => setQuickPeriod("yesterday")}
            data-testid="btn-yesterday"
          >
            Yesterday
          </Button>
          <Button
            size="sm"
            variant={quickPeriod === "thisWeek" ? "default" : "outline"}
            onClick={() => setQuickPeriod("thisWeek")}
            data-testid="btn-this-week"
          >
            This Week
          </Button>
          <Button
            size="sm"
            variant={quickPeriod === "last30" ? "default" : "outline"}
            onClick={() => setQuickPeriod("last30")}
            data-testid="btn-last-30"
          >
            Last 30 Days
          </Button>
        </div>
      )}

      {resultsMode === "browse" && (
        <div className="flex flex-wrap items-center gap-2" data-testid="browse-controls">
          <Select
            value={browseCompetitionId}
            onValueChange={(val) => {
              setBrowseCompetitionId(val === "all" ? "" : val);
              setBrowseRound("");
            }}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-browse-competition">
              <SelectValue placeholder="Select competition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All competitions</SelectItem>
              {resultsCompetitionOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={browseRound}
            onValueChange={(val) => setBrowseRound(val === "all" ? "" : val)}
            disabled={!browseCompetitionId}
          >
            <SelectTrigger className="w-[150px]" data-testid="select-browse-round">
              <SelectValue placeholder={browseCompetitionId ? "Select round" : "Select competition first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rounds</SelectItem>
              {roundsData?.rounds?.map((round) => (
                <SelectItem key={round} value={round}>
                  Round {round}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="heading-matches">Matches</h1>
            <p className="text-muted-foreground text-lg">
              Premier League fixtures and results
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
            <MatchesFilters
              sortBy={sortBy}
              onSortChange={setSortBy}
              teamSearch={teamSearch}
              onTeamSearchChange={setTeamSearch}
              variant="inline"
            />
          </div>

          {isFixturesTab && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2" data-testid="days-selector">
                <span className="text-sm text-muted-foreground">Show:</span>
                {[7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    size="sm"
                    variant={fixtureDays === days ? "default" : "outline"}
                    onClick={() => setFixtureDays(days)}
                    data-testid={`days-${days}`}
                  >
                    {days} days
                  </Button>
                ))}
              </div>
              <Select
                value={selectedCompetitionId}
                onValueChange={(val) => setSelectedCompetitionId(val === "all" ? "" : val)}
              >
                <SelectTrigger className="w-[220px]" data-testid="select-competition">
                  <SelectValue placeholder="All competitions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All competitions</SelectItem>
                  {fixtureCompetitionOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isResultsTab && <ResultsControls />}
        </div>

        <div className="md:hidden">
          <MatchesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
            variant="mobile"
          />

          {isFixturesTab && (
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2" data-testid="days-selector-mobile">
                <span className="text-sm text-muted-foreground">Show:</span>
                {[7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    size="sm"
                    variant={fixtureDays === days ? "default" : "outline"}
                    onClick={() => setFixtureDays(days)}
                    data-testid={`days-mobile-${days}`}
                  >
                    {days}d
                  </Button>
                ))}
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
                  {fixtureCompetitionOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isResultsTab && (
            <div className="mb-4">
              <ResultsControls />
            </div>
          )}

          <MatchesFilters
            sortBy={sortBy}
            onSortChange={setSortBy}
            teamSearch={teamSearch}
            onTeamSearchChange={setTeamSearch}
            variant="stacked"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16" data-testid="loading-matches">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">
              Loading {isFixturesTab ? "fixtures" : "results"}...
            </span>
          </div>
        ) : currentMatches.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-matches">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isFixturesTab ? "No upcoming fixtures" : "No results found"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isFixturesTab
                ? `No fixtures found in the next ${fixtureDays} days.`
                : resultsMode === "quick"
                ? `No results from ${quickPeriod === "yesterday" ? "yesterday" : quickPeriod === "thisWeek" ? "this week" : "the last 30 days"}.`
                : "No results found for the selected competition and round."}
            </p>
          </div>
        ) : (
          <MatchesList matches={currentMatches} activeTab={activeTab} />
        )}
      </div>
    </MainLayout>
  );
}
