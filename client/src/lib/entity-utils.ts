import type { Article, Team, Player, Manager, Competition } from "@shared/schema";

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
  "Premier League", "Championship", "League One", "League Two",
  "Carabao Cup", "FA Cup", "EFL Cup", "League Cup",
  "Champions League", "UEFA Champions League",
  "Europa League", "UEFA Europa League",
  "Conference League", "UEFA Europa Conference League",
  "La Liga", "Serie A", "Bundesliga", "Ligue 1",
  "DFB Pokal", "Copa del Rey", "Coppa Italia", "Coupe de France"
];

const COMP_SHORT_CODES: Record<string, string> = {
  "Premier League": "EPL",
  "Championship": "EFL",
  "League One": "L1",
  "League Two": "L2",
  "Carabao Cup": "CC",
  "EFL Cup": "CC",
  "League Cup": "CC",
  "FA Cup": "FAC",
  "Champions League": "UCL",
  "UEFA Champions League": "UCL",
  "Europa League": "UEL",
  "UEFA Europa League": "UEL",
  "Conference League": "UECL",
  "UEFA Europa Conference League": "UECL",
  "La Liga": "LaLi",
  "Serie A": "SerA",
  "Bundesliga": "BuLi",
  "Ligue 1": "L1",
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
  const competitionPill = entitySets.competitions[0] || null;
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
