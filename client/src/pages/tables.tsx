import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { LeagueTable } from "@/components/tables/league-table";
import { CupProgress } from "@/components/tables/cup-progress";
import { EuropeProgress } from "@/components/tables/europe-progress";
import { TablesFilters, type TablesSeasonOption } from "@/components/tables/tables-filters";
import { getGoalserveLeagueId, getLeagueBySlug } from "@/lib/league-config";
import type { TableRow } from "@/data/tables-mock";
import { leagueCompetitions, cupCompetitions, europeCompetitions } from "@/data/tables-mock";
import { GroupedCompetitionNav } from "@/components/navigation/grouped-competition-nav";
import { CompetitionFlagLabel } from "@/lib/competition-nav-flag-label";
import { usePageSeo } from "@/lib/seo";
import {
  areSeasonKeysEquivalent,
  calendarFootballSeasonKey,
  normalizeSeasonKey,
  seasonKeyToUiLabel,
  seasonKeyToUrlSlug,
  seasonSlugToCanonical,
} from "@shared/season";

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

interface SeasonsApiResponse {
  leagueId: string;
  currentSeason: TablesSeasonOption;
  seasons: TablesSeasonOption[];
}

interface StandingsApiResponse {
  snapshot: {
    leagueId: string;
    season: string;
    seasonLabel?: string;
    fetchedAt?: string;
    asOf?: string;
    nowUtc?: string;
    empty?: boolean;
    emptyReason?: string;
  };
  table: StandingsApiRow[];
  seasons?: TablesSeasonOption[];
  currentSeason?: TablesSeasonOption;
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

function fallbackSeasonEntry(): TablesSeasonOption {
  const key = calendarFootballSeasonKey();
  return { key, label: seasonKeyToUiLabel(key), slug: seasonKeyToUrlSlug(key) };
}

export default function TablesPage() {
  const [location, setLocation] = useLocation();

  const [isCupRoute, cupParams] = useRoute("/tables/cups/:cupSlug/:seasonSlug");
  const [isEuropeRoute, europeParams] = useRoute("/tables/europe/:competitionSlug/:seasonSlug");
  const [isLeagueRoute, leagueParams] = useRoute("/tables/:leagueSlug/:seasonSlug");
  const [isLeagueNoSeasonRoute, leagueNoSeasonParams] = useRoute("/tables/:leagueSlug");

  const topTab: TopTab = isCupRoute ? "cups" : isEuropeRoute ? "europe" : "leagues";

  const leagueSlug =
    leagueParams?.leagueSlug ??
    leagueNoSeasonParams?.leagueSlug ??
    "premier-league";
  const cupSlug = cupParams?.cupSlug ?? "fa-cup";
  const europeSlug = europeParams?.competitionSlug ?? "champions-league";

  const routeSeasonSlug = useMemo(() => {
    if (isCupRoute && cupParams?.seasonSlug) return cupParams.seasonSlug;
    if (isEuropeRoute && europeParams?.seasonSlug) return europeParams.seasonSlug;
    if (isLeagueRoute && leagueParams?.seasonSlug) return leagueParams.seasonSlug;
    return null;
  }, [isCupRoute, isEuropeRoute, isLeagueRoute, cupParams, europeParams, leagueParams]);

  const goalserveLeagueId = useMemo(
    () => getGoalserveLeagueId(leagueSlug),
    [leagueSlug],
  );

  const {
    data: seasonsData,
    isLoading: seasonsLoading,
  } = useQuery<SeasonsApiResponse>({
    queryKey: ["/api/standings/seasons", goalserveLeagueId],
    queryFn: async () => {
      const res = await fetch(`/api/standings/seasons?leagueId=${encodeURIComponent(goalserveLeagueId!)}`);
      if (!res.ok) throw new Error("Failed to load seasons");
      return res.json();
    },
    enabled: topTab === "leagues" && !!goalserveLeagueId,
    staleTime: 60_000,
  });

  const seasonOptions: TablesSeasonOption[] = useMemo(() => {
    if (topTab === "leagues" && seasonsData?.seasons?.length) return seasonsData.seasons;
    // Cups/Europe: keep a calendar-based option until dedicated season APIs exist.
    const fb = fallbackSeasonEntry();
    if (routeSeasonSlug) {
      const key = seasonSlugToCanonical(routeSeasonSlug) || fb.key;
      const entry = { key, label: seasonKeyToUiLabel(key), slug: seasonKeyToUrlSlug(key) };
      if (entry.key === fb.key) return [fb];
      return [entry, fb].filter(
        (s, i, arr) => arr.findIndex((x) => x.key === s.key) === i,
      );
    }
    return [fb];
  }, [topTab, seasonsData, routeSeasonSlug]);

  const currentSeason = seasonsData?.currentSeason ?? seasonOptions[0] ?? fallbackSeasonEntry();

  // Redirect league routes without a season (or with an unknown season) to current.
  useEffect(() => {
    if (topTab !== "leagues") return;
    if (seasonsLoading) return;
    if (!seasonsData?.currentSeason) return;

    if (!routeSeasonSlug) {
      setLocation(`/tables/${leagueSlug}/${seasonsData.currentSeason.slug}`, { replace: true });
      return;
    }

    const requested = seasonSlugToCanonical(routeSeasonSlug);
    const known = seasonsData.seasons.some((s) => areSeasonKeysEquivalent(s.key, requested));
    if (requested && known) return;

    // Invalid / unknown season slug → current season (do not clobber valid historical).
    if (!requested || !known) {
      setLocation(`/tables/${leagueSlug}/${seasonsData.currentSeason.slug}`, { replace: true });
    }
  }, [topTab, seasonsLoading, seasonsData, routeSeasonSlug, leagueSlug, setLocation]);

  const seasonSlug = routeSeasonSlug ?? currentSeason.slug;
  const apiSeason =
    seasonSlugToCanonical(seasonSlug) ||
    normalizeSeasonKey(currentSeason.key) ||
    currentSeason.key;
  const seasonUiLabel = seasonKeyToUiLabel(apiSeason);

  const handleLeagueChange = useCallback(
    (newLeague: string) => {
      if (newLeague === leagueSlug && isLeagueRoute) return;
      // Keep the requested season slug; destination page will validate against that league.
      setLocation(`/tables/${newLeague}/${seasonSlug}`, { replace: false });
    },
    [leagueSlug, seasonSlug, setLocation, isLeagueRoute],
  );

  const handleSeasonChange = useCallback(
    (newSeasonLabel: string) => {
      const match =
        seasonOptions.find((s) => s.label === newSeasonLabel) ||
        seasonOptions.find((s) => areSeasonKeysEquivalent(s.key, newSeasonLabel));
      const newSlug = match?.slug || seasonKeyToUrlSlug(newSeasonLabel);
      if (topTab === "leagues") {
        setLocation(`/tables/${leagueSlug}/${newSlug}`, { replace: false });
      } else if (topTab === "cups") {
        setLocation(`/tables/cups/${cupSlug}/${newSlug}`, { replace: false });
      } else {
        setLocation(`/tables/europe/${europeSlug}/${newSlug}`, { replace: false });
      }
    },
    [topTab, leagueSlug, cupSlug, europeSlug, setLocation, seasonOptions],
  );

  const navigateToGroup = useCallback(
    (group: "all" | TopTab) => {
      const slug = seasonSlug || currentSeason.slug;
      if (group === "all" || group === "leagues") {
        setLocation(`/tables/premier-league/${slug}`, { replace: false });
        return;
      }
      if (group === "cups") {
        setLocation(`/tables/cups/fa-cup/${slug}`, { replace: false });
        return;
      }
      setLocation(`/tables/europe/champions-league/${slug}`, { replace: false });
    },
    [seasonSlug, currentSeason.slug, setLocation],
  );

  const standingsUrl = useMemo(() => {
    if (!goalserveLeagueId || !apiSeason) return null;
    const params = new URLSearchParams();
    params.set("leagueId", goalserveLeagueId);
    params.set("season", apiSeason);
    params.set("tablesOnly", "1");
    return `/api/standings?${params.toString()}`;
  }, [goalserveLeagueId, apiSeason]);

  const {
    data: standingsData,
    isLoading: standingsLoading,
    error: standingsError,
    isError: standingsIsError,
  } = useQuery<StandingsApiResponse>({
    queryKey: [standingsUrl],
    enabled: topTab === "leagues" && !!standingsUrl && !!routeSeasonSlug,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const tableRows = useMemo(() => {
    if (!Array.isArray(standingsData?.table)) return [];
    return standingsData.table.map(mapApiToTableRow);
  }, [standingsData]);

  const isCurrentSeasonView = areSeasonKeysEquivalent(apiSeason, currentSeason.key);
  const isPreseasonEmpty =
    isCurrentSeasonView &&
    !standingsLoading &&
    (standingsData?.snapshot?.emptyReason === "preseason" ||
      (Array.isArray(standingsData?.table) && standingsData.table.length === 0) ||
      (standingsIsError && isCurrentSeasonView));

  const currentLeagueConfig = getLeagueBySlug(leagueSlug);
  const selectedCompetition =
    topTab === "leagues" ? leagueSlug : topTab === "cups" ? cupSlug : europeSlug;
  const selectedCompetitionLabel =
    topTab === "leagues"
      ? currentLeagueConfig?.name ?? "Tables"
      : topTab === "cups"
        ? cupCompetitions.find((comp) => comp.id === cupSlug)?.name ?? "Cups"
        : europeCompetitions.find((comp) => comp.id === europeSlug)?.name ?? "Europe";

  const tablesSeoTitle = seasonUiLabel
    ? `${selectedCompetitionLabel} Table & Standings ${seasonUiLabel} | Football Mad`
    : `${selectedCompetitionLabel} Table & Standings | Football Mad`;
  const tablesSeoDescription = seasonUiLabel
    ? `${selectedCompetitionLabel} table, standings, form and points for the ${seasonUiLabel} season on Football Mad.`
    : `${selectedCompetitionLabel} table, standings, form and points on Football Mad.`;

  usePageSeo({
    title: tablesSeoTitle,
    description: tablesSeoDescription,
    canonicalPath: location,
    imagePath: "/assets/football-mad-fm-logo.webp",
  });

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

    if (!routeSeasonSlug || seasonsLoading) {
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

    if (isPreseasonEmpty) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-preseason-empty">
            The {seasonUiLabel} table will appear when league standings data becomes available.
          </CardContent>
        </Card>
      );
    }

    if (standingsIsError || standingsError) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Failed to load standings. Please try again later.
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
    const normalizedSeason = apiSeason || currentSeason.key;
    return <EuropeProgress competitionSlug={europeSlug} season={normalizedSeason} />;
  };

  const renderCupsContent = () => {
    const normalizedSeason = apiSeason || currentSeason.key;
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

  // Bare /tables/:leagueSlug without season — wait for redirect effect.
  if (isLeagueNoSeasonRoute && !isLeagueRoute && !isCupRoute && !isEuropeRoute) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

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
              season={seasonUiLabel}
              seasons={seasonOptions}
              seasonsLoading={topTab === "leagues" && seasonsLoading}
              onSeasonChange={handleSeasonChange}
            />
          )}
          rightMobileSlot={(
            <TablesFilters
              season={seasonUiLabel}
              seasons={seasonOptions}
              seasonsLoading={topTab === "leagues" && seasonsLoading}
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
