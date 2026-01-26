export interface CupConfig {
  slug: string;
  name: string;
  shortName: string;
  goalserveCompetitionId: string;
  country: string;
}

export const cupConfigs: CupConfig[] = [
  { slug: "fa-cup", name: "FA Cup", shortName: "FAC", goalserveCompetitionId: "1198", country: "England" },
  { slug: "efl-cup", name: "EFL Cup", shortName: "EFL", goalserveCompetitionId: "1199", country: "England" },
  { slug: "copa-del-rey", name: "Copa del Rey", shortName: "CDR", goalserveCompetitionId: "1397", country: "Spain" },
  { slug: "coppa-italia", name: "Coppa Italia", shortName: "CI", goalserveCompetitionId: "1264", country: "Italy" },
];

export function getCupBySlug(slug: string): CupConfig | undefined {
  return cupConfigs.find((c) => c.slug === slug);
}

export function getGoalserveCupId(slug: string): string | null {
  const config = cupConfigs.find((c) => c.slug === slug);
  return config?.goalserveCompetitionId ?? null;
}
