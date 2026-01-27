export interface EuropeCompetitionConfig {
  slug: string;
  name: string;
  shortName: string;
  goalserveCompetitionId: string;
  country: string;
  format: "league_phase" | "group_stage";
  enabled: boolean;
}

export const europeConfigs: EuropeCompetitionConfig[] = [
  { 
    slug: "champions-league", 
    name: "UEFA Champions League", 
    shortName: "UCL", 
    goalserveCompetitionId: "1005", 
    country: "Europe",
    format: "league_phase",
    enabled: true
  },
  { 
    slug: "europa-league", 
    name: "UEFA Europa League", 
    shortName: "UEL", 
    goalserveCompetitionId: "1007", 
    country: "Europe",
    format: "league_phase",
    enabled: false
  },
  { 
    slug: "conference-league", 
    name: "UEFA Europa Conference League", 
    shortName: "UECL", 
    goalserveCompetitionId: "18853", 
    country: "Europe",
    format: "league_phase",
    enabled: false
  },
];

export function getEuropeCompetitionBySlug(slug: string): EuropeCompetitionConfig | undefined {
  return europeConfigs.find((c) => c.slug === slug);
}

export function getEnabledEuropeCompetitions(): EuropeCompetitionConfig[] {
  return europeConfigs.filter((c) => c.enabled);
}

export function getGoalserveEuropeId(slug: string): string | null {
  const config = europeConfigs.find((c) => c.slug === slug);
  return config?.goalserveCompetitionId ?? null;
}
