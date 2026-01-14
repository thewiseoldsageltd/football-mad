export interface TeamStyle {
  bg: string;
  fg: string;
  abbr: string;
}

export const TEAM_STYLE_MAP: Record<string, TeamStyle> = {
  "Arsenal":            { bg: "#D02E26", fg: "#FFFFFF", abbr: "ARS" },
  "Aston Villa":        { bg: "#410724", fg: "#9DBDE2", abbr: "AVL" },
  "Bournemouth":        { bg: "#B7312D", fg: "#A89C74", abbr: "BOU" },
  "Brentford":          { bg: "#B12418", fg: "#0F0F0F", abbr: "BRE" },
  "Brighton":           { bg: "#1C4794", fg: "#FFFFFF", abbr: "BHA" },
  "Burnley":            { bg: "#570C3F", fg: "#7EC6F1", abbr: "BUR" },
  "Chelsea":            { bg: "#031484", fg: "#FFFFFF", abbr: "CHE" },
  "Crystal Palace":     { bg: "#2354A0", fg: "#D63827", abbr: "CRY" },
  "Everton":            { bg: "#000198", fg: "#FFFFFF", abbr: "EVE" },
  "Fulham":             { bg: "#0C0803", fg: "#FFFFFF", abbr: "FUL" },
  "Ipswich":            { bg: "#3A64A3", fg: "#FFFFFF", abbr: "IPS" },
  "Ipswich Town":       { bg: "#3A64A3", fg: "#FFFFFF", abbr: "IPS" },
  "Leeds":              { bg: "#273A8A", fg: "#F9D849", abbr: "LEE" },
  "Leicester":          { bg: "#003090", fg: "#FDBE11", abbr: "LEI" },
  "Leicester City":     { bg: "#003090", fg: "#FDBE11", abbr: "LEI" },
  "Liverpool":          { bg: "#D13630", fg: "#FFFFFF", abbr: "LIV" },
  "Luton":              { bg: "#F78F1E", fg: "#002D62", abbr: "LUT" },
  "Luton Town":         { bg: "#F78F1E", fg: "#002D62", abbr: "LUT" },
  "Man City":           { bg: "#A1C4E6", fg: "#051736", abbr: "MCI" },
  "Man Utd":            { bg: "#C93530", fg: "#1A1A1A", abbr: "MUN" },
  "Newcastle":          { bg: "#000000", fg: "#FFFFFF", abbr: "NEW" },
  "Nottingham Forest":  { bg: "#BB271A", fg: "#FFFFFF", abbr: "NFO" },
  "Sheffield United":   { bg: "#EE2737", fg: "#000000", abbr: "SHU" },
  "Sheffield Utd":      { bg: "#EE2737", fg: "#000000", abbr: "SHU" },
  "Southampton":        { bg: "#D71920", fg: "#FFFFFF", abbr: "SOU" },
  "Sunderland":         { bg: "#CA2D25", fg: "#FFFFFF", abbr: "SUN" },
  "Tottenham":          { bg: "#FFFFFF", fg: "#020C49", abbr: "TOT" },
  "West Ham":           { bg: "#651825", fg: "#54AFE2", abbr: "WHU" },
  "Wolves":             { bg: "#F3BC44", fg: "#181617", abbr: "WOL" },
};

const SLUG_TO_NAME: Record<string, string> = {
  "arsenal": "Arsenal",
  "aston-villa": "Aston Villa",
  "bournemouth": "Bournemouth",
  "brentford": "Brentford",
  "brighton": "Brighton",
  "burnley": "Burnley",
  "chelsea": "Chelsea",
  "crystal-palace": "Crystal Palace",
  "everton": "Everton",
  "fulham": "Fulham",
  "ipswich": "Ipswich",
  "ipswich-town": "Ipswich Town",
  "leeds": "Leeds",
  "leicester": "Leicester",
  "leicester-city": "Leicester City",
  "liverpool": "Liverpool",
  "luton": "Luton",
  "luton-town": "Luton Town",
  "manchester-city": "Man City",
  "man-city": "Man City",
  "manchester-united": "Man Utd",
  "man-utd": "Man Utd",
  "newcastle": "Newcastle",
  "nottingham-forest": "Nottingham Forest",
  "sheffield-united": "Sheffield United",
  "sheffield-utd": "Sheffield Utd",
  "southampton": "Southampton",
  "sunderland": "Sunderland",
  "tottenham": "Tottenham",
  "spurs": "Tottenham",
  "west-ham": "West Ham",
  "wolves": "Wolves",
};

const DEFAULT_STYLE: TeamStyle = {
  bg: "#2B2B2B",
  fg: "#FFFFFF",
  abbr: "---",
};

export function getTeamStyle(teamNameOrSlug: string | undefined | null): TeamStyle {
  if (!teamNameOrSlug) return DEFAULT_STYLE;

  if (TEAM_STYLE_MAP[teamNameOrSlug]) {
    return TEAM_STYLE_MAP[teamNameOrSlug];
  }

  const normalized = teamNameOrSlug.toLowerCase().replace(/\s+/g, "-");
  const mappedName = SLUG_TO_NAME[normalized];
  if (mappedName && TEAM_STYLE_MAP[mappedName]) {
    return TEAM_STYLE_MAP[mappedName];
  }

  for (const [name, style] of Object.entries(TEAM_STYLE_MAP)) {
    if (name.toLowerCase() === teamNameOrSlug.toLowerCase()) {
      return style;
    }
  }

  const fallbackAbbr = teamNameOrSlug.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "---";
  return { ...DEFAULT_STYLE, abbr: fallbackAbbr };
}

export function isLightBackground(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7;
}
