import { isFifaWorldCupCompSlug } from "./world-cup-nav";

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

/** Pin FIFA World Cup first (after "All" in news nav). */
export function pinFifaWorldCupFirst<T extends { value: string }>(items: T[]): T[] {
  const fifaIndex = items.findIndex((item) => item.value === "fifa-world-cup");
  const legacyIndex = items.findIndex((item) => item.value === "world-cup");
  const pickIndex = fifaIndex >= 0 ? fifaIndex : legacyIndex;
  if (pickIndex <= 0) return items;
  const next = [...items];
  const [worldCup] = next.splice(pickIndex, 1);
  return [worldCup, ...next];
}

export function sortCompetitionItemsLikeTables<T extends { value: string; label: string }>(items: T[]): T[] {
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aWorldCup = isFifaWorldCupCompSlug(a.item.value);
      const bWorldCup = isFifaWorldCupCompSlug(b.item.value);
      if (aWorldCup && !bWorldCup) return -1;
      if (!aWorldCup && bWorldCup) return 1;
      if (aWorldCup && bWorldCup) {
        if (a.item.value === "fifa-world-cup") return -1;
        if (b.item.value === "fifa-world-cup") return 1;
        return 0;
      }

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

  return pinFifaWorldCupFirst(sorted);
}
