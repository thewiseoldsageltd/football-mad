import { db } from "../db";
import { matches, teams, competitions } from "@shared/schema";
import {
  FIFA_WORLD_CUP_CANONICAL_SLUG,
  FIFA_WORLD_CUP_GOALSERVE_COMPETITION_ID,
} from "@shared/world-cup";
import { buildGoalserveMatchTimeline, mergeGoalserveMatchTimeline, readGoalserveMatchTimeline } from "@shared/goalserve-match-detail";
import { normalizeGoalserveMatchStatus, preferStoredMatchStatus } from "@shared/match-centre-state";
import { goalserveFetch } from "../integrations/goalserve/client";
import { ensureGoalserveTeam } from "../lib/ensure-goalserve-team";
import { resolveDayFeedSeasonKey } from "./sync-goalserve-matches";
import { eq } from "drizzle-orm";

function parseKickoffTime(formattedDate: string, timeStr: string): Date | null {
  if (!formattedDate) return null;
  
  const dateParts = formattedDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!dateParts) return null;
  
  const [, day, month, year] = dateParts;
  
  let hours = 12;
  let minutes = 0;
  
  const timeParts = timeStr?.match(/^(\d{1,2}):(\d{2})$/);
  if (timeParts) {
    hours = parseInt(timeParts[1], 10);
    minutes = parseInt(timeParts[2], 10);
  }
  
  const utcMs = Date.UTC(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    hours,
    minutes,
    0,
    0
  );
  const date = new Date(utcMs);
  
  if (isNaN(date.getTime())) return null;
  return date;
}

function extractRound(match: any, category: any): string | null {
  const candidates = [
    match?.["@round"],
    match?.["@matchday"],
    match?.["@week"],
    match?.["@round_id"],
    match?.round,
    match?.matchday,
    match?.week,
    category?.["@round"],
    category?.["@matchday"],
    category?.round,
    category?.matchday,
  ];
  
  for (const val of candidates) {
    if (val != null && val !== "") {
      const str = String(val).trim();
      if (str.length > 0) {
        return str;
      }
    }
  }
  return null;
}

// Extract score from various possible Goalserve field locations
function extractScore(match: any, teamObj: any, side: "home" | "away"): number | null {
  // Helper to parse a value as integer
  const tryParse = (val: any): number | null => {
    if (val == null || val === "") return null;
    const n = parseInt(String(val), 10);
    return isNaN(n) ? null : n;
  };

  // Try team object fields first
  const teamFields = [
    teamObj?.["@score"],
    teamObj?.score,
    teamObj?.["@goals"],
    teamObj?.goals,
  ];
  for (const val of teamFields) {
    const parsed = tryParse(val);
    if (parsed !== null) return parsed;
  }

  // Try match-level score fields
  const matchFields = [
    match?.[`@${side}score`],
    match?.[`${side}score`],
    match?.[`@${side}_score`],
    match?.[`${side}_score`],
    match?.[`@${side}TeamScore`],
    match?.[`${side}TeamScore`],
  ];
  for (const val of matchFields) {
    const parsed = tryParse(val);
    if (parsed !== null) return parsed;
  }

  // Try result/score patterns like "2-1"
  const resultFields = [
    match?.result,
    match?.["@result"],
    match?.score,
    match?.["@score"],
  ];
  for (const val of resultFields) {
    if (typeof val === "string" && val.includes("-")) {
      const parts = val.split("-").map(p => p.trim());
      if (parts.length === 2) {
        const idx = side === "home" ? 0 : 1;
        const parsed = tryParse(parts[idx]);
        if (parsed !== null) return parsed;
      }
    }
  }

  return null;
}

interface DbTeam {
  id: string;
  goalserveTeamId: string | null;
}

export async function upsertGoalserveMatches(feed: string): Promise<{
  ok: boolean;
  feed: string;
  totalFromGoalserve: number;
  inserted: number;
  updated: number;
  skippedNoMatchId: number;
  skippedNoKickoff: number;
  mappedTeams: number;
  unmappedTeams: number;
  withRound: number;
  withoutRound: number;
  ftWithScores: number;
  ftMissingScores: number;
  error?: string;
}> {
  try {
    const response = await goalserveFetch(feed);

    if (!response?.scores?.category) {
      return {
        ok: false,
        feed,
        totalFromGoalserve: 0,
        inserted: 0,
        updated: 0,
        skippedNoMatchId: 0,
        skippedNoKickoff: 0,
        mappedTeams: 0,
        unmappedTeams: 0,
        withRound: 0,
        withoutRound: 0,
        ftWithScores: 0,
        ftMissingScores: 0,
        error: "Missing scores.category in response",
      };
    }

    const dbTeams: DbTeam[] = await db
      .select({
        id: teams.id,
        goalserveTeamId: teams.goalserveTeamId,
      })
      .from(teams);

    const teamByGoalserveId = new Map<string, string>();
    for (const team of dbTeams) {
      if (team.goalserveTeamId) {
        teamByGoalserveId.set(team.goalserveTeamId, team.id);
      }
    }

    const dbCompetitions = await db
      .select({
        id: competitions.id,
        goalserveCompetitionId: competitions.goalserveCompetitionId,
        canonicalSlug: competitions.canonicalSlug,
        isPriority: competitions.isPriority,
        name: competitions.name,
        season: competitions.season,
      })
      .from(competitions);

    const competitionsMap = new Map<string, { id: string; name: string; season: string | null }>();
    const priorityCompetitionIds = new Set<string>();
    for (const comp of dbCompetitions) {
      if (comp.goalserveCompetitionId) {
        competitionsMap.set(comp.goalserveCompetitionId, {
          id: comp.id,
          name: comp.name,
          season: comp.season ?? null,
        });
      }
      if (comp.isPriority) {
        if (comp.goalserveCompetitionId) priorityCompetitionIds.add(comp.goalserveCompetitionId);
        if (comp.canonicalSlug === FIFA_WORLD_CUP_CANONICAL_SLUG) {
          priorityCompetitionIds.add(FIFA_WORLD_CUP_GOALSERVE_COMPETITION_ID);
        }
      }
    }

    const categoryData = response.scores.category;
    const categories = Array.isArray(categoryData) ? categoryData : [categoryData];

    let totalFromGoalserve = 0;
    let inserted = 0;
    let updated = 0;
    let skippedNoMatchId = 0;
    let skippedNoKickoff = 0;
    let mappedTeams = 0;
    let unmappedTeams = 0;
    let withRound = 0;
    let withoutRound = 0;
    let ftWithScores = 0;
    let ftMissingScores = 0;

    for (const category of categories) {
      if (!category?.matches?.match) continue;

      const categoryFormattedDate = category.matches["@formatted_date"] ?? category.matches.formatted_date ?? "";
      
      const competitionId = String(category?.["@id"] ?? category?.id ?? "");
      const mappedCompetition = competitionsMap.get(competitionId);
      const competitionName = mappedCompetition?.name || String(category?.["@name"] ?? category?.name ?? "Unknown");
      const competitionCanonicalId = mappedCompetition?.id || null;
      const categorySeason = String(
        category?.["@season"] ?? category?.season ?? category?.["@season_year"] ?? category?.season_year ?? "",
      ).trim() || null;

      const matchData = category.matches.match;
      const matchList = Array.isArray(matchData) ? matchData : [matchData];

      for (const match of matchList) {
        totalFromGoalserve++;

        const goalserveMatchId = String(match["@id"] ?? match.id ?? "");
        if (!goalserveMatchId) {
          skippedNoMatchId++;
          continue;
        }

        const goalserveStaticId = String(match["@static_id"] ?? match.static_id ?? "");
        
        const formattedDate = String(match["@formatted_date"] ?? match.formatted_date ?? categoryFormattedDate);
        const timeStr = String(match["@time"] ?? match.time ?? match["@status"] ?? "");
        
        const kickoffTime = parseKickoffTime(formattedDate, timeStr);
        if (!kickoffTime) {
          skippedNoKickoff++;
          continue;
        }

        const localTeam = match.localteam || match.home || {};
        const visitorTeam = match.visitorteam || match.away || {};

        const homeGsId = String(localTeam["@id"] ?? localTeam.id ?? "");
        const awayGsId = String(visitorTeam["@id"] ?? visitorTeam.id ?? "");
        const homeScore = extractScore(match, localTeam, "home");
        const awayScore = extractScore(match, visitorTeam, "away");

        let homeTeamId = homeGsId ? teamByGoalserveId.get(homeGsId) ?? null : null;
        let awayTeamId = awayGsId ? teamByGoalserveId.get(awayGsId) ?? null : null;

        if (priorityCompetitionIds.has(competitionId)) {
          if (!homeTeamId && homeGsId) {
            const homeName = String(localTeam["@name"] ?? localTeam.name ?? "").trim();
            try {
              const ensured = await ensureGoalserveTeam(homeGsId, homeName || `Team ${homeGsId}`);
              homeTeamId = ensured.id;
              teamByGoalserveId.set(homeGsId, ensured.id);
            } catch {
              // keep null — match still stored with goalserve ids in timeline
            }
          }
          if (!awayTeamId && awayGsId) {
            const awayName = String(visitorTeam["@name"] ?? visitorTeam.name ?? "").trim();
            try {
              const ensured = await ensureGoalserveTeam(awayGsId, awayName || `Team ${awayGsId}`);
              awayTeamId = ensured.id;
              teamByGoalserveId.set(awayGsId, ensured.id);
            } catch {
              // keep null
            }
          }
        }

        if (homeTeamId && awayTeamId) {
          mappedTeams++;
        } else {
          unmappedTeams++;
        }

        const rawStatus = String(match["@status"] ?? match.status ?? timeStr);

        const venue = String(match["@venue"] ?? match.venue ?? "");
        const slug = `gs-${goalserveMatchId}`;

        const matchSeason = String(
          match?.["@season"] ?? match?.season ?? match?.["@season_year"] ?? match?.season_year ?? "",
        ).trim() || null;
        const seasonKey = resolveDayFeedSeasonKey({
          feedSeason: matchSeason || categorySeason,
          competitionSeason: mappedCompetition?.season ?? null,
          kickoff: kickoffTime,
        });

        const goalserveRound = extractRound(match, category);
        if (goalserveRound) {
          withRound++;
        } else {
          withoutRound++;
        }

        const compactRaw = buildGoalserveMatchTimeline(match, {
          goalserveMatchId,
          goalserveStaticId,
          formattedDate,
          timeStr,
          rawStatus,
          home: { id: homeGsId, name: localTeam["@name"] ?? localTeam.name, score: homeScore },
          away: { id: awayGsId, name: visitorTeam["@name"] ?? visitorTeam.name, score: awayScore },
        });

        let existing = (await db
          .select()
          .from(matches)
          .where(eq(matches.goalserveMatchId, goalserveMatchId))
          .limit(1))[0];

        if (!existing && goalserveStaticId) {
          existing = (await db
            .select()
            .from(matches)
            .where(eq(matches.goalserveStaticId, goalserveStaticId))
            .limit(1))[0];
        }

        if (!existing) {
          existing = (await db
            .select()
            .from(matches)
            .where(eq(matches.slug, slug))
            .limit(1))[0];
        }

        const status = preferStoredMatchStatus(
          existing?.status,
          normalizeGoalserveMatchStatus(rawStatus),
        );

        const existingTimeline = readGoalserveMatchTimeline(existing?.timeline);
        const mergedTimeline = mergeGoalserveMatchTimeline(existingTimeline, compactRaw);

        // extractScore already returns number | null
        const newHomeScore = homeScore;
        const newAwayScore = awayScore;

        // Track FT matches with/without scores
        if (status === "finished") {
          if (newHomeScore !== null && newAwayScore !== null) {
            ftWithScores++;
          } else {
            ftMissingScores++;
          }
        }

        if (existing) {
          // IMPORTANT: Never overwrite non-null final scores with null
          // This prevents later feeds from erasing valid scores
          const finalHomeScore = newHomeScore !== null ? newHomeScore : existing.homeScore;
          const finalAwayScore = newAwayScore !== null ? newAwayScore : existing.awayScore;

          // Fill missing season_key only — do not overwrite a season already set by
          // league sync (authoritative for full schedules).
          const nextSeasonKey = existing.seasonKey || seasonKey;

          // Prefer non-empty venue; keep existing when day feeds omit it.
          const nextVenue = venue || existing.venue || mergedTimeline.venue || null;

          await db
            .update(matches)
            .set({
              goalserveMatchId: goalserveMatchId || existing.goalserveMatchId,
              goalserveStaticId: goalserveStaticId || existing.goalserveStaticId,
              goalserveCompetitionId: competitionId || existing.goalserveCompetitionId,
              competitionId: competitionCanonicalId || existing.competitionId,
              seasonKey: nextSeasonKey,
              goalserveRound,
              homeGoalserveTeamId: homeGsId || null,
              awayGoalserveTeamId: awayGsId || null,
              homeTeamId,
              awayTeamId,
              homeScore: finalHomeScore,
              awayScore: finalAwayScore,
              competition: competitionName,
              status,
              kickoffTime,
              venue: nextVenue,
              timeline: mergedTimeline,
            })
            .where(eq(matches.id, existing.id));
          updated++;
        } else {
          try {
            await db.insert(matches).values({
              slug,
              goalserveMatchId,
              goalserveStaticId: goalserveStaticId || null,
              goalserveCompetitionId: competitionId || null,
              competitionId: competitionCanonicalId,
              seasonKey,
              goalserveRound,
              homeGoalserveTeamId: homeGsId || null,
              awayGoalserveTeamId: awayGsId || null,
              homeTeamId,
              awayTeamId,
              homeScore: newHomeScore,
              awayScore: newAwayScore,
              competition: competitionName,
              status,
              kickoffTime,
              venue: venue || null,
              timeline: mergedTimeline,
            });
            inserted++;
          } catch (e: any) {
            // Concurrent ingest or ID remapping can race the uniqueness checks above.
            if (e?.code === "23505") {
              const [bySlug] = await db.select().from(matches).where(eq(matches.slug, slug)).limit(1);
              if (bySlug) {
                const racedTimeline = mergeGoalserveMatchTimeline(
                  readGoalserveMatchTimeline(bySlug.timeline),
                  compactRaw,
                );
                await db
                  .update(matches)
                  .set({
                    goalserveMatchId: goalserveMatchId || bySlug.goalserveMatchId,
                    goalserveStaticId: goalserveStaticId || bySlug.goalserveStaticId,
                    goalserveCompetitionId: competitionId || bySlug.goalserveCompetitionId,
                    competitionId: competitionCanonicalId || bySlug.competitionId,
                    seasonKey: bySlug.seasonKey || seasonKey,
                    goalserveRound,
                    homeGoalserveTeamId: homeGsId || null,
                    awayGoalserveTeamId: awayGsId || null,
                    homeTeamId,
                    awayTeamId,
                    homeScore: newHomeScore !== null ? newHomeScore : bySlug.homeScore,
                    awayScore: newAwayScore !== null ? newAwayScore : bySlug.awayScore,
                    competition: competitionName,
                    status: preferStoredMatchStatus(bySlug.status, status),
                    kickoffTime,
                    venue: venue || bySlug.venue || racedTimeline.venue || null,
                    timeline: racedTimeline,
                  })
                  .where(eq(matches.id, bySlug.id));
                updated++;
              } else {
                throw e;
              }
            } else {
              throw e;
            }
          }
        }
      }
    }

    return {
      ok: true,
      feed,
      totalFromGoalserve,
      inserted,
      updated,
      skippedNoMatchId,
      skippedNoKickoff,
      mappedTeams,
      unmappedTeams,
      withRound,
      withoutRound,
      ftWithScores,
      ftMissingScores,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      feed,
      totalFromGoalserve: 0,
      inserted: 0,
      updated: 0,
      skippedNoMatchId: 0,
      skippedNoKickoff: 0,
      mappedTeams: 0,
      unmappedTeams: 0,
      withRound: 0,
      withoutRound: 0,
      ftWithScores: 0,
      ftMissingScores: 0,
      error,
    };
  }
}
