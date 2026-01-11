import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TeamCard } from "@/components/cards/team-card";
import { TeamCardSkeleton } from "@/components/skeletons";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trophy } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@shared/schema";

const COMPETITIONS = [
  { value: "Premier League", label: "Premier League" },
  { value: "Championship", label: "Championship" },
  { value: "La Liga", label: "La Liga" },
  { value: "Bundesliga", label: "Bundesliga" },
  { value: "Serie A", label: "Serie A" },
  { value: "Ligue 1", label: "Ligue 1" },
  { value: "all", label: "All Competitions" },
];

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [competition, setCompetition] = useState("Premier League");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
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

  const filteredTeams = teams
    ?.filter((team) => {
      const matchesSearch = team.name.toLowerCase().includes(search.toLowerCase());
      const matchesCompetition = competition === "all" || team.league === competition;
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
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Teams</h1>
          <p className="text-muted-foreground text-lg">
            Browse and follow your favourite clubs
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-teams"
            />
          </div>
          <Select value={competition} onValueChange={setCompetition}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-competition">
              <Trophy className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Competition" />
            </SelectTrigger>
            <SelectContent>
              {COMPETITIONS.map((comp) => (
                <SelectItem key={comp.value} value={comp.value} data-testid={`option-comp-${comp.value}`}>
                  {comp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
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
