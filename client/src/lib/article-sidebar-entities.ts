import { competitionHub, managerProfile, playerProfile, teamHub } from "@/lib/urls";

export type SidebarEntityType = "team" | "competition" | "player" | "manager";

export interface SidebarEntity {
  type: SidebarEntityType;
  id: string;
  name: string;
  slug: string;
  salienceScore: number;
}

export interface ArticleEntitySource {
  entityTeams?: { id: string; name: string; slug: string; salienceScore?: number }[];
  entityCompetitions?: { id: string; name: string; slug: string; salienceScore?: number }[];
  entityPlayers?: { id: string; name: string; slug: string; salienceScore?: number }[];
  entityManagers?: { id: string; name: string; slug: string; salienceScore?: number }[];
}

const MAX_ENTITY_MODULES = 3;
const ARTICLES_PER_MODULE = 3;
const ARCHIVE_FETCH_LIMIT = 12;

function sortBySalience<T extends { salienceScore?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.salienceScore ?? 0) - (a.salienceScore ?? 0));
}

function toSidebarEntity(
  type: SidebarEntityType,
  item: { id: string; name: string; slug: string; salienceScore?: number },
): SidebarEntity | null {
  const slug = item.slug?.trim();
  const name = item.name?.trim();
  if (!slug || !name) return null;
  return {
    type,
    id: item.id,
    name,
    slug,
    salienceScore: item.salienceScore ?? 0,
  };
}

/** Pick up to 3 entities: all teams, then competitions, players, managers (salience within tier). */
export function selectSidebarEntities(article: ArticleEntitySource): SidebarEntity[] {
  const teams = sortBySalience(article.entityTeams ?? [])
    .map((t) => toSidebarEntity("team", t))
    .filter((e): e is SidebarEntity => e !== null);
  const competitions = sortBySalience(article.entityCompetitions ?? [])
    .map((c) => toSidebarEntity("competition", c))
    .filter((e): e is SidebarEntity => e !== null);
  const players = sortBySalience(article.entityPlayers ?? [])
    .map((p) => toSidebarEntity("player", p))
    .filter((e): e is SidebarEntity => e !== null);
  const managers = sortBySalience(article.entityManagers ?? [])
    .map((m) => toSidebarEntity("manager", m))
    .filter((e): e is SidebarEntity => e !== null);

  const ordered = [...teams, ...competitions, ...players, ...managers];
  const seen = new Set<string>();
  const selected: SidebarEntity[] = [];

  for (const entity of ordered) {
    const key = `${entity.type}:${entity.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(entity);
    if (selected.length >= MAX_ENTITY_MODULES) break;
  }

  return selected;
}

export function entityHubHref(type: SidebarEntityType, slug: string): string {
  switch (type) {
    case "team":
      return teamHub(slug);
    case "competition":
      return competitionHub(slug);
    case "player":
      return playerProfile(slug);
    case "manager":
      return managerProfile(slug);
  }
}

export function entityArchiveUrl(type: SidebarEntityType, slug: string): string {
  return `/api/news/archive/${type}/${encodeURIComponent(slug)}?limit=${ARCHIVE_FETCH_LIMIT}`;
}

export { ARTICLES_PER_MODULE, ARCHIVE_FETCH_LIMIT, MAX_ENTITY_MODULES };
