import { cupCompetitions, europeCompetitions, leagueCompetitions } from "@/data/tables-mock";

const TABLES_ORDER_SLUGS = [
  ...leagueCompetitions.map((comp) => comp.id),
  ...cupCompetitions.map((comp) => comp.id),
  ...europeCompetitions.map((comp) => comp.id),
] as const;

const ORDER_ALIAS_BY_SLUG: Record<string, string> = {
  "uefa-champions-league": "champions-league",
  "uefa-europa-league": "europa-league",
  "uefa-conference-league": "conference-league",
};

const TABLES_ORDER_INDEX = new Map<string, number>(
  TABLES_ORDER_SLUGS.map((slug, index) => [slug, index]),
);

function toTablesOrderSlug(slug: string): string {
  return ORDER_ALIAS_BY_SLUG[slug] ?? slug;
}

export function sortCompetitionItemsLikeTables<T extends { value: string; label: string }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aOrder = TABLES_ORDER_INDEX.get(toTablesOrderSlug(a.item.value));
      const bOrder = TABLES_ORDER_INDEX.get(toTablesOrderSlug(b.item.value));
      const aKnown = typeof aOrder === "number";
      const bKnown = typeof bOrder === "number";
      if (aKnown && bKnown) return aOrder - bOrder;
      if (aKnown) return -1;
      if (bKnown) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}
