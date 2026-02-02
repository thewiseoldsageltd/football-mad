import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

// Season slug helpers: "2025/26" <-> "2025-26"
function seasonApiToSlug(apiSeason: string): string {
  const match = apiSeason.match(/^(\d{4})\/(\d{2,4})$/);
  if (match) {
    const startYear = match[1];
    const endPart = match[2];
    const endYear = endPart.length === 4 ? endPart.slice(2) : endPart;
    return `${startYear}-${endYear}`;
  }
  return apiSeason.replace("/", "-");
}

function seasonSlugToApi(slug: string): string {
  const match = slug.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return slug.replace("-", "/");
}

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

interface ApiRoundInfo {
  key: string;
  number: number;
  label: string;
  startDate: string | null;
  endDate: string | null;
  matchesCount: number;
  hasAnyMatches: boolean;
  hasScheduledMatches: boolean;
}

interface StandingsApiResponse {
  snapshot: {
    leagueId: string;
    season: string;
    fetchedAt: string;
  };
  table: StandingsApiRow[];
  rounds?: ApiRoundInfo[];
  matchesByRound?: Record<string, LeagueMatchInfo[]>;
  latestRoundKey?: string;
  latestScheduledRoundKey?: string;
  latestActiveRoundKey?: string;
  defaultMatchweek?: number;
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

// Status badge helpers for league fixtures (mirrors Europe pattern)
function getLeagueStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  const s = status.toLowerCase();
  // Postponed - show with neutral variant
  if (isLeagueMatchPostponed(status)) {
    return "outline";
  }
  // Completed
  if (["ft", "fulltime", "full-time", "finished", "aet", "after extra time", "penalties", "after pen."].includes(s)) {
    return "secondary";
  }
  // Live
  if (s === "ht" || s === "live" || s.includes("'") || /^\d+$/.test(s)) {
    return "destructive";
  }
  // Scheduled (no pill shown)
  return "outline";
}

function formatLeagueStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "ft" || s === "fulltime" || s === "finished") return "Full-Time";
  if (s === "aet" || s === "after extra time") return "AET";
  if (s === "penalties" || s === "after pen.") return "Penalties";
  if (s === "ht") return "Half-Time";
  if (s === "live" || s.includes("'") || /^\d+$/.test(s)) return "Live";
  return "Scheduled";
}

function isLeagueMatchCompleted(status: string): boolean {
  const s = status.toLowerCase();
  return ["ft", "fulltime", "full-time", "finished", "aet", "after extra time", "penalties", "after pen."].includes(s);
}

function isLeagueMatchLive(status: string): boolean {
  const s = status.toLowerCase();
  return s === "ht" || s === "live" || s.includes("'") || /^\d+$/.test(s);
}

function isLeagueMatchPostponed(status: string): boolean {
  const s = status.toLowerCase();
  return s === "pstp" || s === "postponed" || s === "postp" || s === "susp" || 
         s === "suspended" || s === "cancelled" || s === "canceled" || 
         s === "abandoned" || s === "abn";
}

// Format date as "Sun 1 Feb" using UK timezone
function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr + "T12:00:00");
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Europe/London",
    }).format(date);
  } catch {
    return "";
  }
}

function LeagueMatchRow({ match, showDateLabel }: { match: LeagueMatchInfo; showDateLabel: boolean }) {
  const isCompleted = isLeagueMatchCompleted(match.status);
  const isLive = isLeagueMatchLive(match.status);
  const isPostponed = isLeagueMatchPostponed(match.status);
  const isHalfTime = match.status.toLowerCase() === "ht";
  const isScheduled = !isCompleted && !isLive && !isPostponed;
  
  // Extract minute from status (e.g., "67'", "90+2", or just "67")
  const extractMinute = (): string | null => {
    const s = match.status;
    const minuteMatch = s.match(/^(\d+(?:\+\d+)?)'?$/);
    if (minuteMatch) return minuteMatch[1] + "'";
    const embeddedMatch = s.match(/(\d+(?:\+\d+)?)/);
    if (embeddedMatch && isLive && !isHalfTime) return embeddedMatch[1] + "'";
    return null;
  };
  
  // Build status label for pill (LIVE/HT/FT/PSTP only)
  const getStatusPillLabel = (): string => {
    if (isPostponed) return "PSTP";
    if (isHalfTime) return "HT";
    if (isLive) {
      const minute = extractMinute();
      return minute ? `LIVE ${minute}` : "LIVE";
    }
    if (isCompleted) return "FT";
    return "";
  };
  
  // Show pill for completed, live, OR postponed matches
  const showPill = isCompleted || isLive || isPostponed;
  const statusLabel = getStatusPillLabel();
  const badgeVariant = getLeagueStatusBadgeVariant(match.status);
  
  // For scheduled matches, format the date to show above the row (only if showDateLabel)
  const scheduledDateLabel = isScheduled && showDateLabel ? formatShortDate(match.kickoffDate) : "";
  
  return (
    <div 
      className="flex flex-col px-4 py-3 border-b last:border-b-0 hover:bg-muted/30"
      data-testid={`match-row-${match.id}`}
    >
      {/* Above the row: Status pill for Live/HT/FT/PSTP OR Date text for Scheduled (first of date block) */}
      {showPill ? (
        <div className="flex justify-center mb-2">
          <Badge variant={badgeVariant} className="text-xs" data-testid={`badge-status-${match.id}`}>
            {statusLabel}
          </Badge>
        </div>
      ) : scheduledDateLabel ? (
        <div className="flex justify-center mb-2">
          <span className="text-xs text-muted-foreground">{scheduledDateLabel}</span>
        </div>
      ) : null}
      
      {/* Main row: Home - Score/Time - Away */}
      <div className="flex items-center justify-between">
        <div className="flex-1 text-right pr-3 text-sm truncate">
          {match.home.name}
        </div>
        
        <div className="flex items-center justify-center min-w-[60px]">
          {isCompleted || isLive ? (
            <span className="text-sm font-semibold">
              {match.score?.home ?? 0} – {match.score?.away ?? 0}
            </span>
          ) : isPostponed ? (
            // Postponed: show time if available, else TBD
            <span className="text-sm text-muted-foreground">
              {match.kickoffTime ?? "TBD"}
            </span>
          ) : (
            // Scheduled: show kickoff time
            <span className="text-sm text-muted-foreground">
              {match.kickoffTime ?? "TBC"}
            </span>
          )}
        </div>
        
        <div className="flex-1 pl-3 text-sm truncate">
          {match.away.name}
        </div>
      </div>
    </div>
  );
}

type TopTab = "leagues" | "cups" | "europe";

export default function TablesPage() {
  const [, setLocation] = useLocation();
  
  // Get URL params from route: /tables/:leagueSlug/:seasonSlug
  const [, params] = useRoute("/tables/:leagueSlug/:seasonSlug");
  const leagueSlug = params?.leagueSlug ?? "premier-league";
  const seasonSlug = params?.seasonSlug ?? "2025-26";
  
  // Convert season slug to API format for queries
  const season = seasonSlugToApi(seasonSlug);
  
  const [topTab, setTopTab] = useState<TopTab>("leagues");
  const [europeCompetition, setEuropeCompetition] = useState("champions-league");
  const [cupCompetition, setCupCompetition] = useState("fa-cup");
  const [tableView, setTableView] = useState("overall");
  
  // Round is component state only (NOT in URL)
  const [selectedRound, setSelectedRound] = useState("");
  const userTouchedRoundRef = useRef(false);
  
  // Track previous league/season for reset detection
  const prevLeagueSeasonRef = useRef(`${leagueSlug}:${seasonSlug}`);
  
  // Reset round touched flag when league/season changes
  useEffect(() => {
    const key = `${leagueSlug}:${seasonSlug}`;
    if (prevLeagueSeasonRef.current !== key) {
      prevLeagueSeasonRef.current = key;
      userTouchedRoundRef.current = false;
      setSelectedRound("");
    }
  }, [leagueSlug, seasonSlug]);
  
  // Handle round change from user interaction (marks as touched)
  const handleRoundChange = useCallback((newRound: string) => {
    userTouchedRoundRef.current = true;
    setSelectedRound(newRound);
  }, []);
  
  // Handle league change - navigate to new URL
  const handleLeagueChange = useCallback((newLeague: string) => {
    if (newLeague === leagueSlug) return;
    setLocation(`/tables/${newLeague}/${seasonSlug}`, { replace: false });
  }, [leagueSlug, seasonSlug, setLocation]);
  
  // Handle season change - navigate to new URL
  const handleSeasonChange = useCallback((newSeason: string) => {
    const newSlug = seasonApiToSlug(newSeason);
    setLocation(`/tables/${leagueSlug}/${newSlug}`, { replace: false });
  }, [leagueSlug, setLocation]);

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
    () => getGoalserveLeagueId(leagueSlug),
    [leagueSlug]
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

  // Use backend-provided rounds directly (from Goalserve XML <week number="X"> containers)
  const leagueRounds = useMemo(() => {
    const apiRounds = standingsData?.rounds ?? [];
    // Sort by number to ensure MW1..MW38 order (ascending)
    const sorted = [...apiRounds].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    // Convert API rounds to RoundInfo format for RoundToggle component
    return sorted.map(r => ({
      key: r.key,
      label: r.label, // Just the number like "23"
      startDate: r.startDate,
      endDate: r.endDate,
      matchesCount: r.matchesCount,
    }));
  }, [standingsData?.rounds]);

  const leagueMatchesByRound = standingsData?.matchesByRound ?? {};
  const defaultMatchweek = standingsData?.defaultMatchweek ?? 1;
  const latestActiveRoundKey = standingsData?.latestActiveRoundKey ?? "";

  // Initialize selected round when data loads
  // Only auto-set if user hasn't manually changed the round
  useEffect(() => {
    if (leagueRounds.length > 0 && !userTouchedRoundRef.current && !selectedRound) {
      const defaultKey = `MW${defaultMatchweek}`;
      if (leagueRounds.some(r => r.key === defaultKey)) {
        setSelectedRound(defaultKey);
      } else if (leagueRounds.length > 0) {
        setSelectedRound(leagueRounds[leagueRounds.length - 1].key);
      }
    }
  }, [leagueRounds, defaultMatchweek, selectedRound]);

  const currentLeagueConfig = getLeagueBySlug(leagueSlug);

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

    // Get matches and sort by kickoff datetime ascending
    const rawMatches = leagueMatchesByRound[selectedRound] ?? [];
    const displayMatches = [...rawMatches].sort((a, b) => {
      const getKickoffTime = (m: LeagueMatchInfo): number => {
        const dateStr = m.kickoffDate ?? "9999-12-31";
        const timeStr = m.kickoffTime ?? "00:00";
        try {
          return new Date(`${dateStr}T${timeStr}`).getTime();
        } catch {
          return Number.MAX_SAFE_INTEGER;
        }
      };
      return getKickoffTime(a) - getKickoffTime(b);
    });
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
                  onChange={handleRoundChange}
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
                  (() => {
                    // Determine which SCHEDULED (not postponed) matches should show date label
                    // Only show date label for truly scheduled matches (first of each date block)
                    // Postponed matches should NOT show date labels (they show PSTP pill instead)
                    const seenDates = new Set<string>();
                    return displayMatches.map((match) => {
                      const isPostponed = isLeagueMatchPostponed(match.status);
                      const isScheduled = !isLeagueMatchCompleted(match.status) && 
                                          !isLeagueMatchLive(match.status) && 
                                          !isPostponed;
                      const dateKey = match.kickoffDate || "";
                      let showDateLabel = false;
                      // Only show date labels for scheduled (non-postponed) matches
                      if (isScheduled && dateKey && !seenDates.has(dateKey)) {
                        seenDates.add(dateKey);
                        showDateLabel = true;
                      }
                      return <LeagueMatchRow key={match.id} match={match} showDateLabel={showDateLabel} />;
                    });
                  })()
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
                    leagueCompetition={leagueSlug}
                    europeCompetition={europeCompetition}
                    cupCompetition={cupCompetition}
                    onLeagueChange={handleLeagueChange}
                    onEuropeChange={setEuropeCompetition}
                    onCupChange={setCupCompetition}
                  />
                </div>
              </div>

              <TablesFilters
                topTab={topTab}
                season={season}
                tableView={tableView}
                onSeasonChange={handleSeasonChange}
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
                leagueCompetition={leagueSlug}
                europeCompetition={europeCompetition}
                cupCompetition={cupCompetition}
                onLeagueChange={handleLeagueChange}
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
            onSeasonChange={handleSeasonChange}
            onTableViewChange={setTableView}
            mobile
          />
        </div>

        {renderContent()}
      </div>
    </MainLayout>
  );
}
