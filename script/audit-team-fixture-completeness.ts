/**
 * MVP competition fixture completeness production gate.
 *
 * Default scope: competitions.is_priority = true (Football Mad MVP).
 *
 * Usage:
 *   npx tsx script/audit-team-fixture-completeness.ts
 *   npx tsx script/audit-team-fixture-completeness.ts --probe-feeds
 *   npx tsx script/audit-team-fixture-completeness.ts --all-teams
 *   npx tsx script/audit-team-fixture-completeness.ts --sample --json
 *
 * Production-gate results (with --probe-feeds):
 *   PASS — no discrepancies in Goalserve feeds that were successfully retrieved;
 *          every probed MVP feed returned data and matched Football Mad.
 *   WARN — no discrepancies in successfully retrieved feeds, but one or more MVP
 *          feeds could not be verified (Goalserve HTTP / provider error).
 *   FAIL — published fixtures missing, stale league seasons, hub/URL/identity
 *          integrity failures, or active league teams missing published futures.
 *
 * Exit 0 = PASS or WARN
 * Exit 1 = FAIL (critical MVP issues)
 * Exit 2 = runtime error
 *
 * Does not write to the database. Does not print Goalserve credentials.
 */
import { db } from "../server/db";
import { competitions, matches, teams, competitionTeamMemberships } from "@shared/schema";
import { and, eq, isNotNull, sql, inArray } from "drizzle-orm";
import { storage } from "../server/storage";
import { buildPublicMatchDetailSlug } from "../shared/match-slug";
import { goalserveFetch } from "../server/integrations/goalserve/client";
import { getPublicCompetitionDisplayName } from "../client/src/components/matches/competition-priority";
// NOTE: shared display helper lives under client today; safe for Node audit scripts.

type CriticalIssue = { code: string; detail: string };
type Warning = { code: string; detail: string };

type MvpCompetitionRow = {
  id: string;
  name: string;
  canonicalName: string | null;
  slug: string;
  goalserveCompetitionId: string;
  season: string | null;
  isCup: boolean | null;
  country: string | null;
};

const FULL_SEASON_LEAGUE_IDS = new Set([
  "1204",
  "1205",
  "1206",
  "1197",
  "1203",
  "1370",
  "1373",
  "1376",
  "1375",
  "1399",
  "1229",
  "1269",
  "1221",
]);

const WORLD_CUP_ID = "1056";

const SAMPLE_SLUGS = [
  "arsenal",
  "manchester-city",
  "leeds",
  "celtic",
  "st-mirren",
  "barcelona",
  "real-madrid",
  "dortmund",
  "juventus",
  "psg",
  "liverpool",
];

function parseArgs(argv: string[]) {
  return {
    json: argv.includes("--json"),
    sample: argv.includes("--sample"),
    probeFeeds: argv.includes("--probe-feeds"),
    allTeams: argv.includes("--all-teams"),
  };
}

function asArray(v: unknown): any[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function walkMatches(node: any, out: any[] = [], depth = 0): any[] {
  if (!node || depth > 14) return out;
  if (Array.isArray(node)) {
    for (const n of node) walkMatches(n, out, depth + 1);
    return out;
  }
  if (typeof node !== "object") return out;
  if (node.localteam || node.visitorteam || node.home || node.away) {
    const staticId = String(node["@static_id"] ?? node.static_id ?? "").trim();
    const id = String(node["@id"] ?? node.id ?? "").trim();
    if (staticId || id) {
      out.push({
        staticId: staticId || null,
        id: id || null,
        date: node["@formatted_date"] || node["@date"] || null,
        home: String(node.localteam?.["@name"] ?? node.home?.["@name"] ?? ""),
        away: String(node.visitorteam?.["@name"] ?? node.away?.["@name"] ?? ""),
        homeGs: String(node.localteam?.["@id"] ?? node.home?.["@id"] ?? ""),
        awayGs: String(node.visitorteam?.["@id"] ?? node.away?.["@id"] ?? ""),
      });
    }
  }
  for (const k of Object.keys(node)) walkMatches(node[k], out, depth + 1);
  return out;
}

function classifyCompetition(c: MvpCompetitionRow): string {
  if (c.goalserveCompetitionId === WORLD_CUP_ID) return "International tournament";
  if (
    ["1005", "1007", "18853"].includes(c.goalserveCompetitionId) ||
    /uefa|eurocups/i.test(c.country || "") ||
    /champions league|europa league|conference/i.test(c.name)
  ) {
    return "Draw-dependent UEFA competition";
  }
  if (c.isCup || /cup|pokal|copa|coupe/i.test(c.name)) return "Draw-dependent domestic cup";
  if (FULL_SEASON_LEAGUE_IDS.has(c.goalserveCompetitionId)) return "Full-season league";
  return c.isCup ? "Draw-dependent domestic cup" : "Full-season league";
}

async function loadMvpCompetitions(): Promise<MvpCompetitionRow[]> {
  const rows = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      canonicalName: competitions.canonicalName,
      slug: competitions.slug,
      goalserveCompetitionId: competitions.goalserveCompetitionId,
      season: competitions.season,
      isCup: competitions.isCup,
      country: competitions.country,
    })
    .from(competitions)
    .where(
      and(
        eq(competitions.isPriority, true),
        sql`trim(coalesce(${competitions.goalserveCompetitionId}, '')) <> ''`,
      ),
    );
  return rows.map((r) => ({
    ...r,
    goalserveCompetitionId: String(r.goalserveCompetitionId),
  }));
}

async function findDuplicateStaticIds() {
  const rows = await db.execute(sql`
    SELECT goalserve_static_id AS static_id, count(*)::int AS n
    FROM matches
    WHERE goalserve_static_id IS NOT NULL AND trim(goalserve_static_id) <> ''
    GROUP BY goalserve_static_id
    HAVING count(*) > 1
    LIMIT 50
  `);
  return (rows.rows as any[]).map((r) => ({ staticId: String(r.static_id), n: Number(r.n) }));
}

async function findDuplicateSlugs() {
  const rows = await db.execute(sql`
    SELECT slug, count(*)::int AS n FROM matches
    GROUP BY slug HAVING count(*) > 1 LIMIT 50
  `);
  return (rows.rows as any[]).map((r) => ({ slug: String(r.slug), n: Number(r.n) }));
}

async function mvpTeamUniverseSafe(mvpDbIds: string[]) {
  if (mvpDbIds.length === 0) return [] as Array<{
    id: string;
    name: string;
    slug: string;
    goalserve_team_id: string | null;
  }>;
  const rows = await db
    .selectDistinct({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      goalserveTeamId: teams.goalserveTeamId,
    })
    .from(competitionTeamMemberships)
    .innerJoin(teams, eq(competitionTeamMemberships.teamId, teams.id))
    .where(
      and(
        eq(competitionTeamMemberships.isCurrent, true),
        inArray(competitionTeamMemberships.competitionId, mvpDbIds),
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    goalserve_team_id: r.goalserveTeamId,
  }));
}

async function countDbFixturesForCompetition(goalserveCompetitionId: string, seasonKey?: string | null) {
  const rows = await db.execute(sql`
    SELECT count(*)::int AS n,
      count(*) FILTER (WHERE kickoff_time >= now())::int AS future_n
    FROM matches
    WHERE goalserve_competition_id = ${goalserveCompetitionId}
      AND (${seasonKey ?? null}::text IS NULL OR season_key = ${seasonKey ?? null})
  `);
  const r = (rows.rows as any[])[0];
  return { total: Number(r?.n ?? 0), future: Number(r?.future_n ?? 0) };
}

async function probeCompetitionFeed(leagueId: string) {
  const data = await goalserveFetch(`soccerfixtures/leagueid/${leagueId}`);
  const season =
    data?.results?.tournament?.["@season"] ??
    data?.results?.tournament?.season ??
    data?.tournament?.["@season"] ??
    null;
  const fixtures = walkMatches(data);
  // Dedupe by staticId then id
  const seen = new Set<string>();
  const unique = [];
  for (const f of fixtures) {
    const key = f.staticId || `id:${f.id}`;
    if (!f.staticId && !f.id) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  return { season: season ? String(season) : null, fixtures: unique };
}

async function sampleTeamResults(slugs: string[], mvpGsIds: Set<string>) {
  const out = [];
  for (const slug of slugs) {
    const team = await storage.getTeamBySlug(slug);
    if (!team) {
      out.push({ team: slug, result: "MISSING_TEAM", discrepancyCount: 1 });
      continue;
    }
    const apiMatches = await storage.getMatchesByTeam(slug);
    const mvpMatches = apiMatches.filter((m) =>
      m.goalserveCompetitionId ? mvpGsIds.has(m.goalserveCompetitionId) : false,
    );
    const leagueMatches = mvpMatches.filter(
      (m) => m.goalserveCompetitionId && FULL_SEASON_LEAGUE_IDS.has(m.goalserveCompetitionId),
    );
    const futureLeague = leagueMatches.filter((m) => new Date(m.kickoffTime).getTime() >= Date.now());
    let unresolvable = 0;
    let sampleUrl: string | null = null;
    for (const m of leagueMatches.slice(0, 15)) {
      const publicSlug =
        m.homeTeam?.slug && m.awayTeam?.slug
          ? buildPublicMatchDetailSlug(m.homeTeam.slug, m.awayTeam.slug, m.kickoffTime)
          : null;
      if (!publicSlug) {
        unresolvable += 1;
        continue;
      }
      const resolved = await storage.getMatchBySlug(publicSlug);
      if (!resolved) unresolvable += 1;
      else if (!sampleUrl) sampleUrl = `/matches/${publicSlug}`;
    }
    const seasons = Array.from(new Set(leagueMatches.map((m) => m.seasonKey || "unknown")));
    out.push({
      team: team.name,
      slug: team.slug,
      goalserveTeamId: team.goalserveTeamId,
      mvpFixtureCount: mvpMatches.length,
      leagueFixtureCount: leagueMatches.length,
      futureLeagueFixtures: futureLeague.length,
      leagueSeasons: seasons,
      supplementaryCount: apiMatches.length - mvpMatches.length,
      unresolvableSlugSamples: unresolvable,
      canonicalMatchUrlSample: sampleUrl,
      result: unresolvable > 0 ? "FAIL_UNRESOLVABLE_SLUG" : "OK",
      discrepancyCount: unresolvable,
    });
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const critical: CriticalIssue[] = [];
  const warnings: Warning[] = [];

  console.log("[mvp-audit] loading MVP competitions (is_priority)…");
  const mvpComps = await loadMvpCompetitions();
  const mvpGsIds = new Set(mvpComps.map((c) => c.goalserveCompetitionId));
  const mvpDbIds = mvpComps.map((c) => c.id);

  const inventory = mvpComps.map((c) => ({
    goalserveId: c.goalserveCompetitionId,
    dbId: c.id,
    goalserveName: c.name,
    publicName: getPublicCompetitionDisplayName(c.canonicalName || c.name, c.goalserveCompetitionId),
    country: c.country,
    mvp: true,
    isCup: c.isCup,
    type: classifyCompetition(c),
    dbSeason: c.season,
  }));

  const leagues = inventory.filter((i) => i.type === "Full-season league");
  const cups = inventory.filter((i) => i.type === "Draw-dependent domestic cup");
  const uefa = inventory.filter((i) => i.type === "Draw-dependent UEFA competition");
  const intl = inventory.filter((i) => i.type === "International tournament");

  console.log("[mvp-audit] duplicate checks…");
  const dupStatic = await findDuplicateStaticIds();
  const dupSlugs = await findDuplicateSlugs();
  for (const d of dupStatic) critical.push({ code: "DUPLICATE_STATIC_ID", detail: `${d.staticId} x${d.n}` });
  for (const d of dupSlugs) critical.push({ code: "DUPLICATE_SLUG", detail: `${d.slug} x${d.n}` });

  console.log("[mvp-audit] MVP team universe…");
  const mvpTeams = await mvpTeamUniverseSafe(mvpDbIds);

  // Bulk coverage for current members of MVP non-cup leagues
  const leagueCoverage = await db.execute(sql`
    WITH mvp_teams AS (
      SELECT DISTINCT t.id, t.name, t.slug, t.goalserve_team_id
      FROM teams t
      JOIN competition_team_memberships ctm ON ctm.team_id = t.id AND ctm.is_current = true
      JOIN competitions c ON c.id = ctm.competition_id
      WHERE c.is_priority = true AND c.is_cup = false
        AND trim(coalesce(c.goalserve_competition_id, '')) <> ''
    ),
    league_matches AS (
      SELECT m.*, mt.id AS team_id
      FROM mvp_teams mt
      JOIN matches m ON (
        m.home_team_id = mt.id OR m.away_team_id = mt.id
        OR m.home_goalserve_team_id = mt.goalserve_team_id
        OR m.away_goalserve_team_id = mt.goalserve_team_id
      )
      JOIN competitions c ON c.goalserve_competition_id = m.goalserve_competition_id
      WHERE c.is_priority = true AND c.is_cup = false
    )
    SELECT
      mt.id, mt.name, mt.slug, mt.goalserve_team_id,
      count(lm.id)::int AS league_fixtures,
      count(lm.id) FILTER (WHERE lm.kickoff_time >= now())::int AS future_league_fixtures
    FROM mvp_teams mt
    LEFT JOIN league_matches lm ON lm.team_id = mt.id
    GROUP BY mt.id, mt.name, mt.slug, mt.goalserve_team_id
    ORDER BY future_league_fixtures ASC, mt.name
  `);

  const coverageRows = leagueCoverage.rows as any[];
  const zeroFutureActive = coverageRows.filter((r) => Number(r.future_league_fixtures) === 0);
  const zeroTotal = coverageRows.filter((r) => Number(r.league_fixtures) === 0);

  let feedComparisons: Array<Record<string, unknown>> = [];
  let publishedMissingFromDb = 0;
  let staleSeasons = 0;
  let feedsVerified = 0;
  let feedsUnverifiable = 0;
  const unverifiableFeeds: Array<{ goalserveId: string; name: string; type: string; error: string }> =
    [];

  if (args.probeFeeds) {
    console.log("[mvp-audit] probing Goalserve feeds for MVP competitions…");
    for (const comp of mvpComps) {
      const type = classifyCompetition(comp);
      try {
        const feed = await probeCompetitionFeed(comp.goalserveCompetitionId);
        feedsVerified += 1;
        const dbCounts = await countDbFixturesForCompetition(
          comp.goalserveCompetitionId,
          feed.season,
        );
        // Also count all DB rows for competition (any season) for context
        const dbAll = await countDbFixturesForCompetition(comp.goalserveCompetitionId, null);

        const missingStatic: string[] = [];
        if (feed.fixtures.length > 0) {
          const staticIds = feed.fixtures.map((f) => f.staticId).filter(Boolean) as string[];
          if (staticIds.length > 0) {
            const presentSet = new Set<string>();
            for (let i = 0; i < staticIds.length; i += 500) {
              const chunk = staticIds.slice(i, i + 500);
              const found = await db
                .select({ id: matches.goalserveStaticId })
                .from(matches)
                .where(inArray(matches.goalserveStaticId, chunk));
              for (const f of found) if (f.id) presentSet.add(f.id);
            }
            for (const sid of staticIds) {
              if (!presentSet.has(sid)) missingStatic.push(sid);
            }
          }

          // Feed-driven team coverage for full-season leagues: every Goalserve participant
          // with a Football Mad team must have future fixtures when the feed has future dates.
          if (type === "Full-season league") {
            const now = Date.now();
            const parseDate = (d: string | null) => {
              if (!d) return null;
              const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
              if (!m) return null;
              return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
            };
            const feedHasFuture = feed.fixtures.some((f) => {
              const ts = parseDate(f.date);
              return ts != null && ts >= now;
            });
            if (feedHasFuture) {
              const participantGs = new Set<string>();
              for (const f of feed.fixtures) {
                if (f.homeGs) participantGs.add(f.homeGs);
                if (f.awayGs) participantGs.add(f.awayGs);
              }
              const gsList = Array.from(participantGs);
              const fmTeams =
                gsList.length > 0
                  ? await db
                      .select({
                        id: teams.id,
                        name: teams.name,
                        slug: teams.slug,
                        goalserveTeamId: teams.goalserveTeamId,
                      })
                      .from(teams)
                      .where(inArray(teams.goalserveTeamId, gsList))
                  : [];
              for (const t of fmTeams) {
                if (!t.goalserveTeamId) continue;
                const fut = await db.execute(sql`
                  SELECT count(*)::int AS n FROM matches m
                  WHERE m.goalserve_competition_id = ${comp.goalserveCompetitionId}
                    AND m.kickoff_time >= now()
                    AND (
                      m.home_team_id = ${t.id} OR m.away_team_id = ${t.id}
                      OR m.home_goalserve_team_id = ${t.goalserveTeamId}
                      OR m.away_goalserve_team_id = ${t.goalserveTeamId}
                    )
                `);
                const n = Number((fut.rows as any[])[0]?.n ?? 0);
                if (n === 0) {
                  critical.push({
                    code: "ACTIVE_MVP_LEAGUE_TEAM_NO_FUTURE_LEAGUE_FIXTURES",
                    detail: `${t.name} (${t.slug}) missing future fixtures in ${comp.goalserveCompetitionId}`,
                  });
                }
              }
            }
          }
        }

        const seasonStale =
          feed.season &&
          comp.season &&
          String(feed.season) !== String(comp.season) &&
          type === "Full-season league";

        if (seasonStale) {
          staleSeasons += 1;
          critical.push({
            code: "STALE_MVP_LEAGUE_SEASON",
            detail: `${comp.goalserveCompetitionId} db=${comp.season} feed=${feed.season}`,
          });
        }

        if (type === "Full-season league" && missingStatic.length > 0) {
          publishedMissingFromDb += missingStatic.length;
          critical.push({
            code: "MVP_LEAGUE_FEED_FIXTURE_MISSING_FROM_DB",
            detail: `${comp.goalserveCompetitionId} missing ${missingStatic.length}/${feed.fixtures.length} (e.g. ${missingStatic.slice(0, 3).join(",")})`,
          });
        } else if (missingStatic.length > 0 && type !== "Full-season league") {
          // Cups/UEFA: missing published fixtures are still critical for currently published rounds
          publishedMissingFromDb += missingStatic.length;
          critical.push({
            code: "MVP_PUBLISHED_FIXTURE_MISSING_FROM_DB",
            detail: `${comp.goalserveCompetitionId} (${type}) missing ${missingStatic.length}`,
          });
        }

        if (comp.goalserveCompetitionId === WORLD_CUP_ID && dbAll.future === 0) {
          warnings.push({
            code: "WORLD_CUP_HISTORICAL",
            detail: "FIFA World Cup has no future fixtures; treat as historical MVP competition",
          });
        }

        feedComparisons.push({
          goalserveId: comp.goalserveCompetitionId,
          name: comp.canonicalName || comp.name,
          type,
          verified: true,
          feedSeason: feed.season,
          dbSeason: comp.season,
          feedFixtureCount: feed.fixtures.length,
          dbSeasonFixtureCount: dbCounts.total,
          dbAllFixtureCount: dbAll.total,
          missingFromDb: missingStatic.length,
          seasonStale: Boolean(seasonStale),
        });
        console.log(
          `[mvp-audit] ${comp.goalserveCompetitionId} feed=${feed.fixtures.length} dbSeason=${dbCounts.total} missing=${missingStatic.length} season=${feed.season}`,
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        feedsUnverifiable += 1;
        const short = message.slice(0, 160);
        unverifiableFeeds.push({
          goalserveId: comp.goalserveCompetitionId,
          name: getPublicCompetitionDisplayName(comp.canonicalName || comp.name, comp.goalserveCompetitionId),
          type,
          error: short,
        });
        // Provider/HTTP failures are WARN, not FAIL: coverage of that competition
        // was not verified this run.
        warnings.push({
          code: "MVP_FEED_UNVERIFIABLE",
          detail: `${comp.goalserveCompetitionId} (${type}): Goalserve feed could not be verified — ${short}`,
        });
        feedComparisons.push({
          goalserveId: comp.goalserveCompetitionId,
          name: comp.name,
          type,
          verified: false,
          error: message.slice(0, 200),
        });
      }
    }

    // Membership-only zero-future list is diagnostic (relegated clubs may still be is_current).
    for (const row of zeroFutureActive.slice(0, 40)) {
      warnings.push({
        code: "MEMBERSHIP_NO_FUTURE_LEAGUE_FIXTURES",
        detail: `${row.name} (${row.slug}) leagueFixtures=${row.league_fixtures} — may be relegated or feed unavailable`,
      });
    }
  } else {
    // Without probe: only warn on zero-future rather than fail (may be mid-sync)
    for (const row of zeroFutureActive.slice(0, 30)) {
      warnings.push({
        code: "ACTIVE_MVP_LEAGUE_TEAM_NO_FUTURE_DB_ONLY",
        detail: `${row.name} (${row.slug}) — run --probe-feeds after MVP sync`,
      });
    }
  }

  // Hub / slug checks for a slice of recent MVP fixtures
  console.log("[mvp-audit] sampling canonical slug resolution for MVP fixtures…");
  const mvpIdList = Array.from(mvpGsIds);
  const recentMvp = mvpIdList.length
    ? await db
        .select({
          id: matches.id,
          slug: matches.slug,
          kickoffTime: matches.kickoffTime,
          goalserveCompetitionId: matches.goalserveCompetitionId,
          homeTeamId: matches.homeTeamId,
          awayTeamId: matches.awayTeamId,
        })
        .from(matches)
        .where(inArray(matches.goalserveCompetitionId, mvpIdList))
        .orderBy(sql`${matches.kickoffTime} desc`)
        .limit(80)
    : [];

  let unresolvableUrls = 0;
  for (const row of recentMvp) {
    const home = row.homeTeamId ? await storage.getTeamById(row.homeTeamId) : undefined;
    const away = row.awayTeamId ? await storage.getTeamById(row.awayTeamId) : undefined;
    if (!home?.slug || !away?.slug) continue;
    const publicSlug = buildPublicMatchDetailSlug(home.slug, away.slug, row.kickoffTime);
    if (!publicSlug) {
      unresolvableUrls += 1;
      continue;
    }
    const resolved = await storage.getMatchBySlug(publicSlug);
    if (!resolved) {
      unresolvableUrls += 1;
      critical.push({
        code: "UNRESOLVABLE_MATCH_URL",
        detail: publicSlug,
      });
    }
  }

  const sample =
    args.sample || args.json ? await sampleTeamResults(SAMPLE_SLUGS, mvpGsIds) : [];

  let allTeamsSummary: Record<string, unknown> | null = null;
  if (args.allTeams) {
    const z = await db.execute(sql`
      SELECT count(*)::int AS n FROM teams
      WHERE goalserve_team_id IS NOT NULL AND trim(goalserve_team_id) <> ''
    `);
    allTeamsSummary = {
      note: "Diagnostic only — does not affect MVP gate",
      goalserveLinkedTeams: Number((z.rows as any[])[0]?.n ?? 0),
    };
  }

  // Gate pass criteria
  const activeFutureCritical = critical.filter(
    (c) => c.code === "ACTIVE_MVP_LEAGUE_TEAM_NO_FUTURE_LEAGUE_FIXTURES",
  ).length;

  const gate = {
    publishedMvpFixturesMissingFromDb: publishedMissingFromDb,
    staleMvpLeagueSeasons: staleSeasons,
    duplicateStaticIds: dupStatic.length,
    duplicateSlugs: dupSlugs.length,
    unresolvableMatchUrls: unresolvableUrls,
    activeMvpLeagueTeamsMissingFuture: args.probeFeeds ? activeFutureCritical : null,
    feedsProbed: args.probeFeeds,
    feedsVerified: args.probeFeeds ? feedsVerified : null,
    feedsUnverifiable: args.probeFeeds ? feedsUnverifiable : null,
    unverifiableFeeds: args.probeFeeds ? unverifiableFeeds : [],
  };

  const criticalGateCodes = [
    "DUPLICATE_STATIC_ID",
    "DUPLICATE_SLUG",
    "STALE_MVP_LEAGUE_SEASON",
    "MVP_LEAGUE_FEED_FIXTURE_MISSING_FROM_DB",
    "MVP_PUBLISHED_FIXTURE_MISSING_FROM_DB",
    "ACTIVE_MVP_LEAGUE_TEAM_NO_FUTURE_LEAGUE_FIXTURES",
    "UNRESOLVABLE_MATCH_URL",
  ];

  const hasCriticalFailures =
    gate.publishedMvpFixturesMissingFromDb > 0 ||
    gate.staleMvpLeagueSeasons > 0 ||
    gate.duplicateStaticIds > 0 ||
    gate.duplicateSlugs > 0 ||
    gate.unresolvableMatchUrls > 0 ||
    (gate.activeMvpLeagueTeamsMissingFuture !== null &&
      gate.activeMvpLeagueTeamsMissingFuture > 0) ||
    critical.some((c) => criticalGateCodes.includes(c.code));

  // PASS: verified feeds have no discrepancies.
  // WARN: no discrepancies among verified feeds, but ≥1 MVP feed was unverifiable (provider/HTTP).
  // FAIL: integrity or completeness discrepancy on a verified feed / DB gate check.
  const productionGate: "PASS" | "WARN" | "FAIL" = hasCriticalFailures
    ? "FAIL"
    : args.probeFeeds && feedsUnverifiable > 0
      ? "WARN"
      : "PASS";

  const productionGateMeaning =
    productionGate === "PASS"
      ? args.probeFeeds
        ? "No discrepancies found in Goalserve feeds that were successfully retrieved."
        : "No critical MVP integrity failures (feed verification skipped; pass --probe-feeds to verify)."
      : productionGate === "WARN"
        ? "No discrepancies in successfully retrieved feeds; one or more MVP feeds could not be verified because Goalserve returned an HTTP or provider error."
        : "Critical MVP fixture coverage or integrity failure.";

  const summary = {
    productionGate,
    productionGateMeaning,
    mvpMechanism: "competitions.is_priority = true (consumed by MvpGraphBoundary + fixture refresh)",
    mvpCompetitionsConfigured: mvpComps.length,
    fullSeasonLeagues: leagues.length,
    domesticCups: cups.length,
    uefaCompetitions: uefa.length,
    internationalTournaments: intl.length,
    uniqueMvpTeams: mvpTeams.length,
    mvpTeamsWithZeroLeagueFixtures: zeroTotal.length,
    activeMvpLeagueTeamsWithZeroFuture: zeroFutureActive.length,
    inventory,
    feedComparisons,
    gate,
    critical: critical.slice(0, 80),
    warnings: warnings.slice(0, 80),
    sample,
    zeroFutureSamples: zeroFutureActive.slice(0, 25).map((r) => ({
      name: r.name,
      slug: r.slug,
      leagueFixtures: r.league_fixtures,
    })),
    allTeamsSummary,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("\n=== MVP Fixture Production Gate ===");
    console.log(`Result: ${summary.productionGate}`);
    console.log(`Meaning: ${productionGateMeaning}`);
    if (args.probeFeeds) {
      console.log(
        `Feeds verified: ${feedsVerified}/${mvpComps.length}; unverifiable: ${feedsUnverifiable}`,
      );
      if (unverifiableFeeds.length) {
        console.log("Unverifiable MVP feeds (Goalserve provider/HTTP):");
        for (const f of unverifiableFeeds) {
          console.log(` - ${f.goalserveId} ${f.name}: ${f.error}`);
        }
      }
    }
    console.log(`MVP competitions: ${summary.mvpCompetitionsConfigured}`);
    console.log(`  leagues=${leagues.length} cups=${cups.length} uefa=${uefa.length} intl=${intl.length}`);
    console.log(`Unique MVP teams (current membership): ${summary.uniqueMvpTeams}`);
    console.log(`Active league teams with 0 future league fixtures: ${summary.activeMvpLeagueTeamsWithZeroFuture}`);
    console.log(`Duplicate static_id: ${gate.duplicateStaticIds}`);
    console.log(`Duplicate slugs: ${gate.duplicateSlugs}`);
    console.log(`Unresolvable Match URLs (sample window): ${gate.unresolvableMatchUrls}`);
    console.log(`Published fixtures missing from DB: ${gate.publishedMvpFixturesMissingFromDb}`);
    console.log(`Stale MVP league seasons: ${gate.staleMvpLeagueSeasons}`);
    if (critical.length) {
      console.log("\nCritical (first 40):");
      for (const c of critical.slice(0, 40)) console.log(` - ${c.code}: ${c.detail}`);
    }
    if (warnings.length) {
      console.log("\nWarnings (first 20):");
      for (const w of warnings.slice(0, 20)) console.log(` - ${w.code}: ${w.detail}`);
    }
    if (sample.length) {
      console.log("\nSample teams:");
      for (const s of sample) {
        console.log(
          ` - ${(s as any).team}: league=${(s as any).leagueFixtureCount} futureLeague=${(s as any).futureLeagueFixtures} result=${(s as any).result}`,
        );
      }
    }
  }

  process.exit(productionGate === "FAIL" ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
