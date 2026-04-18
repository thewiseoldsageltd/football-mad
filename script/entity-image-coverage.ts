/**
 * MVP entity image coverage audit (requires DATABASE_URL).
 * Run: npx tsx script/entity-image-coverage.ts
 */
import "../server/load-env";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../server/db";
import { competitions, competitionTeamMemberships, entityMedia, managers, players, teams } from "@shared/schema";

async function hasActiveMedia(
  entityType: "competition" | "team" | "player" | "manager",
  entityId: string,
  mediaRole: "logo" | "crest" | "headshot",
): Promise<boolean> {
  const [row] = await db
    .select({ id: entityMedia.id })
    .from(entityMedia)
    .where(
      and(
        eq(entityMedia.entityType, entityType),
        eq(entityMedia.entityId, entityId),
        eq(entityMedia.mediaRole, mediaRole),
        eq(entityMedia.isPrimary, true),
        eq(entityMedia.status, "active"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const priorityComps = await db
    .select({ id: competitions.id, slug: competitions.slug })
    .from(competitions)
    .where(eq(competitions.isPriority, true));

  let compWith = 0;
  for (const c of priorityComps) {
    if (await hasActiveMedia("competition", c.id, "logo")) compWith++;
  }
  const compPct = priorityComps.length ? ((100 * compWith) / priorityComps.length).toFixed(1) : "0.0";

  const mvpTeamRows = await db
    .selectDistinct({ teamId: competitionTeamMemberships.teamId })
    .from(competitionTeamMemberships)
    .innerJoin(competitions, eq(competitionTeamMemberships.competitionId, competitions.id))
    .where(and(eq(competitions.isPriority, true), eq(competitionTeamMemberships.isCurrent, true)));

  const mvpTeamIds = [...new Set(mvpTeamRows.map((r) => r.teamId))];
  const mvpTeams =
    mvpTeamIds.length > 0
      ? await db
          .select({ id: teams.id, logoUrl: teams.logoUrl })
          .from(teams)
          .where(inArray(teams.id, mvpTeamIds))
      : [];

  let teamWith = 0;
  for (const t of mvpTeams) {
    const hasLogo = Boolean(t.logoUrl?.trim());
    const hasCrest = await hasActiveMedia("team", t.id, "crest");
    if (hasLogo || hasCrest) teamWith++;
  }
  const teamPct = mvpTeams.length ? ((100 * teamWith) / mvpTeams.length).toFixed(1) : "0.0";

  const playerSample = await db
    .select({ id: players.id, imageUrl: players.imageUrl })
    .from(players)
    .orderBy(desc(players.createdAt))
    .limit(120);

  let playerWith = 0;
  for (const p of playerSample) {
    const direct = Boolean(p.imageUrl?.trim());
    const em = await hasActiveMedia("player", p.id, "headshot");
    if (direct || em) playerWith++;
  }
  const playerPct = playerSample.length ? ((100 * playerWith) / playerSample.length).toFixed(1) : "0.0";

  const managerRows = await db
    .select({ id: managers.id, imageUrl: managers.imageUrl })
    .from(managers)
    .where(isNotNull(managers.currentTeamId))
    .limit(80);

  let mgrWith = 0;
  for (const m of managerRows) {
    const direct = Boolean(m.imageUrl?.trim());
    const em = await hasActiveMedia("manager", m.id, "headshot");
    if (direct || em) mgrWith++;
  }
  const mgrPct = managerRows.length ? ((100 * mgrWith) / managerRows.length).toFixed(1) : "0.0";

  const report = {
    priorityCompetitions: {
      total: priorityComps.length,
      withLogoMedia: compWith,
      percentWithImage: Number(compPct),
    },
    mvpLinkedTeams: {
      total: mvpTeams.length,
      withCrestOrLogoUrl: teamWith,
      percentWithImage: Number(teamPct),
    },
    playersSampled: {
      sampleSize: playerSample.length,
      withHeadshotOrMedia: playerWith,
      percentWithImage: Number(playerPct),
    },
    managersSampled: {
      sampleSize: managerRows.length,
      withHeadshotOrMedia: mgrWith,
      percentWithImage: Number(mgrPct),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
