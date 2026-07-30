/**
 * Repair exclusive is_current for competition_team_memberships and competition_seasons.
 *
 * Safe by default: dry-run unless --write or WRITE=1 is set.
 * Scoped by default: require --league-id / --competition-slug (or env) unless --all.
 *
 * Examples:
 *   npx tsx script/repair-current-membership-seasons.ts --league-id=1204
 *   npx tsx script/repair-current-membership-seasons.ts --competition-slug=premier-league --write
 *   WRITE=1 LEAGUE_ID=1204 npx tsx script/repair-current-membership-seasons.ts
 *   npx tsx script/repair-current-membership-seasons.ts --all --write
 */
import { db, pool } from "../server/db";
import {
  competitions,
  competitionTeamMemberships,
  competitionSeasons,
} from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";
import { normalizeSeasonKey } from "@shared/season";
import { minTeamsForLeague } from "@shared/membership-rollover";

type Args = {
  write: boolean;
  all: boolean;
  leagueId: string | null;
  competitionSlug: string | null;
};

function parseArgs(argv: string[]): Args {
  const envWrite = process.env.WRITE === "1" || process.env.WRITE === "true";
  const envDry = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const envAll = process.env.ALL === "1" || process.env.ALL === "true";
  const envLeague = process.env.LEAGUE_ID?.trim() || null;
  const envSlug = process.env.COMPETITION_SLUG?.trim() || null;

  let write = envWrite && !envDry;
  let all = envAll;
  let leagueId = envLeague;
  let competitionSlug = envSlug;

  for (const arg of argv) {
    if (arg === "--write") write = true;
    else if (arg === "--dry-run") write = false;
    else if (arg === "--all") all = true;
    else if (arg.startsWith("--league-id=")) leagueId = arg.slice("--league-id=".length).trim() || null;
    else if (arg.startsWith("--competition-slug=")) {
      competitionSlug = arg.slice("--competition-slug=".length).trim() || null;
    }
  }

  // Explicit dry-run wins over write if both somehow set via env conflict.
  if (envDry && !argv.includes("--write")) write = false;

  return { write, all, leagueId, competitionSlug };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.write && !args.all && !args.leagueId && !args.competitionSlug) {
    console.error(
      "[repair] Refusing write mode without scope. Pass --league-id=…, --competition-slug=…, or --all.",
    );
    process.exit(1);
  }

  if (!args.write && !args.all && !args.leagueId && !args.competitionSlug) {
    console.error(
      "[repair] Dry-run requires a scope. Pass --league-id=…, --competition-slug=…, or --all.",
    );
    process.exit(1);
  }

  const conditions = [eq(competitions.isPriority, true)];
  if (args.leagueId) {
    conditions.push(eq(competitions.goalserveCompetitionId, args.leagueId));
  }
  if (args.competitionSlug) {
    conditions.push(eq(competitions.slug, args.competitionSlug));
  }

  const comps = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      slug: competitions.slug,
      season: competitions.season,
      goalserveCompetitionId: competitions.goalserveCompetitionId,
    })
    .from(competitions)
    .where(and(...conditions));

  console.log(
    `[repair] mode=${args.write ? "WRITE" : "DRY-RUN"} competitions=${comps.length}` +
      ` leagueId=${args.leagueId ?? "-"} slug=${args.competitionSlug ?? "-"} all=${args.all}`,
  );

  if (comps.length === 0) {
    console.log("[repair] no matching competitions");
    process.exit(0);
  }

  for (const comp of comps) {
    const seasonKey = normalizeSeasonKey(comp.season);
    const leagueId = comp.goalserveCompetitionId ?? "";
    const minTeams = minTeamsForLeague(leagueId || "unknown");

    if (!seasonKey) {
      console.log(`[repair] SKIP ${comp.name}: no trusted competitions.season`);
      continue;
    }

    const countsBySeason = await db.execute(sql`
      SELECT season_key, count(*)::int AS count,
             count(*) FILTER (WHERE is_current = true)::int AS current_count
      FROM competition_team_memberships
      WHERE competition_id = ${comp.id}
      GROUP BY season_key
      ORDER BY season_key DESC
    `);

    const targetRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(competitionTeamMemberships)
      .where(
        and(
          eq(competitionTeamMemberships.competitionId, comp.id),
          eq(competitionTeamMemberships.seasonKey, seasonKey),
        ),
      );
    const targetCount = targetRows[0]?.count ?? 0;

    const promoteRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(competitionTeamMemberships)
      .where(
        sql`${competitionTeamMemberships.competitionId} = ${comp.id}
            AND ${competitionTeamMemberships.seasonKey} = ${seasonKey}
            AND ${competitionTeamMemberships.isCurrent} = false`,
      );
    const toPromote = promoteRows[0]?.count ?? 0;

    const demoteRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(competitionTeamMemberships)
      .where(
        sql`${competitionTeamMemberships.competitionId} = ${comp.id}
            AND ${competitionTeamMemberships.seasonKey} <> ${seasonKey}
            AND ${competitionTeamMemberships.isCurrent} = true`,
      );
    const toDemote = demoteRows[0]?.count ?? 0;

    const [markedCurrent] = await db
      .select({ seasonKey: competitionSeasons.seasonKey })
      .from(competitionSeasons)
      .where(
        and(
          eq(competitionSeasons.competitionId, comp.id),
          eq(competitionSeasons.isCurrent, true),
        ),
      )
      .limit(1);

    const rosterOk = targetCount >= minTeams;
    const competitionSeasonsWouldChange =
      !markedCurrent || normalizeSeasonKey(markedCurrent.seasonKey) !== seasonKey;

    const seasonCounts =
      (countsBySeason.rows as Array<{ season_key: string; count: number; current_count: number }>) ??
      [];

    console.log(`[repair] ${comp.name} (${comp.slug}) leagueId=${leagueId || "?"}`);
    console.log(`  targetSeason=${seasonKey} roster=${targetCount}/${minTeams} valid=${rosterOk}`);
    console.log(`  promote=${toPromote} demote=${toDemote}`);
    console.log(
      `  competition_seasons.wouldChange=${competitionSeasonsWouldChange}` +
        ` markedCurrent=${markedCurrent?.seasonKey ?? "none"}`,
    );
    for (const row of seasonCounts) {
      console.log(
        `  memberships season=${row.season_key} total=${row.count} current=${row.current_count}`,
      );
    }

    if (!rosterOk) {
      console.log(
        `  SKIP incomplete target roster (need >= ${minTeams}); will not promote/demote`,
      );
      continue;
    }

    if (!args.write) {
      console.log(`  DRY-RUN: would apply exclusive current=${seasonKey}`);
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
        UPDATE competition_team_memberships
        SET is_current = true
        WHERE competition_id = $1
          AND season_key = $2
        `,
        [comp.id, seasonKey],
      );
      await client.query(
        `
        UPDATE competition_team_memberships
        SET is_current = false
        WHERE competition_id = $1
          AND season_key <> $2
          AND is_current = true
        `,
        [comp.id, seasonKey],
      );
      await client.query(
        `
        INSERT INTO competition_seasons (competition_id, season_key, is_current, updated_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (competition_id, season_key)
        DO UPDATE SET is_current = true, updated_at = NOW()
        `,
        [comp.id, seasonKey],
      );
      await client.query(
        `
        UPDATE competition_seasons
        SET is_current = false, updated_at = NOW()
        WHERE competition_id = $1
          AND season_key <> $2
          AND is_current = true
        `,
        [comp.id, seasonKey],
      );
      await client.query("COMMIT");
      console.log(`  APPLIED exclusive current=${seasonKey}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  console.log("[repair] done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
