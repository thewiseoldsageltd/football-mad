import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { LeagueTable } from "@/components/tables/league-table";
import { CupProgress } from "@/components/tables/cup-progress";
import { EuropeProgress } from "@/components/tables/europe-progress";
import { TablesFilters } from "@/components/tables/tables-filters";
import { getGoalserveLeagueId, getLeagueBySlug } from "@/lib/league-config";
import type { TableRow } from "@/data/tables-mock";
import { leagueCompetitions, cupCompetitions, europeCompetitions } from "@/data/tables-mock";
import { GroupedCompetitionNav } from "@/components/navigation/grouped-competition-nav";
import { CompetitionFlagLabel } from "@/lib/competition-nav-flag-label";

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
  movementStatus?: string | null;
  qualificationNote?: string | null;
}

interface StandingsApiResponse {
  snapshot: {
    leagueId: string;
    season: string;
    fetchedAt?: string;
    asOf?: string;
    nowUtc?: string;
  };
  table: StandingsApiRow[];
}

function mapApiToTableRow(row: StandingsApiRow): TableRow {
  return {
    pos: row.position,
    teamId: row.team?.id ?? undefined,
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
    movementStatus: row.movementStatus ?? null,
    qualificationNote: row.qualificationNote ?? null,
  };
}


type TopTab = "leagues" | "cups" | "europe";

export default function TablesPage() {
  const [, setLocation] = useLocation();

  const [isCupRoute, cupParams] = useRoute("/tables/cups/:cupSlug/:seasonSlug");
  const [isEuropeRoute, europeParams] = useRoute("/tables/europe/:competitionSlug/:seasonSlug");
  const [isLeagueRoute, leagueParams] = useRoute("/tables/:leagueSlug/:seasonSlug");

  const topTab: TopTab = isCupRoute ? "cups" : isEuropeRoute ? "europe" : "leagues";

  const seasonSlug = useMemo(() => {
    if (isCupRoute && cupParams?.seasonSlug) return cupParams.seasonSlug;
    if (isEuropeRoute && europeParams?.seasonSlug) return europeParams.seasonSlug;
    if (isLeagueRoute && leagueParams?.seasonSlug) return leagueParams.seasonSlug;
    return "2025-26";
  }, [isCupRoute, isEuropeRoute, isLeagueRoute, cupParams, europeParams, leagueParams]);

  const leagueSlug = leagueParams?.leagueSlug ?? "premier-league";
  const cupSlug = cupParams?.cupSlug ?? "fa-cup";
  const europeSlug = europeParams?.competitionSlug ?? "champions-league";

  // Convert season slug to API format for queries
  const season = seasonSlugToApi(seasonSlug);

  const handleLeagueChange = useCallback(
    (newLeague: string) => {
      if (newLeague === leagueSlug && isLeagueRoute) return;
      setLocation(`/tables/${newLeague}/${seasonSlug}`, { replace: false });
    },
    [leagueSlug, seasonSlug, setLocation, isLeagueRoute],
  );

  const handleSeasonChange = useCallback(
    (newSeason: string) => {
      const newSlug = seasonApiToSlug(newSeason);
      if (topTab === "leagues") {
        setLocation(`/tables/${leagueSlug}/${newSlug}`, { replace: false });
      } else if (topTab === "cups") {
        setLocation(`/tables/cups/${cupSlug}/${newSlug}`, { replace: false });
      } else {
        setLocation(`/tables/europe/${europeSlug}/${newSlug}`, { replace: false });
      }
    },
    [topTab, leagueSlug, cupSlug, europeSlug, setLocation],
  );

  const navigateToGroup = useCallback(
    (group: "all" | TopTab) => {
      if (group === "all" || group === "leagues") {
        setLocation(`/tables/premier-league/${seasonSlug}`, { replace: false });
        return;
      }
      if (group === "cups") {
        setLocation(`/tables/cups/fa-cup/${seasonSlug}`, { replace: false });
        return;
      }
      setLocation(`/tables/europe/champions-league/${seasonSlug}`, { replace: false });
    },
    [seasonSlug, setLocation],
  );

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
    params.set("tablesOnly", "1");
    return `/api/standings?${params.toString()}`;
  }, [goalserveLeagueId, apiSeason]);

  const { data: standingsData, isLoading: standingsLoading, error: standingsError } = useQuery<StandingsApiResponse>({
    queryKey: [standingsUrl],
    enabled: topTab === "leagues" && !!standingsUrl,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const tableRows = useMemo(() => {
    if (!Array.isArray(standingsData?.table)) return [];
    return standingsData.table.map(mapApiToTableRow);
  }, [standingsData]);

  const currentLeagueConfig = getLeagueBySlug(leagueSlug);
  const selectedCompetition =
    topTab === "leagues" ? leagueSlug : topTab === "cups" ? cupSlug : europeSlug;
  const visibleCompetitions = useMemo(() => {
    if (topTab === "leagues") {
      return leagueCompetitions.map((comp) => ({
        value: comp.id,
        label: <CompetitionFlagLabel slug={comp.id} label={comp.name} />,
      }));
    }
    if (topTab === "cups") return cupCompetitions.map((comp) => ({ value: comp.id, label: comp.name }));
    return europeCompetitions.map((comp) => ({ value: comp.id, label: comp.name }));
  }, [topTab]);

  const handleCompetitionChange = useCallback(
    (value: string) => {
      if (topTab === "leagues") {
        handleLeagueChange(value);
        return;
      }
      if (topTab === "cups") {
        if (value === cupSlug && isCupRoute) return;
        setLocation(`/tables/cups/${value}/${seasonSlug}`, { replace: false });
        return;
      }
      if (value === europeSlug && isEuropeRoute) return;
      setLocation(`/tables/europe/${value}/${seasonSlug}`, { replace: false });
    },
    [topTab, handleLeagueChange, cupSlug, europeSlug, seasonSlug, setLocation, isCupRoute, isEuropeRoute],
  );

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
        <Card className="h-fit">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <Skeleton className="h-4 w-36" />
            <div className="space-y-2">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="grid grid-cols-[32px_1fr_52px] items-center gap-3">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-10 justify-self-end" />
                </div>
              ))}
            </div>
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

    return (
      <Card className="h-fit">
        <CardContent className="p-4 sm:p-6">
          {standingsData?.snapshot?.asOf && (
            <div className="mb-3 text-xs text-muted-foreground" data-testid="text-standings-last-updated">
              Last updated: {new Date(standingsData.snapshot.asOf).toLocaleString("en-GB", { hour12: false })}
            </div>
          )}
          <LeagueTable data={tableRows} showZones={true} zones={currentLeagueConfig?.standingsZones} />
        </CardContent>
      </Card>
    );
  };

  const renderEuropeContent = () => {
    const normalizedSeason = normalizeSeason(season) || "2025/2026";
    return <EuropeProgress competitionSlug={europeSlug} season={normalizedSeason} />;
  };

  const renderCupsContent = () => {
    const normalizedSeason = normalizeSeason(season) || "2025/2026";
    return <CupProgress cupSlug={cupSlug} season={normalizedSeason} />;
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

        <GroupedCompetitionNav
          selectedGroup={topTab}
          onGroupChange={(group) => {
            navigateToGroup(group);
          }}
          selectedCompetition={selectedCompetition}
          onCompetitionChange={handleCompetitionChange}
          competitions={visibleCompetitions}
          rightDesktopSlot={(
            <TablesFilters
              season={season}
              onSeasonChange={handleSeasonChange}
            />
          )}
          rightMobileSlot={(
            <TablesFilters
              season={season}
              onSeasonChange={handleSeasonChange}
              mobile
            />
          )}
          desktopGroupTabsTestId="tabs-top"
          desktopCompetitionTabsTestId="tabs-competition"
          mobileGroupTabsTestId="tabs-top-mobile"
          mobileCompetitionTabsTestId="tabs-competition-mobile"
          desktopGroupTabTestIdPrefix="tab-top"
          desktopCompetitionTabTestIdPrefix={topTab === "leagues" ? "tab-league" : topTab === "cups" ? "tab-cup" : "tab-europe"}
          mobileGroupTabTestIdPrefix="tab-top"
          mobileCompetitionTabTestIdPrefix="tab-competition"
        />

        {renderContent()}
      </div>
    </MainLayout>
  );
}
