import { competitionHub, teamHub } from "@/lib/urls";

export type SidebarEntityType = "team" | "competition";

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
}

const MAX_ENTITY_MODULES = 3;
const MAX_COMPETITION_MODULES = 1;
const MAX_TEAM_MODULES = 2;
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

/**
 * Pill-aligned sidebar entities: primary competition, primary team, secondary team.
 * Max 1 competition + max 2 teams, hard cap 3 modules. Players/managers excluded.
 */
export function selectSidebarEntities(article: ArticleEntitySource): SidebarEntity[] {
  const primaryCompetition = sortBySalience(article.entityCompetitions ?? [])
    .map((c) => toSidebarEntity("competition", c))
    .find((e): e is SidebarEntity => e !== null);

  const teams = sortBySalience(article.entityTeams ?? [])
    .map((t) => toSidebarEntity("team", t))
    .filter((e): e is SidebarEntity => e !== null)
    .slice(0, MAX_TEAM_MODULES);

  const selected: SidebarEntity[] = [];
  if (primaryCompetition) selected.push(primaryCompetition);
  for (const team of teams) {
    if (selected.length >= MAX_ENTITY_MODULES) break;
    selected.push(team);
  }

  return selected;
}

export function entityHubHref(type: SidebarEntityType, slug: string): string {
  return type === "team" ? teamHub(slug) : competitionHub(slug);
}

export function entityArchiveUrl(type: SidebarEntityType, slug: string): string {
  return `/api/news/archive/${type}/${encodeURIComponent(slug)}?limit=${ARCHIVE_FETCH_LIMIT}`;
}

export {
  ARTICLES_PER_MODULE,
  ARCHIVE_FETCH_LIMIT,
  MAX_COMPETITION_MODULES,
  MAX_ENTITY_MODULES,
  MAX_TEAM_MODULES,
};
