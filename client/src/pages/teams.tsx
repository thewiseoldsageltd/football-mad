import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TeamCard } from "@/components/cards/team-card";
import { TeamCardSkeleton } from "@/components/skeletons";
import { Input } from "@/components/ui/input";
import { Search, Shield } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@shared/schema";
import { GroupedCompetitionNav } from "@/components/navigation/grouped-competition-nav";
import { useLocation, useSearch } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TEAMS_MVP_COMPETITION_SLUG_SET,
  TEAMS_MVP_COMPETITION_TAB_ORDER,
  TEAMS_MVP_REGION_SLUGS,
  type TeamsMvpRegion,
  isTeamsMvpRegion,
  normalizeTeamsMvpFilterSlug,
} from "@shared/teams-mvp";

type NewsNavTeam = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
};

type NewsNavCompetition = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  filterValue: string;
  teams: NewsNavTeam[];
};

type NewsNavResponse = {
  competitions: NewsNavCompetition[];
  refinement?: {
    teamsByCompetition: {
      competitionId: string;
      competitionName: string;
      competitionSlug: string;
      competitionFilterValue: string;
      teams: NewsNavTeam[];
    }[];
    players: Array<{ id: string; name: string; slug?: string }>;
  };
};

function competitionTabOrderIndex(filterValue: string): number {
  const order = [...TEAMS_MVP_COMPETITION_TAB_ORDER];
  const idx = order.indexOf(filterValue);
  if (idx >= 0) return idx;
  const alias: Record<string, string> = {
    "champions-league": "uefa-champions-league",
    "europa-league": "uefa-europa-league",
    "conference-league": "uefa-conference-league",
  };
  const mapped = alias[filterValue];
  if (mapped) {
    const j = order.indexOf(mapped);
    if (j >= 0) return j;
  }
  return 100 + filterValue.charCodeAt(0);
}

function orderCompetitionTabs(tabs: { value: string; label: string }[]): { value: string; label: string }[] {
  const allTab = tabs.find((t) => t.value === "all");
  const rest = tabs.filter((t) => t.value !== "all").sort((a, b) => competitionTabOrderIndex(a.value) - competitionTabOrderIndex(b.value));
  return allTab ? [allTab, ...rest] : rest;
}

function buildTeamsListUrl(region: TeamsMvpRegion, comp: string): string {
  const params = new URLSearchParams();
  if (region !== "all") params.set("region", region);
  if (comp !== "all") params.set("comp", comp);
  const q = params.toString();
  return q ? `/teams?${q}` : "/teams";
}

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const searchQuery = useSearch();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { region, comp } = useMemo(() => {
    const params = new URLSearchParams(searchQuery);
    const rawComp = params.get("comp") ?? "all";
    const rawRegion = params.get("region") ?? "all";
    const comp =
      rawComp === "all" || TEAMS_MVP_COMPETITION_SLUG_SET.has(rawComp) ? rawComp : "all";
    const region: TeamsMvpRegion = isTeamsMvpRegion(rawRegion) ? rawRegion : "all";
    return { region, comp };
  }, [searchQuery]);

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams?teamsPage=1"],
  });

  const { data: newsNav, isLoading: navLoading } = useQuery<NewsNavResponse>({
    queryKey: ["/api/news/nav?scope=teams-mvp"],
  });

  const { data: followedTeamIds } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    enabled: isAuthenticated,
  });

  const followMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return apiRequest("POST", "/api/follows", { teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      toast({ title: "Team followed!" });
    },
    onError: () => {
      toast({ title: "Failed to follow team", variant: "destructive" });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return apiRequest("DELETE", `/api/follows/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      toast({ title: "Team unfollowed" });
    },
    onError: () => {
      toast({ title: "Failed to unfollow team", variant: "destructive" });
    },
  });

  const selectedCompetitionTeamIds = useMemo(() => {
    const groups =
      (newsNav?.refinement?.teamsByCompetition ?? []).length > 0
        ? (newsNav?.refinement?.teamsByCompetition ?? [])
        : (newsNav?.competitions ?? []).map((c) => ({
            competitionId: c.id,
            competitionName: c.name,
            competitionSlug: c.slug,
            competitionFilterValue: c.filterValue,
            teams: c.teams,
          }));

    if (comp !== "all") {
      const normalized = normalizeTeamsMvpFilterSlug(comp);
      const selected = groups.find((g) => normalizeTeamsMvpFilterSlug(g.competitionFilterValue) === normalized);
      if (!selected) return new Set<string>();
      return new Set(selected.teams.map((t) => t.id));
    }

    if (region === "all") return null;

    const allowed = new Set(TEAMS_MVP_REGION_SLUGS[region]);
    const ids = new Set<string>();
    for (const g of groups) {
      if (allowed.has(g.competitionFilterValue)) {
        for (const t of g.teams) ids.add(t.id);
      }
    }
    return ids;
  }, [comp, region, newsNav]);

  const competitionTabsOrdered = useMemo(() => {
    const comps = newsNav?.competitions ?? [];
    let scoped = comps;
    if (region !== "all") {
      const allowed = new Set(TEAMS_MVP_REGION_SLUGS[region]);
      scoped = comps.filter((c) => allowed.has(c.filterValue));
    }
    const raw = [
      { value: "all", label: "All" },
      ...scoped.map((c) => ({ value: c.filterValue, label: c.name })),
    ];
    return orderCompetitionTabs(raw);
  }, [newsNav?.competitions, region]);

  const selectedCompetitionValue = comp;

  const handleRegionChange = useCallback(
    (next: string) => {
      const r = isTeamsMvpRegion(next) ? next : "all";
      setLocation(buildTeamsListUrl(r, "all"));
    },
    [setLocation],
  );

  const handleCompetitionChange = useCallback(
    (value: string) => {
      setLocation(buildTeamsListUrl(region, value));
    },
    [region, setLocation],
  );

  const filteredTeams = useMemo(() => {
    if (!teams?.length) return [];
    const q = search.trim().toLowerCase();
    return teams
      .filter((team) => {
        const matchesSearch = !q || team.name.toLowerCase().includes(q);
        const ids = selectedCompetitionTeamIds;
        const inSelection = ids == null ? true : ids.has(team.id);
        return matchesSearch && inSelection;
      })
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [teams, search, selectedCompetitionTeamIds]);

  const competitionTabsForNav = useMemo(() => {
    if (competitionTabsOrdered.some((tab) => tab.value === selectedCompetitionValue)) return competitionTabsOrdered;
    return [...competitionTabsOrdered, { value: selectedCompetitionValue, label: selectedCompetitionValue }];
  }, [competitionTabsOrdered, selectedCompetitionValue]);

  const handleFollowToggle = (team: Team) => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }

    const isFollowing = followedTeamIds?.includes(team.id);
    if (isFollowing) {
      unfollowMutation.mutate(team.id);
    } else {
      followMutation.mutate(team.id);
    }
  };

  const emptyDueToSearch = Boolean(search.trim()) && filteredTeams.length === 0 && !isLoading && !navLoading;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">
              Teams
            </h1>
            <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">
              Browse and follow clubs from supported leagues and European competitions
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Region</span>
            <Tabs value={region} onValueChange={handleRegionChange}>
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
                <TabsTrigger value="all" className="text-sm" data-testid="tab-region-all">
                  All
                </TabsTrigger>
                <TabsTrigger value="england" className="text-sm" data-testid="tab-region-england">
                  England
                </TabsTrigger>
                <TabsTrigger value="scotland" className="text-sm" data-testid="tab-region-scotland">
                  Scotland
                </TabsTrigger>
                <TabsTrigger value="europe" className="text-sm" data-testid="tab-region-europe">
                  Europe
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <GroupedCompetitionNav
            showGroupTabs={false}
            selectedCompetition={selectedCompetitionValue}
            onCompetitionChange={handleCompetitionChange}
            competitions={competitionTabsForNav}
            rightDesktopSlot={(
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search teams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[200px] pl-10"
                  data-testid="input-search-teams"
                />
              </div>
            )}
            rightMobileSlot={(
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search teams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-sm font-normal text-center pr-9 placeholder:text-center placeholder:text-muted-foreground"
                  data-testid="input-search-teams-mobile"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            )}
            desktopCompetitionTabsTestId="tabs-competition"
            mobileCompetitionTabsTestId="tabs-competition-mobile"
            desktopCompetitionTabTestIdPrefix="tab-competition"
            mobileCompetitionTabTestIdPrefix="tab-competition"
          />
        </div>

        {isLoading || navLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isFollowing={followedTeamIds?.includes(team.id)}
                onFollowToggle={() => handleFollowToggle(team)}
                showFollowButton={true}
              />
            ))}
          </div>
        )}

        {!isLoading && !navLoading && filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {emptyDueToSearch
                ? `No teams found matching "${search.trim()}"`
                : "No clubs match this filter in the current scope. Try another league or region."}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
