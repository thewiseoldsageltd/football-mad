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

/**
 * Formats Goalserve-enriched competition labels for UI display only.
 * Examples:
 * - "Premier League (England) [1204]" -> "Premier League"
 * - "UEFA Champions League (Eurocups) [1005]" -> "UEFA Champions League"
 */
export function formatCompetitionName(name: string): string {
  if (!name) return "";
  const withoutId = name.replace(/\s*\[[^\]]*\]\s*$/, "");
  const withoutTrailingParen = withoutId.replace(/\s*\([^)]*\)\s*$/, "");
  const cleaned = withoutTrailingParen.trim();
  return cleaned.replace(/^French\s+(Ligue\s+[12])$/i, "$1");
}

function inTitleBoost(articleTitle: string, entityName: string): boolean {
  const t = normalizeText(articleTitle);
  const n = normalizeText(entityName);
  if (!t || !n) return false;
  return t.includes(n);
}

function sortWithTitleBoost<T extends { name: string; salienceScore?: number | null }>(
  items: T[],
  articleTitle: string,
): T[] {
  return [...items].sort((a, b) => {
    const aTitle = inTitleBoost(articleTitle, a.name) ? 1 : 0;
    const bTitle = inTitleBoost(articleTitle, b.name) ? 1 : 0;
    if (aTitle !== bTitle) return bTitle - aTitle;

    const aSal = a.salienceScore ?? 0;
    const bSal = b.salienceScore ?? 0;
    if (aSal !== bSal) return bSal - aSal;

    return a.name.localeCompare(b.name);
  });
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

type EntityLike = { name: string; slug: string; salienceScore?: number | null };
type TeamLike = Pick<Team, "id" | "name" | "slug" | "shortName" | "primaryColor"> & {
  salienceScore?: number | null;
};

export type PillSourceArticle = Article & {
  entityTeams?: TeamLike[];
  entityPlayers?: EntityLike[];
  entityManagers?: EntityLike[];
  entityCompetitions?: EntityLike[];
};

const GENERIC_TAGS = new Set(["football", "soccer", "sport", "sports"]);
const FIXTURE_TAG_RE =
  /^\s*[\w'.&-]+(?:\s+[\w'.&-]+)*\s+v(?:s)?\.?\s+[\w'.&-]+(?:\s+[\w'.&-]+)*\s*$/i;

function normalizeTagValue(value: string): string {
  return normalizeText(value);
}

export function isGenericTag(name: string): boolean {
  return GENERIC_TAGS.has(normalizeTagValue(name));
}

export function isFixtureTag(name: string): boolean {
  return FIXTURE_TAG_RE.test(name.trim());
}

function toEntityData(
  type: EntityData["type"],
  name: string,
  opts?: { slug?: string; color?: string | null; iconUrl?: string }
): EntityData {
  const displayName = type === "competition" ? formatCompetitionName(name) : name;
  const slug = opts?.slug ?? slugify(name);
  const href =
    type === "competition"
      ? `/matches/${slug}`
      : type === "team"
        ? `/teams/${slug}`
        : type === "player"
          ? `/players/${slug}`
          : `/managers/${slug}`;
  return {
    type,
    name: displayName,
    slug,
    color: opts?.color,
    iconUrl: opts?.iconUrl,
    fallbackText: displayName.slice(0, 2).toUpperCase(),
    href,
  };
}

export interface PillGroups {
  competitionPills: EntityData[];
  teamPills: EntityData[];
  playerPills: EntityData[];
  managerPills: EntityData[];
}

type PillPlacement = "card" | "header" | "footer";

interface ResolvedEntity {
  type: "competition" | "team" | "player" | "manager";
  name: string;
}

interface EntityLookupValue {
  type: "competition" | "team" | "player" | "manager";
  name: string;
  slug: string;
  color?: string | null;
  iconUrl?: string;
}

interface EntityLookups {
  competitions: Map<string, EntityLookupValue>;
  teams: Map<string, EntityLookupValue>;
  players: Map<string, EntityLookupValue>;
  managers: Map<string, EntityLookupValue>;
}

function addLookup(map: Map<string, EntityLookupValue>, key: string, value: EntityLookupValue): void {
  const normalized = normalizeTagValue(key);
  if (!normalized || map.has(normalized)) return;
  map.set(normalized, value);
}

function buildEntityLookups(article: PillSourceArticle, teams: Team[] = []): EntityLookups {
  const competitions = new Map<string, EntityLookupValue>();
  const teamLookups = new Map<string, EntityLookupValue>();
  const players = new Map<string, EntityLookupValue>();
  const managers = new Map<string, EntityLookupValue>();

  for (const c of article.entityCompetitions ?? []) {
    const value: EntityLookupValue = {
      type: "competition",
      name: c.name,
      slug: c.slug || slugify(c.name),
      iconUrl: `/crests/comps/${c.slug || slugify(c.name)}.svg`,
    };
    addLookup(competitions, c.name, value);
    addLookup(competitions, c.slug, value);
  }

  for (const t of article.entityTeams ?? []) {
    const value: EntityLookupValue = {
      type: "team",
      name: t.shortName || t.name,
      slug: t.slug || slugify(t.name),
      color: t.primaryColor,
      iconUrl: `/crests/teams/${t.slug || slugify(t.name)}.svg`,
    };
    addLookup(teamLookups, t.name, value);
    if (t.shortName) addLookup(teamLookups, t.shortName, value);
    addLookup(teamLookups, t.slug, value);
    addLookup(teamLookups, t.slug.replace(/-/g, " "), value);
  }

  for (const p of article.entityPlayers ?? []) {
    const value: EntityLookupValue = {
      type: "player",
      name: p.name,
      slug: p.slug || slugify(p.name),
    };
    addLookup(players, p.name, value);
    addLookup(players, p.slug, value);
    addLookup(players, p.slug.replace(/-/g, " "), value);
  }

  for (const m of article.entityManagers ?? []) {
    const value: EntityLookupValue = {
      type: "manager",
      name: m.name,
      slug: m.slug || slugify(m.name),
    };
    addLookup(managers, m.name, value);
    addLookup(managers, m.slug, value);
    addLookup(managers, m.slug.replace(/-/g, " "), value);
  }

  return { competitions, teams: teamLookups, players, managers };
}

function lookupResolvedEntity(resolved: ResolvedEntity, lookups: EntityLookups): EntityLookupValue | null {
  const key = normalizeTagValue(resolved.name);
  if (resolved.type === "competition") return lookups.competitions.get(key) ?? null;
  if (resolved.type === "team") return lookups.teams.get(key) ?? null;
  if (resolved.type === "player") return lookups.players.get(key) ?? null;
  return lookups.managers.get(key) ?? null;
}

export function resolveEntityFromTag(name: string, lookups: EntityLookups): ResolvedEntity | null {
  if (!name || isGenericTag(name) || isFixtureTag(name)) return null;
  const key = normalizeTagValue(name);
  if (!key) return null;

  const comp = lookups.competitions.get(key);
  if (comp) return { type: "competition", name: comp.name };

  const team = lookups.teams.get(key);
  if (team) return { type: "team", name: team.name };

  const player = lookups.players.get(key);
  if (player) return { type: "player", name: player.name };

  const manager = lookups.managers.get(key);
  if (manager) return { type: "manager", name: manager.name };

  return null;
}

function dedupeByNameCaseInsensitive(pills: EntityData[]): EntityData[] {
  const seen = new Set<string>();
  const out: EntityData[] = [];
  for (const pill of pills) {
    const key = normalizeTagValue(pill.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(pill);
  }
  return out;
}

export function buildPillGroups(article: PillSourceArticle, teams: Team[] = []): PillGroups {
  const _unusedTeams = teams;
  void _unusedTeams;

  const mapCompetition = (c: EntityLike): EntityData =>
    toEntityData("competition", c.name, {
      slug: c.slug || slugify(c.name),
      iconUrl: `/crests/comps/${c.slug || slugify(c.name)}.svg`,
    });
  const mapTeam = (t: TeamLike): EntityData =>
    toEntityData("team", t.shortName || t.name, {
      slug: t.slug || slugify(t.name),
      color: t.primaryColor,
      iconUrl: `/crests/teams/${t.slug || slugify(t.name)}.svg`,
    });
  const mapPlayer = (p: EntityLike): EntityData =>
    toEntityData("player", p.name, { slug: p.slug || slugify(p.name) });
  const mapManager = (m: EntityLike): EntityData =>
    toEntityData("manager", m.name, { slug: m.slug || slugify(m.name) });

  return {
    competitionPills: dedupeByNameCaseInsensitive(sortWithTitleBoost(article.entityCompetitions ?? [], article.title).map(mapCompetition)),
    teamPills: dedupeByNameCaseInsensitive(sortWithTitleBoost(article.entityTeams ?? [], article.title).map(mapTeam)),
    playerPills: dedupeByNameCaseInsensitive(sortWithTitleBoost(article.entityPlayers ?? [], article.title).map(mapPlayer)),
    managerPills: dedupeByNameCaseInsensitive(sortWithTitleBoost(article.entityManagers ?? [], article.title).map(mapManager)),
  };
}

function flattenHierarchy(groups: PillGroups): EntityData[] {
  return [...groups.competitionPills, ...groups.teamPills, ...groups.playerPills, ...groups.managerPills];
}

export function selectEntityPills(
  article: PillSourceArticle,
  placement: PillPlacement,
  teams: Team[] = [],
): EntityData[] {
  const groups = buildPillGroups(article, teams);
  if (placement === "footer") {
    return dedupeByNameCaseInsensitive(flattenHierarchy(groups));
  }

  const result: EntityData[] = [];
  // Always start with graph hierarchy: competitions -> teams -> players -> managers
  if (groups.competitionPills[0]) result.push(groups.competitionPills[0]);
  result.push(...groups.teamPills.slice(0, 2));

  if (placement === "card") {
    if (result.length < 3) {
      result.push(...groups.playerPills.slice(0, 3 - result.length));
    }
    if (result.length < 3) {
      result.push(...groups.managerPills.slice(0, 3 - result.length));
    }
    return dedupeByNameCaseInsensitive(result).slice(0, 3);
  }

  if (result.length < 4 && groups.playerPills[0]) result.push(groups.playerPills[0]);
  if (result.length < 4 && groups.managerPills[0]) result.push(groups.managerPills[0]);
  return dedupeByNameCaseInsensitive(result).slice(0, 4);
}

export function buildPillsForCard(article: PillSourceArticle, teams: Team[] = []): EntityData[] {
  return selectEntityPills(article, "card", teams);
}

export function buildPillsForHeader(article: PillSourceArticle, teams: Team[] = []): EntityData[] {
  return selectEntityPills(article, "header", teams);
}

export function buildPillsForFooter(article: PillSourceArticle, teams: Team[] = []): EntityData[] {
  return selectEntityPills(article, "footer", teams);
}
