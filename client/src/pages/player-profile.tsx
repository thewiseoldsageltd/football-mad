import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/main-layout";
import { teamHub } from "@/lib/urls";
import type { Player, Team } from "@shared/schema";

interface PlayerWithTeam extends Player {
  team?: Team | null;
}

export default function PlayerProfilePage() {
  const [, params] = useRoute("/players/:slug");
  const slug = params?.slug || "";

  const { data: player, isLoading, error } = useQuery<PlayerWithTeam>({
    queryKey: ["/api/players", slug],
    queryFn: async () => {
      const res = await fetch(`/api/players/${slug}`);
      if (!res.ok) throw new Error("Player not found");
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="flex gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !player) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Player not found</h1>
          <p className="text-muted-foreground mb-6">
            The player you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/teams">
            <Button data-testid="link-back-to-teams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const initials = player.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {player.team && (
          <Link href={teamHub(player.team.slug)}>
            <Button variant="ghost" size="sm" className="mb-6" data-testid="link-back-to-team">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {player.team.name}
            </Button>
          </Link>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  {player.number && (
                    <span className="text-2xl font-bold text-muted-foreground">#{player.number}</span>
                  )}
                  <CardTitle className="text-2xl">{player.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {player.position && <Badge variant="secondary">{player.position}</Badge>}
                  {player.nationality && (
                    <span className="text-sm text-muted-foreground">{player.nationality}</span>
                  )}
                </div>
                {player.team && (
                  <p className="text-sm text-muted-foreground mt-2">{player.team.name}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-muted-foreground py-8">
              <User className="h-8 w-8" />
              <div>
                <p className="font-medium">More player data coming soon</p>
                <p className="text-sm">Stats, career history, and detailed information will be available here.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
