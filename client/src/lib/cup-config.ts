export interface CupConfig {
  slug: string;
  name: string;
  shortName: string;
  goalserveCompetitionId: string;
  country: string;
}

export const cupConfigs: CupConfig[] = [
  { slug: "fa-cup", name: "FA Cup", shortName: "FA Cup", goalserveCompetitionId: "1198", country: "England" },
  { slug: "efl-cup", name: "EFL Cup", shortName: "EFL Cup", goalserveCompetitionId: "1199", country: "England" },
  { slug: "scottish-cup", name: "Scottish Cup", shortName: "Scottish Cup", goalserveCompetitionId: "1371", country: "Scotland" },
  { slug: "scottish-league-cup", name: "Scottish League Cup", shortName: "Scottish League Cup", goalserveCompetitionId: "1372", country: "Scotland" },
  { slug: "copa-del-rey", name: "Copa del Rey", shortName: "Copa del Rey", goalserveCompetitionId: "1397", country: "Spain" },
  { slug: "coppa-italia", name: "Coppa Italia", shortName: "Coppa Italia", goalserveCompetitionId: "1264", country: "Italy" },
  { slug: "dfb-pokal", name: "DFB-Pokal", shortName: "DFB-Pokal", goalserveCompetitionId: "1226", country: "Germany" },
  { slug: "coupe-de-france", name: "Coupe de France", shortName: "Coupe de France", goalserveCompetitionId: "1218", country: "France" },
];

export function getCupBySlug(slug: string): CupConfig | undefined {
  return cupConfigs.find((c) => c.slug === slug);
}

export function getGoalserveCupId(slug: string): string | null {
  const config = cupConfigs.find((c) => c.slug === slug);
  return config?.goalserveCompetitionId ?? null;
}
