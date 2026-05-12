import { memo } from "react";
import type { ReactNode } from "react";
import { getCountryFlagUrl } from "@/lib/flags";

const FLAG_COUNTRY_BY_SLUG: Record<string, string> = {
  "premier-league": "England",
  championship: "England",
  "league-one": "England",
  "league-two": "England",
  "national-league": "England",
  "fa-cup": "England",
  "efl-cup": "England",
  "scottish-premiership": "Scotland",
  "scottish-championship": "Scotland",
  "scottish-league-one": "Scotland",
  "scottish-league-two": "Scotland",
  "scottish-cup": "Scotland",
  "scottish-league-cup": "Scotland",
  "la-liga": "Spain",
  "copa-del-rey": "Spain",
  "serie-a": "Italy",
  "coppa-italia": "Italy",
  bundesliga: "Germany",
  "dfb-pokal": "Germany",
  "ligue-1": "France",
  "coupe-de-france": "France",
};

export function getCompetitionFlagUrlBySlug(slug: string): string | null {
  const country = FLAG_COUNTRY_BY_SLUG[slug];
  return country ? getCountryFlagUrl(country) : null;
}

export const CompetitionFlagLabel = memo(function CompetitionFlagLabel({
  slug,
  label,
}: {
  slug: string;
  label: ReactNode;
}) {
  const flagUrl = getCompetitionFlagUrlBySlug(slug);

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
      <span>{label}</span>
    </span>
  );
});
