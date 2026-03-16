export interface ClubBranding {
  primary: string;
  secondary: string;
}

export const defaultClubBranding: ClubBranding = {
  primary: "#1a1a2e",
  secondary: "#FFFFFF",
};

export const clubBranding: Record<string, ClubBranding> = {
  "arsenal": { primary: "#D02E26", secondary: "#FFFFFF" },
  "aston-villa": { primary: "#410724", secondary: "#9DBDE2" },
  "bournemouth": { primary: "#D72E34", secondary: "#000000" },
  "brentford": { primary: "#B12418", secondary: "#FFFFFF" },
  "brighton": { primary: "#1C4794", secondary: "#FFFFFF" },
  "burnley": { primary: "#570C3F", secondary: "#7EC6F1" },
  "chelsea": { primary: "#041384", secondary: "#FFFFFF" },
  "crystal-palace": { primary: "#D63827", secondary: "#1A4380" },
  "everton": { primary: "#000198", secondary: "#FFFFFF" },
  "fulham": { primary: "#070705", secondary: "#FFFFFF" },
  "leeds": { primary: "#F9D849", secondary: "#273A8A" },
  "liverpool": { primary: "#D13630", secondary: "#FFFFFF" },
  "manchester-city": { primary: "#A1C4E6", secondary: "#051736" },
  "manchester-utd": { primary: "#C93530", secondary: "#1A1A1A" },
  "newcastle": { primary: "#000000", secondary: "#FFFFFF" },
  "nottingham": { primary: "#BB271A", secondary: "#FFFFFF" },
  "sunderland": { primary: "#CA2D25", secondary: "#FFFFFF" },
  "tottenham": { primary: "#020C49", secondary: "#FFFFFF" },
  "west-ham": { primary: "#842B3A", secondary: "#54AFE2" },
  "wolves": { primary: "#F3BC44", secondary: "#000000" },
};

export function getClubBranding(slug: string | null | undefined): ClubBranding {
  if (typeof slug !== "string") return defaultClubBranding;
  const key = slug.trim().toLowerCase();
  if (!key) return defaultClubBranding;
  return clubBranding[key] ?? defaultClubBranding;
}
