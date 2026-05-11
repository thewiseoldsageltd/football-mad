import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { teamHub } from "@/lib/urls";
import type { Team } from "@shared/schema";
import { EntityAvatar } from "@/components/entity-media";

interface TeamCardProps {
  team: Team;
}

/** MVP: discovery card — whole surface links to team hub (no follow / secondary actions). */
export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link href={teamHub(team.slug)} className="block" data-testid={`link-team-${team.slug}`}>
      <Card className="group hover-elevate active-elevate-2 h-full" data-testid={`card-team-${team.slug}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-[68px] h-[68px] rounded-xl flex items-center justify-center flex-shrink-0 border border-border/60 bg-white/95 dark:bg-background/95 shadow-sm p-0.5">
              <EntityAvatar
                entityType="team"
                entityId={team.id}
                label={team.name}
                surface="hub_header"
                sizeClassName="h-full w-full"
                shape="square"
                objectFit="contain"
                className="rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                {team.name}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
