import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { managers, teamManagers } from "@shared/schema";

export async function upsertCurrentManagerMapping(args: {
  managerId: string;
  teamId: string;
  asOf: Date;
}): Promise<void> {
  const { managerId, teamId, asOf } = args;

  await db.transaction(async (tx) => {
    await tx
      .insert(teamManagers)
      .values({ teamId, managerId, asOf })
      .onConflictDoUpdate({
        target: teamManagers.teamId,
        set: { managerId, asOf },
      });

    // Keep only one "current team" mapping per manager.
    await tx
      .delete(teamManagers)
      .where(
        and(
          eq(teamManagers.managerId, managerId),
          ne(teamManagers.teamId, teamId),
        ),
      );

    // Temporary mirror column while canonical mapping stabilizes.
    await tx
      .update(managers)
      .set({ currentTeamId: teamId })
      .where(eq(managers.id, managerId));
  });
}
