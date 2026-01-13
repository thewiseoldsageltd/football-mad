import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff } from "lucide-react";
import { teamHub } from "@/lib/urls";
import type { Team } from "@shared/schema";

interface TeamCardProps {
  team: Team;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  showFollowButton?: boolean;
}

export function TeamCard({ team, isFollowing = false, onFollowToggle, showFollowButton = false }: TeamCardProps) {
  return (
    <Card className="group hover-elevate active-elevate-2" data-testid={`card-team-${team.slug}`}>
      <CardContent className="p-4">
        <Link href={teamHub(team.slug)} className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: team.primaryColor || "#1a1a2e" }}
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-12 h-12 object-contain" />
            ) : (
              <span className="text-2xl font-bold text-white">
                {team.shortName?.[0] || team.name[0]}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
              {team.name}
            </h3>
            {team.stadiumName && (
              <p className="text-sm text-muted-foreground truncate">{team.stadiumName}</p>
            )}
            {team.manager && (
              <p className="text-xs text-muted-foreground truncate">Manager: {team.manager}</p>
            )}
          </div>
        </Link>
        {showFollowButton && onFollowToggle && (
          <Button
            variant={isFollowing ? "secondary" : "default"}
            size="sm"
            className="mt-3 w-full"
            onClick={(e) => {
              e.preventDefault();
              onFollowToggle();
            }}
            data-testid={`button-follow-${team.slug}`}
          >
            {isFollowing ? (
              <>
                <HeartOff className="h-4 w-4 mr-2" />
                Unfollow
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Follow
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
