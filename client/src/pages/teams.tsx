import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TeamCard } from "@/components/cards/team-card";
import { TeamCardSkeleton } from "@/components/skeletons";
import { Input } from "@/components/ui/input";
import { Search, Shield } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@shared/schema";
import { GroupedCompetitionNav } from "@/components/navigation/grouped-competition-nav";
import { useLocation, useRoute, useSearch } from "wouter";
import { normalizeTeamsMvpFilterSlug } from "@shared/teams-mvp";
import { buildTeamsMvpCompetitionNavItems } from "@/lib/teams-mvp-tab-labels";

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

function buildTeamsListUrl(comp: string): string {
  if (comp === "all") return teamsIndex();
  return teamsLeagueBrowse(comp);
}

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const searchQuery = useSearch();
  const [, setLocation] = useLocation();
  const [matchLeague, leagueParams] = useRoute<{ competitionSlug: string }>("/teams/league/:competitionSlug");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  /** Legacy `?comp=` → `/teams/league/…` (replace). Path wins if both present. Invalid query → `/teams`. */
  useEffect(() => {
    if (matchLeague) return;
    const params = new URLSearchParams(searchQuery);
    const raw = params.get("comp");
    if (raw == null || raw === "") return;
    const n = normalizeTeamsMvpFilterSlug(raw);
    setLocation(n ? teamsLeagueBrowse(n) : teamsIndex(), { replace: true });
  }, [matchLeague, searchQuery, setLocation]);

  /** Path `/teams/league/:slug` is canonical; invalid segment → `/teams`. */
  useEffect(() => {
    if (!matchLeague || !leagueParams?.competitionSlug) return;
    const n = normalizeTeamsMvpFilterSlug(leagueParams.competitionSlug);
    if (!n) setLocation(teamsIndex(), { replace: true });
  }, [matchLeague, leagueParams?.competitionSlug, setLocation]);

  /** League filter: prefer path; during legacy redirect, `?comp=` still applies. */
  const selectedComp = useMemo(() => {
    if (matchLeague && leagueParams?.competitionSlug) {
      const n = normalizeTeamsMvpFilterSlug(leagueParams.competitionSlug);
      return n ?? "all";
    }
    const params = new URLSearchParams(searchQuery);
    const raw = params.get("comp") ?? "all";
    if (raw === "all") return "all";
    const n = normalizeTeamsMvpFilterSlug(raw);
    return n ?? "all";
  }, [matchLeague, leagueParams?.competitionSlug, searchQuery]);

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

  const competitionNavItems = useMemo(() => buildTeamsMvpCompetitionNavItems(), []);

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
    if (selectedComp === "all") return null;

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

    const selected = groups.find((g) => g.competitionFilterValue === selectedComp);
    if (!selected) return new Set<string>();
    return new Set(selected.teams.map((t) => t.id));
  }, [selectedComp, newsNav]);

  const handleCompetitionChange = useCallback(
    (value: string) => {
      setLocation(buildTeamsListUrl(value));
    },
    [setLocation],
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
              Browse and follow clubs from supported domestic leagues
            </p>
          </div>
        </div>

        <GroupedCompetitionNav
          showGroupTabs={false}
          selectedCompetition={selectedComp}
          onCompetitionChange={handleCompetitionChange}
          competitions={competitionNavItems}
          rightDesktopSlot={(
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search in this list…"
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
                placeholder="Search in this list…"
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
                : "No clubs match this competition filter yet. Try another league or check back later."}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
