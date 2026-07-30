import { db, pool } from "../db";
import { teams, competitions } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { eq } from "drizzle-orm";
import { resolveSeasonKey } from "./sync-goalserve-matches";
import {
  ensureCompetitionSeasonEvidence,
  markExclusiveCompetitionSeasonCurrentOnClient,
} from "../lib/competition-seasons";
import { normalizeSeasonKey } from "@shared/season";
import {
  isExplicitHistoricalSeasonRun,
  membershipIsCurrentForTeamSync,
  minTeamsForLeague,
  shouldApplyExclusiveMembershipRollover,
} from "@shared/membership-rollover";

export { minTeamsForLeague, shouldApplyMembershipRollover } from "@shared/membership-rollover";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateAbbreviations(name: string): string[] {
  const abbrevs: string[] = [];
  const words = name.split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    abbrevs.push(words.map((w) => w.slice(0, 1).toUpperCase()).join(""));
    abbrevs.push(words.map((w) => w.slice(0, 3).toUpperCase()).join("").slice(0, 3));
  }

  const noSpaces = name.replace(/\s+/g, "");
  abbrevs.push(noSpaces.slice(0, 3).toUpperCase());

  return abbrevs;
}

async function ensureTeam(goalserveTeamId: string, name: string): Promise<DbTeam> {
  const safeId = String(goalserveTeamId).trim();
  const safeName = String(name).trim() || `Team ${safeId}`;
  const slug = slugify(safeName) || `team-${safeId}`;

  const [existing] = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      shortName: teams.shortName,
      goalserveTeamId: teams.goalserveTeamId,
    })
    .from(teams)
    .where(eq(teams.goalserveTeamId, safeId))
    .limit(1);

  if (existing) return existing;

  const [inserted] = await db
    .insert(teams)
    .values({ name: safeName, slug, goalserveTeamId: safeId })
    .onConflictDoNothing()
    .returning({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      shortName: teams.shortName,
      goalserveTeamId: teams.goalserveTeamId,
    });

  if (inserted) return inserted;

  const [found] = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      shortName: teams.shortName,
      goalserveTeamId: teams.goalserveTeamId,
    })
    .from(teams)
    .where(eq(teams.goalserveTeamId, safeId))
    .limit(1);

  if (!found) throw new Error(`Failed to ensure team for goalserveTeamId=${safeId}`);
  return found;
}

interface GoalserveTeam {
  goalserveTeamId: string;
  name: string;
}

interface DbTeam {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  goalserveTeamId: string | null;
}

export async function syncGoalserveTeams(
  leagueId: string,
  seasonKeyParam?: string,
): Promise<{
  ok: boolean;
  leagueId: string;
  goalserveTeams: number;
  matched: number;
  updated: number;
  membershipsUpserted: number;
  unmatchedSample: { id: string; name: string }[];
  seasonKeyUsed: string | null;
  wroteCompetitionSeason: boolean;
  membershipRolloverApplied: boolean;
  skippedRolloverReason?: string;
  error?: string;
}> {
  try {
    const response = await goalserveFetch(`soccerleague/${leagueId}`);

    const teamData = response?.league?.team;
    if (!teamData) {
      return {
        ok: false,
        leagueId,
        goalserveTeams: 0,
        matched: 0,
        updated: 0,
        membershipsUpserted: 0,
        unmatchedSample: [],
        seasonKeyUsed: null,
        wroteCompetitionSeason: false,
        membershipRolloverApplied: false,
        skippedRolloverReason: "empty_feed",
        error: "No team data found in response.league.team",
      };
    }

    const teamArray = Array.isArray(teamData) ? teamData : [teamData];

    const goalserveTeamsList: GoalserveTeam[] = teamArray
      .map((team: any) => ({
        goalserveTeamId: String(team["@id"] ?? team.id ?? ""),
        name: String(team["@name"] ?? team.name ?? ""),
      }))
      .filter((t: GoalserveTeam) => t.goalserveTeamId && t.name);

    const minTeams = minTeamsForLeague(leagueId);
    if (goalserveTeamsList.length < minTeams) {
      return {
        ok: false,
        leagueId,
        goalserveTeams: goalserveTeamsList.length,
        matched: 0,
        updated: 0,
        membershipsUpserted: 0,
        unmatchedSample: [],
        seasonKeyUsed: null,
        wroteCompetitionSeason: false,
        membershipRolloverApplied: false,
        skippedRolloverReason: "incomplete_feed",
        error: `Team feed incomplete: got ${goalserveTeamsList.length}, expected at least ${minTeams}`,
      };
    }

    const feedSeasonRaw =
      response?.league?.["@season"] ??
      response?.league?.season ??
      response?.league?.["@season_year"] ??
      response?.league?.season_year ??
      null;

    const dbTeams: DbTeam[] = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        shortName: teams.shortName,
        goalserveTeamId: teams.goalserveTeamId,
      })
      .from(teams);

    const dbByGoalserveId = new Map<string, DbTeam>();
    const dbBySlug = new Map<string, DbTeam>();
    const dbByNameLower = new Map<string, DbTeam>();
    const dbByShortNameLower = new Map<string, DbTeam>();

    for (const dbTeam of dbTeams) {
      if (dbTeam.goalserveTeamId) {
        dbByGoalserveId.set(dbTeam.goalserveTeamId, dbTeam);
      }
      dbBySlug.set(dbTeam.slug, dbTeam);
      dbByNameLower.set(dbTeam.name.toLowerCase(), dbTeam);
      if (dbTeam.shortName) {
        dbByShortNameLower.set(dbTeam.shortName.toLowerCase(), dbTeam);
      }
    }

    const [competitionRow] = await db
      .select({ id: competitions.id, season: competitions.season })
      .from(competitions)
      .where(eq(competitions.goalserveCompetitionId, leagueId))
      .limit(1);

    const competitionDbId = competitionRow?.id ?? null;
    const seasonKey =
      normalizeSeasonKey(
        resolveSeasonKey(
          seasonKeyParam,
          competitionRow?.season ? String(competitionRow.season) : undefined,
          feedSeasonRaw ? String(feedSeasonRaw) : undefined,
        ),
      ) || "unknown";

    let matched = 0;
    let updated = 0;
    const seenTeamIds: string[] = [];

    for (const gsTeam of goalserveTeamsList) {
      let matchedDbTeam: DbTeam | undefined;

      matchedDbTeam = dbByGoalserveId.get(gsTeam.goalserveTeamId);

      if (!matchedDbTeam) {
        const gsSlug = slugify(gsTeam.name);
        matchedDbTeam = dbBySlug.get(gsSlug);
      }

      if (!matchedDbTeam) {
        matchedDbTeam = dbByNameLower.get(gsTeam.name.toLowerCase());
      }

      if (!matchedDbTeam) {
        const abbrevs = generateAbbreviations(gsTeam.name);
        for (const abbrev of abbrevs) {
          const found = dbByShortNameLower.get(abbrev.toLowerCase());
          if (found) {
            matchedDbTeam = found;
            break;
          }
        }
      }

      if (matchedDbTeam) {
        matched++;

        if (matchedDbTeam.goalserveTeamId !== gsTeam.goalserveTeamId) {
          await db
            .update(teams)
            .set({ goalserveTeamId: gsTeam.goalserveTeamId })
            .where(eq(teams.id, matchedDbTeam.id));
          updated++;
        }
      } else {
        const created = await ensureTeam(gsTeam.goalserveTeamId, gsTeam.name);
        matchedDbTeam = created;
        matched++;
      }

      seenTeamIds.push(matchedDbTeam.id);
    }

    let membershipsUpserted = 0;
    let wroteCompetitionSeason = false;
    let membershipRolloverApplied = false;
    const isHistorical = isExplicitHistoricalSeasonRun(seasonKeyParam);
    const membershipIsCurrent = membershipIsCurrentForTeamSync(seasonKeyParam);

    if (competitionDbId && seasonKey !== "unknown" && seenTeamIds.length >= minTeams) {
      if (isHistorical) {
        // Historical/manual season: store memberships for that season only.
        // Never flip competitions.season, competition_seasons.is_current, or demote current memberships.
        await ensureCompetitionSeasonEvidence(competitionDbId, seasonKey);

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (const teamId of seenTeamIds) {
            await client.query(
              `
              INSERT INTO competition_team_memberships (
                competition_id, team_id, season_key, membership_type, is_current, source, last_seen_at
              ) VALUES ($1, $2, $3, 'league', false, 'goalserve', NOW())
              ON CONFLICT (competition_id, team_id, season_key)
              DO UPDATE SET is_current = false, last_seen_at = NOW()
              `,
              [competitionDbId, teamId, seasonKey],
            );
            membershipsUpserted++;
          }
          await client.query("COMMIT");
        } catch (txErr) {
          await client.query("ROLLBACK");
          throw txErr;
        } finally {
          client.release();
        }
      } else if (
        shouldApplyExclusiveMembershipRollover({
          seasonKeyParam,
          teamCount: seenTeamIds.length,
          leagueId,
        })
      ) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          if (seasonKey !== competitionRow?.season) {
            await client.query(`UPDATE competitions SET season = $1 WHERE id = $2`, [
              seasonKey,
              competitionDbId,
            ]);
          }

          await markExclusiveCompetitionSeasonCurrentOnClient(client, competitionDbId, seasonKey);
          wroteCompetitionSeason = true;

          for (const teamId of seenTeamIds) {
            await client.query(
              `
              INSERT INTO competition_team_memberships (
                competition_id, team_id, season_key, membership_type, is_current, source, last_seen_at
              ) VALUES ($1, $2, $3, 'league', $4, 'goalserve', NOW())
              ON CONFLICT (competition_id, team_id, season_key)
              DO UPDATE SET is_current = $4, last_seen_at = NOW()
              `,
              [competitionDbId, teamId, seasonKey, membershipIsCurrent],
            );
            membershipsUpserted++;
          }

          // Demote teams no longer in this season's roster
          await client.query(
            `
            UPDATE competition_team_memberships
            SET is_current = false
            WHERE competition_id = $1
              AND season_key = $2
              AND team_id <> ALL($3::varchar[])
            `,
            [competitionDbId, seasonKey, seenTeamIds],
          );

          // Exclusive rollover: demote memberships for every other season of this competition
          await client.query(
            `
            UPDATE competition_team_memberships
            SET is_current = false
            WHERE competition_id = $1
              AND season_key <> $2
              AND is_current = true
            `,
            [competitionDbId, seasonKey],
          );

          await client.query("COMMIT");
          membershipRolloverApplied = true;
        } catch (txErr) {
          await client.query("ROLLBACK");
          throw txErr;
        } finally {
          client.release();
        }
      }
    }

    return {
      ok: true,
      leagueId,
      goalserveTeams: goalserveTeamsList.length,
      matched,
      updated,
      membershipsUpserted,
      unmatchedSample: [],
      seasonKeyUsed: seasonKey,
      wroteCompetitionSeason,
      membershipRolloverApplied,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      leagueId,
      goalserveTeams: 0,
      matched: 0,
      updated: 0,
      membershipsUpserted: 0,
      unmatchedSample: [],
      seasonKeyUsed: null,
      wroteCompetitionSeason: false,
      membershipRolloverApplied: false,
      error,
    };
  }
}

