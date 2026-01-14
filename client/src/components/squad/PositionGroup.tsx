import { PlayerCard } from "./PlayerCard";
import type { GoalserveSquadPlayer, AvailabilityEntry } from "@/lib/mock/goalserveMock";

interface PositionGroupProps {
  title: string;
  players: GoalserveSquadPlayer[];
  toMiss: AvailabilityEntry[];
  questionable: AvailabilityEntry[];
}

export function PositionGroup({ title, players, toMiss, questionable }: PositionGroupProps) {
  if (players.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title} ({players.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            toMiss={toMiss}
            questionable={questionable}
          />
        ))}
      </div>
    </div>
  );
}
