import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Loader2 } from "lucide-react";
import { LeagueTable } from "@/components/tables/league-table";
import { RoundsList } from "@/components/tables/rounds-list";
import { GroupSelector } from "@/components/tables/group-selector";
import { TablesTopTabs } from "@/components/tables/tables-top-tabs";
import { TablesCompetitionTabs } from "@/components/tables/tables-competition-tabs";
import { TablesFilters } from "@/components/tables/tables-filters";
import { getGoalserveLeagueId } from "@/lib/league-config";
import {
  getGroupsForEuropeCompetition,
  getRoundsForCup,
  knockoutRounds,
} from "@/data/tables-mock";
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

interface StandingsApiResponse {
  snapshot: {
    leagueId: string;
    season: string;
    fetchedAt: string;
  };
  table: StandingsApiRow[];
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

type TopTab = "leagues" | "cups" | "europe";
type EuropeView = "groups" | "knockout";

export default function TablesPage() {
  const [topTab, setTopTab] = useState<TopTab>("leagues");
  const [leagueCompetition, setLeagueCompetition] = useState("premier-league");
  const [europeCompetition, setEuropeCompetition] = useState("champions-league");
  const [cupCompetition, setCupCompetition] = useState("fa-cup");
  const [europeView, setEuropeView] = useState<EuropeView>("groups");
  const [selectedGroup, setSelectedGroup] = useState("Group A");
  const [season, setSeason] = useState("2025/26");
  const [tableView, setTableView] = useState("overall");

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

  useEffect(() => {
    const groups = Object.keys(getGroupsForEuropeCompetition(europeCompetition));
    if (groups.length > 0 && !groups.includes(selectedGroup)) {
      setSelectedGroup(groups[0]);
    }
  }, [europeCompetition, selectedGroup]);

  const currentGroups = getGroupsForEuropeCompetition(europeCompetition);
  const currentGroupNames = Object.keys(currentGroups);
  const currentGroupData = currentGroups[selectedGroup] || [];
  const currentCupRounds = getRoundsForCup(cupCompetition);

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
    return `/api/standings?${params.toString()}`;
  }, [goalserveLeagueId, apiSeason]);

  const { data: standingsData, isLoading: standingsLoading, error: standingsError } = useQuery<StandingsApiResponse>({
    queryKey: [standingsUrl],
    enabled: topTab === "leagues" && !!standingsUrl,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const tableRows = useMemo(() => {
    if (!Array.isArray(standingsData?.table)) return [];
    return standingsData.table.map(mapApiToTableRow);
  }, [standingsData]);

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

    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <LeagueTable data={tableRows} showZones={true} />
        </CardContent>
      </Card>
    );
  };

  const renderEuropeContent = () => {
    return (
      <div className="space-y-4">
        <Tabs value={europeView} onValueChange={(v) => setEuropeView(v as EuropeView)} className="w-auto">
          <TabsList className="h-auto gap-1" data-testid="tabs-europe-view">
            <TabsTrigger value="groups" data-testid="tab-groups">
              Group Stage
            </TabsTrigger>
            <TabsTrigger value="knockout" data-testid="tab-knockout">
              Knockout
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {europeView === "groups" ? (
          <div className="space-y-4">
            <GroupSelector
              groups={currentGroupNames}
              selectedGroup={selectedGroup}
              onGroupChange={setSelectedGroup}
            />
            <Card>
              <CardContent className="p-4 sm:p-6">
                <LeagueTable data={currentGroupData} showZones={false} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <RoundsList rounds={knockoutRounds} title="Knockout Stage" />
        )}
      </div>
    );
  };

  const renderCupsContent = () => {
    return <RoundsList rounds={currentCupRounds} />;
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
