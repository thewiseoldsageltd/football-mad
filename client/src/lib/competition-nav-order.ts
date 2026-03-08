const TABLES_ORDER_SLUGS = [
  "premier-league",
  "championship",
  "league-one",
  "league-two",
  "national-league",
  "scottish-premiership",
  "scottish-championship",
  "scottish-league-one",
  "scottish-league-two",
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
  "fa-cup",
  "efl-cup",
  "scottish-cup",
  "scottish-league-cup",
  "copa-del-rey",
  "coppa-italia",
  "dfb-pokal",
  "coupe-de-france",
  "champions-league",
  "europa-league",
  "conference-league",
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
