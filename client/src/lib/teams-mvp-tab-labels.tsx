import { memo } from "react";
import { TEAMS_MVP_COMPETITION_TAB_ORDER } from "@shared/teams-mvp";
import { getCountryFlagUrl } from "@/lib/flags";
import type { GroupedCompetitionNavItem } from "@/components/navigation/grouped-competition-nav";

/** Country / region names must exist in `flags.ts` → ISO for flagcdn. */
const FLAG_COUNTRY_BY_SLUG: Record<string, string> = {
  "premier-league": "England",
  championship: "England",
  "league-one": "England",
  "league-two": "England",
  "national-league": "England",
  "scottish-premiership": "Scotland",
  "scottish-championship": "Scotland",
  "la-liga": "Spain",
  "serie-a": "Italy",
  bundesliga: "Germany",
  "ligue-1": "France",
  "uefa-champions-league": "Europe",
  "uefa-europa-league": "Europe",
  "uefa-conference-league": "Europe",
};

const DISPLAY_NAME_BY_SLUG: Record<string, string> = {
  "premier-league": "Premier League",
  championship: "Championship",
  "league-one": "League One",
  "league-two": "League Two",
  "national-league": "National League",
  "scottish-premiership": "Scottish Premiership",
  "scottish-championship": "Scottish Championship",
  "la-liga": "La Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
  "uefa-champions-league": "Champions League",
  "uefa-europa-league": "Europa League",
  "uefa-conference-league": "Conference League",
};

export const TeamsCompetitionTabLabel = memo(function TeamsCompetitionTabLabel({ slug }: { slug: string }) {
  const country = FLAG_COUNTRY_BY_SLUG[slug];
  const name = DISPLAY_NAME_BY_SLUG[slug] ?? slug;
  const flagUrl = country ? getCountryFlagUrl(country) : null;

  return (
    <span className="inline-flex items-center gap-2">
      {flagUrl ? (
        <img
          src={flagUrl}
          alt=""
          className="w-[22px] h-[15px] rounded-sm object-cover shadow-sm shrink-0 border border-border/40"
          loading="lazy"
        />
      ) : null}
      <span>{name}</span>
    </span>
  );
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
