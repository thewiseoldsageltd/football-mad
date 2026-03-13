import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TeamCard } from "@/components/cards/team-card";
import { TeamCardSkeleton } from "@/components/skeletons";
import { Input } from "@/components/ui/input";
import { Search, Shield } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@shared/schema";
import { GroupedCompetitionNav } from "@/components/navigation/grouped-competition-nav";
import { sortCompetitionItemsLikeTables } from "@/lib/competition-nav-order";
import { useLocation, useSearch } from "wouter";
import { NEWS_COMPETITION_SLUGS } from "@shared/schema";

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

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [competition, setCompetition] = useState("all");
  const searchQuery = useSearch();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const validCompetitionSet = useMemo(
    () => new Set<string>(["all", ...NEWS_COMPETITION_SLUGS]),
    [],
  );

  const competitionFromUrl = useMemo(() => {
    const params = new URLSearchParams(searchQuery);
    const comp = params.get("comp") ?? "all";
    return validCompetitionSet.has(comp) ? comp : "all";
  }, [searchQuery, validCompetitionSet]);

  useEffect(() => {
    setCompetition((prev) => (prev === competitionFromUrl ? prev : competitionFromUrl));
  }, [competitionFromUrl]);

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });
  const { data: newsNav, isLoading: navLoading } = useQuery<NewsNavResponse>({
    queryKey: ["/api/news/nav"],
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

  const allCompetitionTabs = useMemo(() => {
    const comps = newsNav?.competitions ?? [];
    const tabs = [
      { value: "all", label: "All" },
      ...comps.map((c) => ({ value: c.filterValue, label: c.name })),
    ];
    const allTab = tabs[0];
    const ordered = sortCompetitionItemsLikeTables(tabs.slice(1));
    return [allTab, ...ordered];
  }, [newsNav]);

  const handleCompetitionChange = (value: string) => {
    setCompetition(value);
    const nextUrl = value === "all" ? "/teams" : `/teams?comp=${encodeURIComponent(value)}`;
    setLocation(nextUrl);
  };

  const selectedCompetitionTeamIds = useMemo(() => {
    if (competition === "all") return null;
    const groups = (newsNav?.refinement?.teamsByCompetition ?? []).length > 0
      ? (newsNav?.refinement?.teamsByCompetition ?? [])
      : (newsNav?.competitions ?? []).map((c) => ({
        competitionId: c.id,
        competitionName: c.name,
        competitionSlug: c.slug,
        competitionFilterValue: c.filterValue,
        teams: c.teams,
      }));
    const selected = groups.find((g) => g.competitionFilterValue === competition);
    if (!selected) return new Set<string>();
    return new Set(selected.teams.map((t) => t.id));
  }, [competition, newsNav]);

  const mvpTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const comp of newsNav?.competitions ?? []) {
      for (const team of comp.teams ?? []) ids.add(team.id);
    }
    return ids;
  }, [newsNav]);

  const filteredTeams = teams
    ?.filter((team) => mvpTeamIds.has(team.id))
    .filter((team) => {
      const matchesSearch = team.name.toLowerCase().includes(search.toLowerCase());
      const selectedTeamIds = selectedCompetitionTeamIds;
      const matchesCompetition = selectedTeamIds == null ? true : selectedTeamIds.has(team.id);
      return matchesSearch && matchesCompetition;
    })
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const competitionTabs = useMemo(() => {
    if (competition === "all") return allCompetitionTabs;
    if (allCompetitionTabs.some((tab) => tab.value === competition)) return allCompetitionTabs;
    return [...allCompetitionTabs, { value: competition, label: competition }];
  }, [allCompetitionTabs, competition]);

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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">Teams</h1>
            <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">
              Browse and follow your favourite clubs
            </p>
          </div>
        </div>

        <GroupedCompetitionNav
          showGroupTabs={false}
          selectedCompetition={competition}
          onCompetitionChange={handleCompetitionChange}
          competitions={competitionTabs}
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

        {isLoading || navLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTeams?.map((team) => (
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

        {!isLoading && filteredTeams?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No teams found matching "{search}"</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
