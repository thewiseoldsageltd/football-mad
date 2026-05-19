import { memo } from "react";
import type { ReactNode } from "react";
import { getCountryFlagUrl } from "@/lib/flags";
import { FIFA_WORLD_CUP_LOGO_SRC, isFifaWorldCupCompSlug } from "@/lib/world-cup-nav";

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

const DISPLAY_LABEL_OVERRIDE_BY_SLUG: Record<string, string> = {
  "scottish-premiership": "Premiership",
  "scottish-championship": "Championship",
  "scottish-league-one": "League One",
  "scottish-league-two": "League Two",
  "scottish-cup": "Cup",
  "scottish-league-cup": "League Cup",
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
  const worldCupLogo = isFifaWorldCupCompSlug(slug) ? FIFA_WORLD_CUP_LOGO_SRC : null;
  const flagUrl = worldCupLogo ?? getCompetitionFlagUrlBySlug(slug);
  const displayLabel =
    typeof label === "string" ? (DISPLAY_LABEL_OVERRIDE_BY_SLUG[slug] ?? label) : label;

  return (
    <span className="inline-flex items-center gap-1.5">
      {flagUrl ? (
        worldCupLogo ? (
          <img
            src={flagUrl}
            alt="FIFA World Cup"
            className="h-[17px] w-auto max-w-[18px] shrink-0 object-contain"
            width={18}
            height={17}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <img
            src={flagUrl}
            alt=""
            className="w-[22px] h-[15px] rounded-sm object-cover shadow-sm shrink-0 border border-border/40"
            loading="lazy"
          />
        )
      ) : null}
      <span>{displayLabel}</span>
    </span>
  );
});
