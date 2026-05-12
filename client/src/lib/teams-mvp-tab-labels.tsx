import { memo } from "react";
import { TEAMS_MVP_COMPETITION_TAB_ORDER } from "@shared/teams-mvp";
import type { GroupedCompetitionNavItem } from "@/components/navigation/grouped-competition-nav";
import { CompetitionFlagLabel } from "@/lib/competition-nav-flag-label";

const DISPLAY_NAME_BY_SLUG: Record<string, string> = {
  "premier-league": "Premier League",
  championship: "Championship",
  "league-one": "League One",
  "league-two": "League Two",
  "national-league": "National League",
  /** Teams nav only — shorter labels; slugs stay `scottish-*`. */
  "scottish-premiership": "Premiership",
  "scottish-championship": "Championship",
  "la-liga": "La Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
};

export const TeamsCompetitionTabLabel = memo(function TeamsCompetitionTabLabel({ slug }: { slug: string }) {
  const name = DISPLAY_NAME_BY_SLUG[slug] ?? slug;
  return <CompetitionFlagLabel slug={slug} label={name} />;
});

export function buildTeamsMvpCompetitionNavItems(): GroupedCompetitionNavItem[] {
  const tabs: GroupedCompetitionNavItem[] = [{ value: "all", label: "All" }];
  for (const slug of TEAMS_MVP_COMPETITION_TAB_ORDER) {
    tabs.push({
      value: slug,
      label: <TeamsCompetitionTabLabel slug={slug} />,
    });
  }
  return tabs;
}
