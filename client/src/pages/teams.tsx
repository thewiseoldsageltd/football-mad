import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TeamCard } from "@/components/cards/team-card";
import { TeamCardSkeleton } from "@/components/skeletons";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Shield } from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@shared/schema";

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
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const isScrollable = scrollWidth > clientWidth;
    setShowLeftFade(isScrollable && scrollLeft > 0);
    setShowRightFade(isScrollable && scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(el);
    
    return () => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [handleScroll]);

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

  const competitionTabs = useMemo(() => {
    const comps = newsNav?.competitions ?? [];
    return [
      { value: "all", label: "All" },
      ...comps.map((c) => ({ value: c.filterValue, label: c.name })),
    ];
  }, [newsNav]);

  const selectedCompetitionTeamIds = useMemo(() => {
    if (competition === "all") return null;
    const groups = (newsNav?.refinement?.teamsByCompetition ?? []).length > 0
      ? newsNav!.refinement!.teamsByCompetition
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

        <Tabs value={competition} onValueChange={setCompetition} className="w-full">
          {/* Desktop: Tabs left, Search right */}
          <div className="hidden md:flex md:items-center md:justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-competition">
              {competitionTabs.map((comp) => (
                <TabsTrigger 
                  key={comp.value}
                  value={comp.value} 
                  data-testid={`tab-competition-${comp.value}`}
                >
                  {comp.label}
                </TabsTrigger>
              ))}
            </TabsList>

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
          </div>

          {/* Mobile: Scrollable tabs with dynamic fades, then centered search */}
          <div className="md:hidden space-y-4 mb-6">
            <div className="relative">
              <div 
                ref={scrollContainerRef}
                className="overflow-x-auto scrollbar-hide"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <TabsList className="inline-flex h-auto gap-1 w-max" data-testid="tabs-competition-mobile">
                  {competitionTabs.map((comp) => (
                    <TabsTrigger 
                      key={comp.value}
                      value={comp.value} 
                      className="whitespace-nowrap"
                      data-testid={`tab-competition-${comp.value}-mobile`}
                    >
                      {comp.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {showLeftFade && (
                <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
              )}
              {showRightFade && (
                <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
              )}
            </div>

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
          </div>
        </Tabs>

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
