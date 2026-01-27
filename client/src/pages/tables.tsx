import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Loader2 } from "lucide-react";
import { LeagueTable } from "@/components/tables/league-table";
import { CupProgress } from "@/components/tables/cup-progress";
import { EuropeProgress } from "@/components/tables/europe-progress";
import { TablesTopTabs } from "@/components/tables/tables-top-tabs";
import { TablesCompetitionTabs } from "@/components/tables/tables-competition-tabs";
import { TablesFilters } from "@/components/tables/tables-filters";
import { RoundToggle, type RoundInfo } from "@/components/shared/round-toggle";
import { getGoalserveLeagueId, getLeagueBySlug } from "@/lib/league-config";
import type { TableRow } from "@/data/tables-mock";

/**
 * Normalizes season strings to "YYYY/YYYY" format for API compatibility.
 * - "2025/26" or "2025-26" → "2025/2026"
 * - "2025/2026" → "2025/2026" (unchanged)
 * - null/undefined → undefined
 */
function normalizeSeason(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  
  // Match "YYYY/YY" or "YYYY-YY" format
  const shortMatch = input.match(/^(\d{4})[/\-](\d{2})$/);
  if (shortMatch) {
    const startYear = parseInt(shortMatch[1], 10);
    const endYear = startYear + 1;
    return `${startYear}/${endYear}`;
  }
  
  // Already "YYYY/YYYY" format - return as-is
  if (/^\d{4}\/\d{4}$/.test(input)) {
    return input;
  }
  
  // Return unchanged for any other format
  return input;
}

interface StandingsApiRow {
  position: number;
  team: {
    id: string;
    name: string;
    slug: string;
    crestUrl: string | null;
  };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  recentForm?: string | null;
}

interface LeagueMatchInfo {
  id: string;
  home: { id?: string; name: string };
  away: { id?: string; name: string };
  score: { home: number; away: number } | null;
  kickoffDate: string | null;
  kickoffTime: string | null;
  status: string;
}

interface StandingsApiResponse {
  snapshot: {
    leagueId: string;
    season: string;
    fetchedAt: string;
  };
  table: StandingsApiRow[];
  rounds?: RoundInfo[];
  matchesByRound?: Record<string, LeagueMatchInfo[]>;
  latestRoundKey?: string;
  latestScheduledRoundKey?: string;
  latestActiveRoundKey?: string;
}

function mapApiToTableRow(row: StandingsApiRow): TableRow {
  return {
    pos: row.position,
    teamName: row.team?.name ?? "Unknown Team",
    teamSlug: row.team?.slug,
    teamCrestUrl: row.team?.crestUrl ?? null,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    gd: row.goalDifference,
    pts: row.points,
    recentForm: row.recentForm ?? undefined,
  };
}

function LeagueMatchRow({ match }: { match: LeagueMatchInfo }) {
  const isCompleted = match.status === "fulltime" || match.status === "FT" || match.status === "finished";
  const isLive = match.status === "live" || match.status.match(/^\d+$/) || match.status === "HT";
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };
  
  return (
    <div 
      className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/30"
      data-testid={`match-row-${match.id}`}
    >
      <div className="flex-1 text-right pr-2 text-sm truncate">
        {match.home.name}
      </div>
      
      <div className="flex flex-col items-center min-w-[70px] justify-center">
        {isCompleted || isLive ? (
          <div className="flex items-center gap-1 text-sm font-semibold">
            <span>{match.score?.home ?? 0}</span>
            <span className="text-muted-foreground">-</span>
            <span>{match.score?.away ?? 0}</span>
            {isLive && (
              <span className="ml-1 text-xs text-emerald-500 font-medium">
                {match.status === "HT" ? "HT" : `${match.status}'`}
              </span>
            )}
          </div>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">
              {formatDate(match.kickoffDate)}
            </span>
            <span className="text-xs font-medium">
              {match.kickoffTime ?? "TBD"}
            </span>
          </>
        )}
      </div>
      
      <div className="flex-1 pl-2 text-sm truncate">
        {match.away.name}
      </div>
    </div>
  );
}

type TopTab = "leagues" | "cups" | "europe";

export default function TablesPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  const [topTab, setTopTab] = useState<TopTab>("leagues");
  const [leagueCompetition, setLeagueCompetition] = useState("premier-league");
  const [europeCompetition, setEuropeCompetition] = useState("champions-league");
  const [cupCompetition, setCupCompetition] = useState("fa-cup");
  const [season, setSeason] = useState("2025/26");
  const [tableView, setTableView] = useState("overall");
  const [selectedRound, setSelectedRoundState] = useState("");
  const [hasInitializedRound, setHasInitializedRound] = useState(false);
  
  // Helper to get current URL params
  const urlParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const urlRound = urlParams.get("round") ?? "";
  
  // Wrapper to update selectedRound and sync to URL
  const setSelectedRound = useCallback((newRound: string) => {
    setSelectedRoundState(newRound);
    // Update URL without full navigation
    const params = new URLSearchParams(searchString);
    if (newRound) {
      params.set("round", newRound);
    } else {
      params.delete("round");
    }
    const newSearch = params.toString();
    setLocation(`/tables${newSearch ? `?${newSearch}` : ""}`, { replace: true });
  }, [searchString, setLocation]);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const competitionScrollRef = useRef<HTMLDivElement>(null);
  const [showTopLeftFade, setShowTopLeftFade] = useState(false);
  const [showTopRightFade, setShowTopRightFade] = useState(false);
  const [showCompLeftFade, setShowCompLeftFade] = useState(false);
  const [showCompRightFade, setShowCompRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const topEl = topScrollRef.current;
    if (topEl) {
      const { scrollLeft, scrollWidth, clientWidth } = topEl;
      const isScrollable = scrollWidth > clientWidth;
      setShowTopLeftFade(isScrollable && scrollLeft > 0);
      setShowTopRightFade(isScrollable && scrollLeft + clientWidth < scrollWidth - 1);
    }

    const compEl = competitionScrollRef.current;
    if (compEl) {
      const { scrollLeft, scrollWidth, clientWidth } = compEl;
      const isScrollable = scrollWidth > clientWidth;
      setShowCompLeftFade(isScrollable && scrollLeft > 0);
      setShowCompRightFade(isScrollable && scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = 0;
    }
    if (competitionScrollRef.current) {
      competitionScrollRef.current.scrollLeft = 0;
    }
    setShowTopLeftFade(false);
    setShowCompLeftFade(false);
    requestAnimationFrame(updateFades);
  }, [updateFades]);

  useEffect(() => {
    if (competitionScrollRef.current) {
      competitionScrollRef.current.scrollLeft = 0;
    }
    setShowCompLeftFade(false);
    requestAnimationFrame(updateFades);
  }, [topTab, updateFades]);

  useEffect(() => {
    const topEl = topScrollRef.current;
    const compEl = competitionScrollRef.current;

    const handleScroll = () => updateFades();

    if (topEl) {
      topEl.addEventListener("scroll", handleScroll, { passive: true });
      const topObserver = new ResizeObserver(updateFades);
      topObserver.observe(topEl);
    }

    if (compEl) {
      compEl.addEventListener("scroll", handleScroll, { passive: true });
      const compObserver = new ResizeObserver(updateFades);
      compObserver.observe(compEl);
    }

    updateFades();

    return () => {
      topEl?.removeEventListener("scroll", handleScroll);
      compEl?.removeEventListener("scroll", handleScroll);
    };
  }, [updateFades, topTab]);

  const goalserveLeagueId = useMemo(
    () => getGoalserveLeagueId(leagueCompetition),
    [leagueCompetition]
  );

  const apiSeason = useMemo(() => normalizeSeason(season), [season]);

  const standingsUrl = useMemo(() => {
    if (!goalserveLeagueId) return null;
    const params = new URLSearchParams();
    params.set("leagueId", goalserveLeagueId);
    if (apiSeason) {
      params.set("season", apiSeason);
    }
    params.set("autoRefresh", "1");
    return `/api/standings?${params.toString()}`;
  }, [goalserveLeagueId, apiSeason]);

  const { data: standingsData, isLoading: standingsLoading, error: standingsError } = useQuery<StandingsApiResponse>({
    queryKey: [standingsUrl],
    enabled: topTab === "leagues" && !!standingsUrl,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const tableRows = useMemo(() => {
    if (!Array.isArray(standingsData?.table)) return [];
    return standingsData.table.map(mapApiToTableRow);
  }, [standingsData]);

  const rawMatchesByRound = standingsData?.matchesByRound ?? {};
  
  // Helper to check if a status means "scheduled"
  const isScheduledStatus = (status: string): boolean => {
    const s = status?.toLowerCase().trim() || "";
    return (
      s === "scheduled" || 
      s === "ns" || 
      s === "notstarted" || 
      s === "fixture" ||
      s === "tbd" ||
      s === "time tbd" ||
      s === "timetbd" ||
      /^\d{1,2}:\d{2}$/.test(s)
    );
  };

  // Build rounds from REAL DATA KEYS in matchesByRound
  // This ensures the UI shows the actual matchweek numbers from the data
  const { leagueRounds, leagueMatchesByRound, normalizedKeyToOriginal } = useMemo(() => {
    const rawKeys = Object.keys(rawMatchesByRound);
    
    // Debug logging (only when ?debug=1)
    const debugMode = typeof window !== "undefined" && 
      new URLSearchParams(window.location.search).get("debug") === "1";
    
    if (debugMode) {
      console.log("[Tables] Building rounds from matchesByRound keys:", rawKeys);
    }
    
    // Extract round numbers and build mapping
    const roundEntries: { num: number; originalKey: string; normalizedKey: string }[] = [];
    
    for (const key of rawKeys) {
      // Extract number from keys like "MW23", "23", "Matchweek 23", etc.
      const numMatch = String(key).match(/(\d+)/);
      if (!numMatch) continue;
      
      const num = parseInt(numMatch[1], 10);
      if (isNaN(num) || num < 1) continue;
      
      const normalizedKey = `MW${num}`;
      roundEntries.push({ num, originalKey: key, normalizedKey });
    }
    
    // Sort by number ascending
    roundEntries.sort((a, b) => a.num - b.num);
    
    // Build normalized mapping and rounds array
    const keyMap = new Map<string, string>(); // normalizedKey -> originalKey
    const rounds: RoundInfo[] = [];
    const normalizedMatchesByRound: Record<string, LeagueMatchInfo[]> = {};
    
    for (const entry of roundEntries) {
      keyMap.set(entry.normalizedKey, entry.originalKey);
      const matches = rawMatchesByRound[entry.originalKey] ?? [];
      normalizedMatchesByRound[entry.normalizedKey] = matches;
      
      // Compute date range from matches
      let startDate: string | null = null;
      let endDate: string | null = null;
      let hasScheduledMatches = false;
      
      for (const m of matches) {
        if (m.kickoffDate) {
          if (!startDate || m.kickoffDate < startDate) startDate = m.kickoffDate;
          if (!endDate || m.kickoffDate > endDate) endDate = m.kickoffDate;
        }
        if (isScheduledStatus(m.status)) {
          hasScheduledMatches = true;
        }
      }
      
      rounds.push({
        key: entry.normalizedKey,
        label: String(entry.num), // Just the number, display will add "Matchweek"
        startDate,
        endDate,
        matchesCount: matches.length,
      });
    }
    
    if (debugMode) {
      console.log("[Tables] Built rounds:", rounds.map(r => r.key));
    }
    
    return { 
      leagueRounds: rounds, 
      leagueMatchesByRound: normalizedMatchesByRound,
      normalizedKeyToOriginal: keyMap 
    };
  }, [rawMatchesByRound]);

  // Find the latest round with scheduled matches, and the latest with any matches
  const { latestScheduledRoundKey, latestActiveRoundKey } = useMemo(() => {
    let scheduled = "";
    let active = "";
    
    for (const round of leagueRounds) {
      const matches = leagueMatchesByRound[round.key] ?? [];
      if (matches.length > 0) {
        active = round.key;
      }
      if (matches.some(m => isScheduledStatus(m.status))) {
        scheduled = round.key;
      }
    }
    
    return { latestScheduledRoundKey: scheduled, latestActiveRoundKey: active };
  }, [leagueRounds, leagueMatchesByRound]);

  // Initialize selected round when data loads or competition changes
  // Priority: URL param > scheduled round > active round > last round (highest number)
  useEffect(() => {
    if (leagueRounds.length > 0 && !hasInitializedRound) {
      // Check if URL has a valid round
      if (urlRound && leagueRounds.some(r => r.key === urlRound)) {
        setSelectedRoundState(urlRound);
        setHasInitializedRound(true);
        return;
      }
      
      // Use scheduled round if available
      if (latestScheduledRoundKey && leagueRounds.some(r => r.key === latestScheduledRoundKey)) {
        setSelectedRound(latestScheduledRoundKey);
        setHasInitializedRound(true);
        return;
      }
      
      // Fallback to active round
      if (latestActiveRoundKey && leagueRounds.some(r => r.key === latestActiveRoundKey)) {
        setSelectedRound(latestActiveRoundKey);
        setHasInitializedRound(true);
        return;
      }
      
      // Fallback to last round (highest matchweek number)
      if (leagueRounds.length > 0) {
        setSelectedRound(leagueRounds[leagueRounds.length - 1].key);
        setHasInitializedRound(true);
      }
    }
  }, [leagueRounds, latestScheduledRoundKey, latestActiveRoundKey, hasInitializedRound, urlRound, setSelectedRound]);

  // Reset round selection when competition changes
  useEffect(() => {
    setSelectedRoundState("");
    setHasInitializedRound(false);
  }, [leagueCompetition]);

  const currentLeagueConfig = getLeagueBySlug(leagueCompetition);

  const renderLeaguesContent = () => {
    if (!goalserveLeagueId) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Standings data not available for this competition.
          </CardContent>
        </Card>
      );
    }

    if (standingsLoading) {
      return (
        <Card>
          <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading standings...</span>
          </CardContent>
        </Card>
      );
    }

    if (standingsError) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Failed to load standings. Please try again later.
          </CardContent>
        </Card>
      );
    }

    if (Array.isArray(standingsData?.table) && standingsData.table.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No standings data available. Check back later.
          </CardContent>
        </Card>
      );
    }

    const displayMatches = leagueMatchesByRound[selectedRound] ?? [];
    const currentRoundInfo = leagueRounds.find((r) => r.key === selectedRound);
    
    // Extract matchweek number from the key (e.g., "MW23" -> 23)
    // Never use array index, always use the real number from the key
    const matchweekNum = (() => {
      const match = selectedRound.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
      // Fallback to label if available
      if (currentRoundInfo?.label) {
        const labelMatch = currentRoundInfo.label.match(/(\d+)/);
        if (labelMatch) return parseInt(labelMatch[1], 10);
      }
      return null;
    })();
    
    const matchweekTitle = matchweekNum !== null ? `Matchweek ${matchweekNum}` : selectedRound;

    return (
      <div className="grid gap-6 lg:grid-cols-[1fr,400px] items-start">
        <Card className="h-fit">
          <CardContent className="p-4 sm:p-6">
            <LeagueTable data={tableRows} showZones={true} zones={currentLeagueConfig?.standingsZones} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Fixtures</h3>
              {leagueRounds.length > 0 && (
                <RoundToggle
                  labelType="Matchweek"
                  rounds={leagueRounds}
                  value={selectedRound}
                  onChange={setSelectedRound}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b flex items-center justify-between gap-2">
                <h4 className="font-semibold" data-testid="text-matchweek-title">
                  {matchweekTitle}
                </h4>
                <span className="text-sm text-muted-foreground">
                  {displayMatches.length} {displayMatches.length === 1 ? "match" : "matches"}
                </span>
              </div>
              <div>
                {displayMatches.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6" data-testid="text-no-fixtures">
                    No fixtures yet
                  </div>
                ) : (
                  displayMatches.map((match) => (
                    <LeagueMatchRow key={match.id} match={match} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderEuropeContent = () => {
    const normalizedSeason = normalizeSeason(season) || "2025/2026";
    return <EuropeProgress competitionSlug={europeCompetition} season={normalizedSeason} />;
  };

  const renderCupsContent = () => {
    const normalizedSeason = normalizeSeason(season) || "2025/2026";
    return <CupProgress cupSlug={cupCompetition} season={normalizedSeason} />;
  };

  const renderContent = () => {
    switch (topTab) {
      case "leagues":
        return renderLeaguesContent();
      case "europe":
        return renderEuropeContent();
      case "cups":
        return renderCupsContent();
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">
              Tables
            </h1>
            <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">
              League standings and tournament progress
            </p>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block mb-6">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <TablesTopTabs value={topTab} onValueChange={setTopTab} />

                <div className="h-6 w-px bg-border shrink-0" />

                <div className="overflow-x-auto scrollbar-hide">
                  <TablesCompetitionTabs
                    topTab={topTab}
                    leagueCompetition={leagueCompetition}
                    europeCompetition={europeCompetition}
                    cupCompetition={cupCompetition}
                    onLeagueChange={setLeagueCompetition}
                    onEuropeChange={setEuropeCompetition}
                    onCupChange={setCupCompetition}
                  />
                </div>
              </div>

              <TablesFilters
                topTab={topTab}
                season={season}
                tableView={tableView}
                onSeasonChange={setSeason}
                onTableViewChange={setTableView}
              />
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-4 mb-6">
          <div className="relative">
            <div
              ref={topScrollRef}
              className="overflow-x-auto scrollbar-hide"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <TablesTopTabs value={topTab} onValueChange={setTopTab} mobile />
            </div>
            {showTopLeftFade && (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
            )}
            {showTopRightFade && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
            )}
          </div>

          <div className="relative">
            <div
              ref={competitionScrollRef}
              className="overflow-x-auto scrollbar-hide"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <TablesCompetitionTabs
                topTab={topTab}
                leagueCompetition={leagueCompetition}
                europeCompetition={europeCompetition}
                cupCompetition={cupCompetition}
                onLeagueChange={setLeagueCompetition}
                onEuropeChange={setEuropeCompetition}
                onCupChange={setCupCompetition}
              />
            </div>
            {showCompLeftFade && (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
            )}
            {showCompRightFade && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
            )}
          </div>

          <TablesFilters
            topTab={topTab}
            season={season}
            tableView={tableView}
            onSeasonChange={setSeason}
            onTableViewChange={setTableView}
            mobile
          />
        </div>

        {renderContent()}
      </div>
    </MainLayout>
  );
}
