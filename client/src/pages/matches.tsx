import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Calendar, Loader2 } from "lucide-react";
import { isToday, isTomorrow, addDays, startOfDay, isBefore, isAfter } from "date-fns";
import { MatchesTabs, type MatchTab } from "@/components/matches/MatchesTabs";
import { MatchesFilters } from "@/components/matches/MatchesFilters";
import { MatchesList } from "@/components/matches/MatchesList";
import { mockMatches, type MockMatch } from "@/components/matches/mockMatches";
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
  homeTeam: { id?: string; name?: string; slug?: string; goalserveTeamId?: string; nameFromRaw?: string; logoUrl?: string };
  awayTeam: { id?: string; name?: string; slug?: string; goalserveTeamId?: string; nameFromRaw?: string; logoUrl?: string };
}

// Country flag emoji mapping
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
  "El Salvador": "🇸🇻", "intl": "🌍",
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
  
  // Pattern: "Name (Country) [ID]"
  const fullMatch = competition.match(/^(.+?)\s*\(([^)]+)\)\s*\[(\d+)\]$/);
  if (fullMatch) {
    return { name: fullMatch[1].trim(), country: fullMatch[2].trim(), id: fullMatch[3] };
  }
  
  // Pattern: "Country: Name"
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

// NOTE: Goalserve match feed provides team IDs/names but does NOT reliably provide crest image URLs.
// TODO: If mapped Team objects have logoUrl/crestUrl/badgeUrl from our database, pass it through.
// For now, we use letter avatars as fallback.
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

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<MatchTab>("today");
  const [sortBy, setSortBy] = useState("kickoff");
  const [teamSearch, setTeamSearch] = useState("");
  const [fixtureDays, setFixtureDays] = useState(7);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");

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
      if (!res.ok) {
        throw new Error("Failed to load fixtures");
      }
      return res.json();
    },
  });

  const competitionOptions = useMemo(() => {
    if (!fixturesData) return [];
    const seen = new Map<string, string>();
    fixturesData.forEach((m) => {
      if (m.goalserveCompetitionId && m.competition) {
        seen.set(m.goalserveCompetitionId, m.competition);
      }
    });
    return Array.from(seen.entries())
      .map(([id, rawName]) => ({ 
        id, 
        displayName: displayCompetitionWithFlag(rawName) 
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [fixturesData]);

  const liveFixtures = useMemo(() => {
    if (!fixturesData) return [];
    return fixturesData.map(apiMatchToMockMatch);
  }, [fixturesData]);

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
          return match.status === "finished" || match.status === "postponed";
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
  const resultsMatches = useMemo(() => filterByTab(mockMatches, "results"), []);

  const counts = {
    today: todaysMatches.length,
    tomorrow: tomorrowsMatches.length,
    thisWeek: thisWeekMatches.length,
    results: resultsMatches.length,
  };

  const currentMatches = useMemo(() => {
    if (activeTab === "results") {
      return applyFilters(filterByTab(mockMatches, activeTab));
    }
    const tabMatches = filterByTab(liveFixtures, activeTab);
    return applyFilters(tabMatches);
  }, [activeTab, sortBy, teamSearch, liveFixtures]);

  const isFixturesTab = activeTab !== "results";

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

        <div className="hidden md:flex md:items-center md:justify-between gap-4 mb-6">
          <MatchesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
            variant="desktop"
          />
          <div className="flex items-center gap-4">
            {isFixturesTab && (
              <>
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
                    {competitionOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <MatchesFilters
              sortBy={sortBy}
              onSortChange={setSortBy}
              teamSearch={teamSearch}
              onTeamSearchChange={setTeamSearch}
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
                  {competitionOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {fixturesLoading && isFixturesTab ? (
          <div className="flex items-center justify-center py-16" data-testid="loading-fixtures">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading fixtures...</span>
          </div>
        ) : currentMatches.length === 0 && isFixturesTab ? (
          <div className="text-center py-16" data-testid="empty-fixtures">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No upcoming fixtures</h3>
            <p className="text-sm text-muted-foreground">
              No fixtures found in the next {fixtureDays} days.
            </p>
          </div>
        ) : (
          <MatchesList matches={currentMatches} activeTab={activeTab} />
        )}
      </div>
    </MainLayout>
  );
}
