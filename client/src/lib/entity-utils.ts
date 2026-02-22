import type { Article, Team, Player, Manager, Competition } from "@shared/schema";
import type { EntityData } from "@/components/entity-pill";

export interface ScoredEntity {
  id?: string;
  name: string;
  slug: string;
  shortName?: string | null;
  primaryColor?: string | null;
  logoUrl?: string | null;
  source: "tag" | "mention" | "fallback";
  score: number;
  entityType?: "competition" | "team" | "player" | "manager";
}

export interface EntitySets {
  competitions: ScoredEntity[];
  teams: ScoredEntity[];
  players: ScoredEntity[];
  managers: ScoredEntity[];
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const KNOWN_COMPETITIONS = [
  // English
  "Premier League", "Championship", "League One", "League Two",
  "Carabao Cup", "FA Cup", "EFL Cup", "League Cup",
  "National League", "National League North", "National League South",
  // Scottish
  "SPFL Premiership", "Scottish Premiership", "SPL",
  "Scottish Championship", "Scottish League One", "Scottish League Two",
  "Scottish Cup", "Scottish League Cup",
  // European
  "Champions League", "UEFA Champions League",
  "Europa League", "UEFA Europa League",
  "Conference League", "UEFA Europa Conference League",
  // Other major leagues
  "La Liga", "Serie A", "Bundesliga", "Ligue 1",
  "Eredivisie", "Primeira Liga", "Portuguese Primeira Liga",
  // Domestic cups
  "DFB Pokal", "Copa del Rey", "Coppa Italia", "Coupe de France",
  "KNVB Cup", "Taca de Portugal",
  // International
  "World Cup", "FIFA World Cup", "Euros", "European Championship",
  "Nations League", "UEFA Nations League",
  "Copa America", "Africa Cup of Nations", "AFCON",
];

const COMP_SHORT_CODES: Record<string, string> = {
  // English
  "Premier League": "EPL",
  "Championship": "EFL",
  "League One": "L1",
  "League Two": "L2",
  "Carabao Cup": "CC",
  "EFL Cup": "CC",
  "League Cup": "CC",
  "FA Cup": "FAC",
  // Scottish
  "SPFL Premiership": "SPFL",
  "Scottish Premiership": "SPFL",
  "SPL": "SPL",
  "Scottish Championship": "SCH",
  "Scottish League One": "SL1",
  "Scottish League Two": "SL2",
  "Scottish Cup": "SC",
  "Scottish League Cup": "SLC",
  // European
  "Champions League": "UCL",
  "UEFA Champions League": "UCL",
  "Europa League": "UEL",
  "UEFA Europa League": "UEL",
  "Conference League": "UECL",
  "UEFA Europa Conference League": "UECL",
  // Other leagues
  "La Liga": "LaLi",
  "Serie A": "SerA",
  "Bundesliga": "BuLi",
  "Ligue 1": "Lg1",
  "Eredivisie": "ERE",
  "Primeira Liga": "PrLi",
  // Lower leagues
  "National League": "NL",
  "National League North": "NLN",
  "National League South": "NLS",
  // Cups
  "DFB Pokal": "DFB",
  "Copa del Rey": "CdR",
  "Coppa Italia": "CIt",
  "Coupe de France": "CdF",
  // International
  "World Cup": "WC",
  "FIFA World Cup": "WC",
  "Euros": "EUR",
  "European Championship": "EUR",
  "Nations League": "NL",
  "UEFA Nations League": "UNL",
  "Copa America": "CA",
  "Africa Cup of Nations": "AFCON",
  "AFCON": "AFCON",
};

export function getCompShortCode(name: string): string {
  if (COMP_SHORT_CODES[name]) return COMP_SHORT_CODES[name];
  const ignore = ["the", "and", "of", "uefa"];
  const words = name.split(/\s+/).filter(w => !ignore.includes(w.toLowerCase()));
  return words.map(w => w[0]?.toUpperCase() || "").join("").slice(0, 4);
}

export function getTeamShortCode(team: { name: string; shortName?: string | null }): string {
  if (team.shortName && team.shortName.length <= 4) return team.shortName.toUpperCase();
  const name = team.name;
  const words = name.split(/\s+/);
  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w[0]?.toUpperCase() || "").join("");
  }
  return name.slice(0, 3).toUpperCase();
}

function textContains(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}

export function buildEntitySets(
  article: Article,
  teams: Team[],
  players?: Player[],
  managers?: Manager[],
  entityPlayers?: Array<{ id: string; name: string; slug: string }>,
  entityManagers?: Array<{ id: string; name: string; slug: string }>
): EntitySets {
  const tags = article.tags || [];
  const normalizedTags = tags.map(t => normalizeText(t));
  
  const result: EntitySets = {
    competitions: [],
    teams: [],
    players: [],
    managers: [],
  };
  
  const seenCompetitions = new Set<string>();
  const seenTeams = new Set<string>();
  const seenPlayers = new Set<string>();
  const seenManagers = new Set<string>();
  
  // 1. COMPETITIONS: Tag matches first (score=100)
  // First pass: exact matches against known competitions
  for (const comp of KNOWN_COMPETITIONS) {
    const normalizedComp = normalizeText(comp);
    const tagIndex = normalizedTags.findIndex(t => t === normalizedComp);
    if (tagIndex >= 0) {
      const slug = slugify(comp);
      if (!seenCompetitions.has(slug)) {
        seenCompetitions.add(slug);
        result.competitions.push({
          name: comp,
          slug,
          source: "tag",
          score: 100 - tagIndex,
          entityType: "competition",
        });
      }
    }
  }
  
  // Second pass: pattern-based detection for tags containing competition keywords
  const COMP_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
    // Scottish - specific patterns first (more specific = higher priority)
    { pattern: /\bspfl\s+premiership\b/i, name: "SPFL Premiership" },
    { pattern: /\bspfl\s+championship\b/i, name: "Scottish Championship" },
    { pattern: /\bspfl\s+league\s+one\b/i, name: "Scottish League One" },
    { pattern: /\bspfl\s+league\s+two\b/i, name: "Scottish League Two" },
    { pattern: /\bscottish\s+premiership\b/i, name: "Scottish Premiership" },
    { pattern: /\bscottish\s+championship\b/i, name: "Scottish Championship" },
    { pattern: /\bscottish\s+league\s+one\b/i, name: "Scottish League One" },
    { pattern: /\bscottish\s+league\s+two\b/i, name: "Scottish League Two" },
    { pattern: /\bscottish\s+cup\b/i, name: "Scottish Cup" },
    { pattern: /\bscottish\s+league\s+cup\b/i, name: "Scottish League Cup" },
    // European
    { pattern: /\bchampions\s+league\b/i, name: "Champions League" },
    { pattern: /\beuropa\s+league\b/i, name: "Europa League" },
    { pattern: /\bconference\s+league\b/i, name: "Conference League" },
    // English cups
    { pattern: /\bcarabao\s+cup\b/i, name: "Carabao Cup" },
    { pattern: /\befl\s+cup\b/i, name: "Carabao Cup" },
    { pattern: /\bfa\s+cup\b/i, name: "FA Cup" },
    // English leagues
    { pattern: /\bpremier\s+league\b/i, name: "Premier League" },
    { pattern: /\bchampionship\b/i, name: "Championship" },
    { pattern: /\bleague\s+one\b/i, name: "League One" },
    { pattern: /\bleague\s+two\b/i, name: "League Two" },
    { pattern: /\bnational\s+league\b/i, name: "National League" },
    // Other major leagues
    { pattern: /\bla\s+liga\b/i, name: "La Liga" },
    { pattern: /\bserie\s+a\b/i, name: "Serie A" },
    { pattern: /\bbundesliga\b/i, name: "Bundesliga" },
    { pattern: /\bligue\s+1\b/i, name: "Ligue 1" },
    { pattern: /\beredivisie\b/i, name: "Eredivisie" },
  ];
  
  for (let tagIdx = 0; tagIdx < tags.length; tagIdx++) {
    const tag = tags[tagIdx];
    for (const { pattern, name } of COMP_PATTERNS) {
      if (pattern.test(tag)) {
        const slug = slugify(name);
        if (!seenCompetitions.has(slug)) {
          seenCompetitions.add(slug);
          result.competitions.push({
            name,
            slug,
            source: "tag",
            score: 100 - tagIdx,
            entityType: "competition",
          });
        }
        break; // Only match one pattern per tag
      }
    }
  }
  
  // Check article.competition for mention or fallback addition
  const articleComp = article.competition;
  if (articleComp) {
    const compSlug = slugify(articleComp);
    const isMentioned = 
      (article.excerpt && textContains(article.excerpt, articleComp)) ||
      (article.content && textContains(article.content, articleComp));
    
    if (!seenCompetitions.has(compSlug)) {
      if (isMentioned) {
        // If mentioned in body/excerpt, add with score=60 (mention)
        seenCompetitions.add(compSlug);
        result.competitions.push({
          name: articleComp,
          slug: compSlug,
          source: "mention",
          score: 60,
          entityType: "competition",
        });
      } else {
        // Pure fallback (not tagged, not mentioned) - only for header pill selection
        seenCompetitions.add(compSlug);
        result.competitions.push({
          name: articleComp,
          slug: compSlug,
          source: "fallback",
          score: 10,
          entityType: "competition",
        });
      }
    }
  }
  
  // 2. TEAMS: Tag matches (score=100)
  for (const team of teams) {
    const normalizedName = normalizeText(team.name);
    const normalizedSlug = team.slug;
    const tagIndex = normalizedTags.findIndex(t => 
      t === normalizedName || t === normalizedSlug
    );
    if (tagIndex >= 0 && !seenTeams.has(team.slug)) {
      seenTeams.add(team.slug);
      result.teams.push({
        id: team.id,
        name: team.name,
        slug: team.slug,
        shortName: team.shortName,
        primaryColor: team.primaryColor,
        logoUrl: team.logoUrl,
        source: "tag",
        score: 100 - tagIndex,
        entityType: "team",
      });
    }
  }
  
  // 3. PLAYERS: Backend entities (mention) score=60, then tag matches
  if (entityPlayers?.length) {
    for (const p of entityPlayers) {
      if (!seenPlayers.has(p.slug)) {
        seenPlayers.add(p.slug);
        result.players.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          source: "mention",
          score: 60,
          entityType: "player",
        });
      }
    }
  }
  
  // Also check tag matches for players
  if (players?.length) {
    for (const player of players) {
      const normalizedName = normalizeText(player.name);
      const tagIndex = normalizedTags.findIndex(t => t === normalizedName);
      if (tagIndex >= 0 && !seenPlayers.has(player.slug)) {
        seenPlayers.add(player.slug);
        result.players.push({
          id: player.id,
          name: player.name,
          slug: player.slug,
          source: "tag",
          score: 100 - tagIndex,
          entityType: "player",
        });
      }
    }
  }
  
  // 4. MANAGERS: Backend entities (mention) score=60, then tag matches
  if (entityManagers?.length) {
    for (const m of entityManagers) {
      if (!seenManagers.has(m.slug)) {
        seenManagers.add(m.slug);
        result.managers.push({
          id: m.id,
          name: m.name,
          slug: m.slug,
          source: "mention",
          score: 60,
          entityType: "manager",
        });
      }
    }
  }
  
  // Also check tag matches for managers
  if (managers?.length) {
    for (const manager of managers) {
      const normalizedName = normalizeText(manager.name);
      const tagIndex = normalizedTags.findIndex(t => t === normalizedName);
      if (tagIndex >= 0 && !seenManagers.has(manager.slug)) {
        seenManagers.add(manager.slug);
        result.managers.push({
          id: manager.id,
          name: manager.name,
          slug: manager.slug,
          source: "tag",
          score: 100 - tagIndex,
          entityType: "manager",
        });
      }
    }
  }
  
  // Sort all groups: score desc, then name asc
  const sortFn = (a: ScoredEntity, b: ScoredEntity) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  };
  
  result.competitions.sort(sortFn);
  result.teams.sort(sortFn);
  result.players.sort(sortFn);
  result.managers.sort(sortFn);
  
  return result;
}

export interface TopPills {
  competitionPill: ScoredEntity | null;
  teamPills: ScoredEntity[];
  optionalThirdPill: ScoredEntity | null;
}

export function selectTopPills(entitySets: EntitySets): TopPills {
  // Filter out fallback competitions (only show if tagged or mentioned)
  const nonFallbackCompetitions = entitySets.competitions.filter(c => c.source !== "fallback");
  const competitionPill = nonFallbackCompetitions[0] || null;
  const teamPills = entitySets.teams.slice(0, 2);
  
  // Optional third pill: highest-scoring player or manager with score >= 60
  const topPlayer = entitySets.players[0];
  const topManager = entitySets.managers[0];
  
  let optionalThirdPill: ScoredEntity | null = null;
  
  if (topPlayer && topPlayer.score >= 60 && topManager && topManager.score >= 60) {
    optionalThirdPill = topPlayer.score >= topManager.score ? topPlayer : topManager;
  } else if (topPlayer && topPlayer.score >= 60) {
    optionalThirdPill = topPlayer;
  } else if (topManager && topManager.score >= 60) {
    optionalThirdPill = topManager;
  }
  
  return { competitionPill, teamPills, optionalThirdPill };
}

/**
 * When entity enrichment hasn't run (basic mode), convert raw tags into generic
 * pills so articles still get visible labels. Competition-matching tags are
 * already handled by buildEntitySets; this covers the remaining "unresolved" tags.
 */
export function buildTagFallbackPills(tags: string[], limit: number): EntityData[] {
  return tags.slice(0, limit).map((tag) => ({
    type: "competition" as const,
    name: tag,
    slug: slugify(tag),
    fallbackText: tag.slice(0, 2).toUpperCase(),
    href: `/news?tag=${encodeURIComponent(tag)}`,
  }));
}
