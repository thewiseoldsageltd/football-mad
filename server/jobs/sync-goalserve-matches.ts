// Goalserve fixtures/results ingestion job.
// Goalserve match "id" (@id) can change between feeds, but "static_id" (@static_id)
// is the canonical, permanent identifier for a match. We upsert by static_id to
// avoid duplicates and ensure stable references across feed refreshes.

import { db } from "../db";
import { matches, teams, competitions } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { eq } from "drizzle-orm";
import {
  ensureCompetitionSeasonEvidence,
  setTrustedCurrentCompetitionSeason,
} from "../lib/competition-seasons";
import { shouldPromoteCompetitionCurrentFromFixtureSync } from "@shared/membership-rollover";
import { normalizeSeasonKey } from "@shared/season";

export function resolveSeasonKey(
  inputSeasonKey: string | undefined,
  competitionSeason: string | null | undefined,
  parsedSeason: string | null | undefined
): string | null {
  // Prefer an explicit request, then the season published in the Goalserve feed,
  // then the stored competition season. Feed-first prevents stale DB seasons
  // (e.g. 2025/2026) from blocking a newly published season on the bare league feed.
  const s = (inputSeasonKey || parsedSeason || competitionSeason || "").trim();
  return s.length ? s : null;
}

/**
 * Infer a season label from kickoff.
 * Calendar-year competitions (hint like "2026") use the kickoff calendar year;
 * otherwise use the Aug–May football split season (month index >= 7 → YYYY/YYYY+1).
 */
export function inferSeasonKeyFromKickoff(
  kickoff: Date,
  competitionSeasonHint?: string | null,
): string | null {
  if (Number.isNaN(kickoff.getTime())) return null;
  const hint = (competitionSeasonHint || "").trim();
  const year = kickoff.getUTCFullYear();
  const month = kickoff.getUTCMonth(); // 0–11
  if (/^\d{4}$/.test(hint)) {
    return String(year);
  }
  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

/**
 * Day/live feeds often omit @season. Prefer an explicit feed season, then
 * kickoff inference (so historical matches stay on the correct season after
 * competitions.season advances), then the stored competition season.
 */
export function resolveDayFeedSeasonKey(opts: {
  feedSeason?: string | null;
  competitionSeason?: string | null;
  kickoff: Date | null;
}): string | null {
  const feed = (opts.feedSeason || "").trim();
  if (feed) return feed;
  if (opts.kickoff) {
    const inferred = inferSeasonKeyFromKickoff(opts.kickoff, opts.competitionSeason);
    if (inferred) return inferred;
  }
  const comp = (opts.competitionSeason || "").trim();
  return comp || null;
}

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

function normalizeStatus(rawStatus: string): string {
  const s = rawStatus?.toLowerCase() || "";

  if (s === "ft" || s === "aet" || s === "pen." || s.includes("finished")) {
    return "finished";
  }
  if (s === "ht" || s === "1st half" || s === "2nd half" || s.match(/^\d+$/)) {
    return "live";
  }
  if (s === "postp." || s === "postponed" || s === "canc." || s === "cancelled") {
    return "postponed";
  }
  if (s === "ns" || s === "" || s.match(/^\d{1,2}:\d{2}$/)) {
    return "scheduled";
  }
  return "scheduled";
}

function extractRound(match: any, week: any): string | null {
  const candidates = [
    match?.["@round"],
    match?.["@matchday"],
    match?.["@week"],
    match?.["@round_id"],
    match?.round,
    match?.matchday,
    match?.week,
    week?.["@number"],
    week?.number,
  ];

  for (const val of candidates) {
    if (val != null && val !== "") {
      const str = String(val).trim();
      if (str.length > 0) return str;
    }
  }
  return null;
}

function extractScore(match: any, teamObj: any, side: "home" | "away"): number | null {
  const tryParse = (val: any): number | null => {
    if (val == null || val === "") return null;
    const n = parseInt(String(val), 10);
    return isNaN(n) ? null : n;
  };

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

function asArray(v: any): any[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

interface ExtractedLeague {
  name: string;
  weeks: any[];
  responsePath: string;
  parsedSeason: string | null;
}

function parseFeedSeason(obj: any): string | null {
  const candidates = [
    obj?.["@season"],
    obj?.season,
    obj?.["@season_year"],
    obj?.season_year,
  ];
  for (const val of candidates) {
    if (val != null && val !== "") {
      const s = String(val).trim();
      if (s.length > 0) return s;
    }
  }
  return null;
}

function extractMatchesFromGoalserveResponse(resp: any, _leagueId: string): ExtractedLeague | null {
  if (resp?.results?.tournament) {
    const t = resp.results.tournament;
    const name = String(t?.["@name"] ?? t?.name ?? "Unknown");
    const parsedSeason = parseFeedSeason(t);

    const weeks = asArray(t?.week);
    if (weeks.length > 0) {
      return { name, weeks, responsePath: "results.tournament.week", parsedSeason };
    }

    const stages = asArray(t?.stage);
    if (stages.length > 0) {
      const syntheticWeeks = stages.map((s: any) => {
        const roundName = String(s?.["@name"] ?? s?.["@round"] ?? s?.["@id"] ?? "");
        const directMatches = asArray(s?.match);
        const groups = asArray(s?.group);
        const groupMatches = groups.flatMap((g: any) => asArray(g?.match));
        return {
          "@number": roundName,
          match: [...directMatches, ...groupMatches],
        };
      });
      const nonEmpty = syntheticWeeks.filter((w: any) => w.match.length > 0);
      if (nonEmpty.length > 0) {
        return { name, weeks: nonEmpty, responsePath: "results.tournament.stage", parsedSeason };
      }
    }

    const topMatch = asArray(t?.match);
    if (topMatch.length > 0) {
      return { name, weeks: [{ match: topMatch }], responsePath: "results.tournament.match", parsedSeason };
    }
  }

  if (resp?.leagues?.league) {
    const ld = resp.leagues.league;
    const weekData = ld?.week ?? ld?.match;
    if (weekData) {
      return {
        name: String(ld?.["@name"] ?? ld?.name ?? "Unknown"),
        weeks: asArray(weekData),
        responsePath: "leagues.league",
        parsedSeason: parseFeedSeason(ld),
      };
    }
  }

  if (resp?.fixtures?.league) {
    const ld = resp.fixtures.league;
    const weekData = ld?.week ?? ld?.match;
    if (weekData) {
      return {
        name: String(ld?.["@name"] ?? ld?.name ?? "Unknown"),
        weeks: asArray(weekData),
        responsePath: "fixtures.league",
        parsedSeason: parseFeedSeason(ld),
      };
    }
  }

  if (resp?.scores?.category) {
    const categories = asArray(resp.scores.category);

    for (const cat of categories) {
      if (!cat?.league) continue;
      const leagues = asArray(cat.league);
      for (const lg of leagues) {
        const matchData = lg?.match ?? lg?.week;
        if (matchData) {
          const weeks = asArray(matchData);
          const syntheticWeeks = weeks.map((item: any) => {
            if (item?.matches?.match || item?.match) return item;
            return { match: item };
          });
          return {
            name: String(lg?.["@name"] ?? lg?.name ?? cat?.["@name"] ?? cat?.name ?? "Unknown"),
            weeks: syntheticWeeks,
            responsePath: "scores.category",
            parsedSeason: parseFeedSeason(lg) ?? parseFeedSeason(cat),
          };
        }
      }
    }
  }

  return null;
}

interface SyncResult {
  ok: boolean;
  leagueId: string;
  totalFromGoalserve: number;
  inserted: number;
  updated: number;
  skippedNoStaticId: number;
  skippedNoKickoff: number;
  competitionId: string | null;
  seasonKey: string | null;
  responsePath?: string;
  seasonKeyUsed?: string | null;
  wroteCompetitionSeason?: boolean;
  error?: string;
}

export async function syncGoalserveMatches(
  leagueId: string,
  seasonKeyParam?: string,
  runId?: string,
  options?: { onlyTeamGoalserveIds?: string[] },
): Promise<SyncResult> {
  const emptyResult = (error?: string, extra?: Partial<SyncResult>): SyncResult => ({
    ok: !error,
    leagueId,
    totalFromGoalserve: 0,
    inserted: 0,
    updated: 0,
    skippedNoStaticId: 0,
    skippedNoKickoff: 0,
    competitionId: null,
    seasonKey: null,
    error,
    ...extra,
  });

  try {
    const [competitionRow] = await db
      .select({ id: competitions.id, season: competitions.season, name: competitions.name })
      .from(competitions)
      .where(eq(competitions.goalserveCompetitionId, leagueId))
      .limit(1);

    const competitionDbId = competitionRow?.id ?? null;

    // Pass runId so goalserveFetch logs to job_http_calls.
    // When a season key is provided, request that season explicitly so we do not
    // silently re-ingest a stale default season from Goalserve.
    const seasonQuery = seasonKeyParam?.trim()
      ? `?season=${encodeURIComponent(seasonKeyParam.trim())}`
      : "";
    const response = await goalserveFetch(`soccerfixtures/leagueid/${leagueId}${seasonQuery}`, runId);

    const extracted = extractMatchesFromGoalserveResponse(response, leagueId);

    const isHistorical = Boolean(seasonKeyParam?.trim());
    const seasonKey = normalizeSeasonKey(
      resolveSeasonKey(
        seasonKeyParam,
        competitionRow?.season ? String(competitionRow.season) : undefined,
        extracted?.parsedSeason,
      ),
    );

    let wroteCompetitionSeason = false;

    if (!extracted) {
      const topKeys = Object.keys(response ?? {}).join(", ");
      const tournamentKeys = response?.results?.tournament
        ? Object.keys(response.results.tournament).join(", ")
        : "N/A";
      const hasWeek = response?.results?.tournament?.week != null;
      const hasStage = response?.results?.tournament?.stage != null;
      return emptyResult(
        `Could not find matches in response. Top-level keys: [${topKeys}], tournament keys: [${tournamentKeys}], hasWeek=${hasWeek}, hasStage=${hasStage}`,
        { competitionId: competitionDbId, seasonKey, seasonKeyUsed: seasonKey, wroteCompetitionSeason }
      );
    }

    // Only bare/current feeds may advance current season — and only after a valid parse.
    if (
      competitionDbId &&
      seasonKey &&
      shouldPromoteCompetitionCurrentFromFixtureSync({
        seasonKeyParam,
        feedParsedOk: true,
      })
    ) {
      await setTrustedCurrentCompetitionSeason(
        competitionDbId,
        seasonKey,
        competitionRow?.season ?? null,
      );
      wroteCompetitionSeason = true;
    } else if (competitionDbId && seasonKey && isHistorical) {
      // Historical/manual season: store evidence only; never flip current markers.
      await ensureCompetitionSeasonEvidence(competitionDbId, seasonKey);
    }

    const { name: extractedName, weeks, responsePath } = extracted;
    const competitionName =
      extractedName && extractedName !== "Unknown"
        ? extractedName
        : String(competitionRow?.name ?? "").trim() || `League ${leagueId}`;
    console.log(`[sync-goalserve-matches] leagueId=${leagueId} responsePath=${responsePath} weeks=${weeks.length}`);

    const dbTeams = await db
      .select({ id: teams.id, goalserveTeamId: teams.goalserveTeamId })
      .from(teams);

    const teamByGoalserveId = new Map<string, string>();
    for (const team of dbTeams) {
      if (team.goalserveTeamId) {
        teamByGoalserveId.set(team.goalserveTeamId, team.id);
      }
    }

    interface MatchRow {
      slug: string;
      goalserveMatchId: string;
      goalserveStaticId: string;
      goalserveCompetitionId: string;
      competitionId: string | null;
      seasonKey: string | null;
      goalserveRound: string | null;
      homeGoalserveTeamId: string | null;
      awayGoalserveTeamId: string | null;
      homeTeamId: string | null;
      awayTeamId: string | null;
      homeScore: number | null;
      awayScore: number | null;
      competition: string;
      venue: string | null;
      status: string;
      kickoffTime: Date;
    }

    let totalFromGoalserve = 0;
    let skippedNoStaticId = 0;
    let skippedNoKickoff = 0;
    let inserted = 0;
    let updated = 0;

    const allRows: MatchRow[] = [];

    for (const week of weeks) {
      const matchData = week?.matches?.match ?? week?.match;
      if (!matchData) continue;

      const matchList = Array.isArray(matchData) ? matchData : [matchData];

      const weekFormattedDate = String(
        week?.matches?.["@formatted_date"] ?? week?.matches?.formatted_date ??
        week?.["@formatted_date"] ?? week?.formatted_date ?? ""
      );

      for (const match of matchList) {
        totalFromGoalserve++;

        const goalserveStaticId = String(match["@static_id"] ?? match.static_id ?? "").trim();
        if (!goalserveStaticId) {
          skippedNoStaticId++;
          continue;
        }

        const goalserveMatchId = String(match["@id"] ?? match.id ?? "").trim();

        const formattedDate = String(
          match["@formatted_date"] ?? match.formatted_date ??
          match["@date"] ?? match.date ??
          weekFormattedDate
        );
        const timeStr = String(match["@time"] ?? match.time ?? match["@status"] ?? "");

        const kickoffTime = parseKickoffTime(formattedDate, timeStr);
        if (!kickoffTime) {
          skippedNoKickoff++;
          continue;
        }

        const localTeam = match.localteam || match.home || {};
        const visitorTeam = match.visitorteam || match.away || {};

        const homeGsId = String(localTeam["@id"] ?? localTeam.id ?? "").trim();
        const awayGsId = String(visitorTeam["@id"] ?? visitorTeam.id ?? "").trim();

        const teamFilter = options?.onlyTeamGoalserveIds;
        if (teamFilter && teamFilter.length > 0) {
          const allowed = new Set(teamFilter.map((id) => String(id).trim()).filter(Boolean));
          if (!allowed.has(homeGsId) && !allowed.has(awayGsId)) {
            continue;
          }
        }

        const homeScore = extractScore(match, localTeam, "home");
        const awayScore = extractScore(match, visitorTeam, "away");

        const homeTeamId = teamByGoalserveId.get(homeGsId) || null;
        const awayTeamId = teamByGoalserveId.get(awayGsId) || null;

        const rawStatus = String(match["@status"] ?? match.status ?? timeStr);
        const status = normalizeStatus(rawStatus);

        const venue = String(match["@venue"] ?? match.venue ?? "").trim() || null;
        const goalserveRound = extractRound(match, week);

        const slug = goalserveStaticId
          ? `gs-static-${goalserveStaticId}`
          : `gs-${goalserveMatchId}`;

        allRows.push({
          slug,
          goalserveMatchId: goalserveMatchId || goalserveStaticId,
          goalserveStaticId,
          goalserveCompetitionId: leagueId,
          competitionId: competitionDbId,
          seasonKey,
          goalserveRound,
          homeGoalserveTeamId: homeGsId || null,
          awayGoalserveTeamId: awayGsId || null,
          homeTeamId,
          awayTeamId,
          homeScore,
          awayScore,
          competition: competitionName,
          venue,
          status,
          kickoffTime,
        });
      }
    }

    for (const row of allRows) {
      let [existing] = await db
        .select({ id: matches.id, homeScore: matches.homeScore, awayScore: matches.awayScore })
        .from(matches)
        .where(eq(matches.goalserveStaticId, row.goalserveStaticId))
        .limit(1);

      if (!existing && row.goalserveMatchId) {
        [existing] = await db
          .select({ id: matches.id, homeScore: matches.homeScore, awayScore: matches.awayScore })
          .from(matches)
          .where(eq(matches.goalserveMatchId, row.goalserveMatchId))
          .limit(1);
      }

      if (existing) {
        await db
          .update(matches)
          .set({
            goalserveStaticId: row.goalserveStaticId,
            goalserveMatchId: row.goalserveMatchId,
            goalserveCompetitionId: row.goalserveCompetitionId,
            competitionId: row.competitionId,
            seasonKey: row.seasonKey,
            goalserveRound: row.goalserveRound,
            homeGoalserveTeamId: row.homeGoalserveTeamId,
            awayGoalserveTeamId: row.awayGoalserveTeamId,
            homeTeamId: row.homeTeamId,
            awayTeamId: row.awayTeamId,
            homeScore: row.homeScore !== null ? row.homeScore : existing.homeScore,
            awayScore: row.awayScore !== null ? row.awayScore : existing.awayScore,
            competition: row.competition,
            venue: row.venue,
            status: row.status,
            kickoffTime: row.kickoffTime,
          })
          .where(eq(matches.id, existing.id));
        updated++;
      } else {
        try {
          await db.insert(matches).values(row);
          inserted++;
        } catch (e: any) {
          if (e?.code === "23505") {
            const [bySlug] = await db
              .select({ id: matches.id, homeScore: matches.homeScore, awayScore: matches.awayScore })
              .from(matches)
              .where(eq(matches.slug, row.slug))
              .limit(1);
            if (bySlug) {
              await db
                .update(matches)
                .set({
                  goalserveStaticId: row.goalserveStaticId,
                  goalserveMatchId: row.goalserveMatchId,
                  goalserveCompetitionId: row.goalserveCompetitionId,
                  competitionId: row.competitionId,
                  seasonKey: row.seasonKey,
                  goalserveRound: row.goalserveRound,
                  homeGoalserveTeamId: row.homeGoalserveTeamId,
                  awayGoalserveTeamId: row.awayGoalserveTeamId,
                  homeTeamId: row.homeTeamId,
                  awayTeamId: row.awayTeamId,
                  homeScore: row.homeScore !== null ? row.homeScore : bySlug.homeScore,
                  awayScore: row.awayScore !== null ? row.awayScore : bySlug.awayScore,
                  competition: row.competition,
                  venue: row.venue,
                  status: row.status,
                  kickoffTime: row.kickoffTime,
                })
                .where(eq(matches.id, bySlug.id));
              updated++;
            }
          } else {
            throw e;
          }
        }
      }
    }

    return {
      ok: true,
      leagueId,
      totalFromGoalserve,
      inserted,
      updated,
      skippedNoStaticId,
      skippedNoKickoff,
      competitionId: competitionDbId,
      seasonKey,
      responsePath,
      seasonKeyUsed: seasonKey,
      wroteCompetitionSeason,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return emptyResult(error);
  }
}
