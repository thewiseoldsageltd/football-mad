import { MvpGraphBoundary } from "./mvp-graph-boundary";

export type MvpArchiveEntityType = "team" | "competition" | "player" | "manager";

/**
 * Whether an entity is in the MVP graph (priority competitions → current memberships → teams → players/managers).
 * Used for sitemap inclusion and `mvpIndexable` on entity APIs.
 */
export async function computeMvpIndexable(
  boundary: MvpGraphBoundary,
  opts: {
    entityType: MvpArchiveEntityType;
    entityId: string | null | undefined;
  },
): Promise<boolean> {
  const id = typeof opts.entityId === "string" ? opts.entityId.trim() : "";
  if (!id) return false;
  switch (opts.entityType) {
    case "team":
      return boundary.isMvpTeam(id);
    case "competition":
      return boundary.isMvpCompetition(id);
    case "player":
      return (await boundary.filterPlayerIds([id])).has(id);
    case "manager":
      return (await boundary.filterManagerIds([id])).has(id);
    default:
      return false;
  }
}
