/**
 * Validation helper for match experience report — not a production job.
 * Usage: npx tsx script/validate-match-experience-report.ts
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { storage } from "../server/storage";
import { buildPublicMatchDetailSlug } from "../shared/match-slug";
import { readGoalserveMatchTimeline } from "../shared/goalserve-match-detail";
import { goalserveFetch } from "../server/integrations/goalserve/client";
import { upsertGoalserveMatches } from "../server/jobs/upsert-goalserve-matches";

async function main() {
  const withEvents = await db.execute(sql`
    SELECT m.id, m.slug, m.status, m.kickoff_time, m.home_score, m.away_score,
      ht.slug AS hs, at.slug AS aws, ht.name AS hn, at.name AS an,
      m.timeline
    FROM matches m
    LEFT JOIN teams ht ON ht.id = m.home_team_id
    LEFT JOIN teams at ON at.id = m.away_team_id
    WHERE m.timeline IS NOT NULL
      AND (
        (jsonb_typeof(m.timeline->'events') = 'array' AND jsonb_array_length(m.timeline->'events') > 0)
        OR (jsonb_typeof(m.timeline->'stats') = 'array' AND jsonb_array_length(m.timeline->'stats') > 0)
      )
    ORDER BY m.kickoff_time DESC
    LIMIT 10
  `);
  console.log("rich_timeline_rows", withEvents.rows.length);
  for (const r of withEvents.rows as any[]) {
    const t = readGoalserveMatchTimeline(r.timeline);
    console.log({
      slug: r.slug,
      status: r.status,
      hn: r.hn,
      an: r.an,
      score: [r.home_score, r.away_score],
      events: t?.events?.length ?? 0,
      stats: t?.stats?.length ?? 0,
      timer: t?.timer,
      ht: t?.htScore,
      public:
        r.hs && r.aws
          ? buildPublicMatchDetailSlug(String(r.hs), String(r.aws), new Date(r.kickoff_time))
          : null,
    });
  }

  const liveUp = await upsertGoalserveMatches("soccernew/live");
  console.log("live_upsert", {
    ok: liveUp.ok,
    updated: liveUp.updated,
    inserted: liveUp.inserted,
    error: liveUp.error,
  });

  const after = await db.execute(sql`
    SELECT m.slug, m.status, ht.slug AS hs, at.slug AS aws, ht.name AS hn, at.name AS an,
      m.home_score, m.away_score, m.kickoff_time, m.timeline
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    WHERE m.status = 'live'
      AND m.timeline IS NOT NULL
      AND (
        (jsonb_typeof(m.timeline->'events') = 'array' AND jsonb_array_length(m.timeline->'events') > 0)
        OR (jsonb_typeof(m.timeline->'stats') = 'array' AND jsonb_array_length(m.timeline->'stats') > 0)
      )
    ORDER BY jsonb_array_length(coalesce(m.timeline->'events', '[]'::jsonb)) DESC
    LIMIT 5
  `);
  console.log("live_with_detail", after.rows.length);
  for (const r of after.rows as any[]) {
    const publicSlug = buildPublicMatchDetailSlug(
      String(r.hs),
      String(r.aws),
      new Date(r.kickoff_time),
    );
    const api = publicSlug ? await storage.getMatchBySlug(publicSlug!) : null;
    const apiT = readGoalserveMatchTimeline(api?.timeline);
    console.log({
      publicSlug,
      resolved: !!api,
      status: api?.status,
      score: [api?.homeScore, api?.awayScore],
      events: apiT?.events?.length ?? 0,
      stats: apiT?.stats?.length ?? 0,
      timer: apiT?.timer,
      ht: apiT?.htScore,
      sampleEvent: apiT?.events?.[0] ?? null,
      sampleStat: apiT?.stats?.[0] ?? null,
    });
  }

  const mapping = await goalserveFetch("soccerfixtures/data/mapping");
  const s = JSON.stringify(mapping);
  const id1611 = s.indexOf('"@id":"1611"');
  console.log("id_1611_context", id1611 >= 0 ? s.slice(id1611, id1611 + 280) : "not found");
  const menCs = [...s.matchAll(/\{"@id":"(\d+)","@country":"England","@name":"Community Shield"[^}]+\}/g)];
  console.log(
    "england_community_shield",
    menCs.map((m) => m[0].slice(0, 260)),
  );

  // Search entire mapping for Arsenal vs Dortmund / City in any stored path is not possible offline;
  // probe day feeds for those names is expensive. Confirm CS feed entitlement.
  for (const id of ["1611", "18826"]) {
    try {
      const data = await goalserveFetch(`soccerfixtures/leagueid/${id}`);
      const bytes = JSON.stringify(data).length;
      console.log("feed_ok", id, "bytes", bytes, "season", data?.results?.tournament?.["@season"]);
    } catch (e: any) {
      console.log("feed_fail", id, e.message?.slice(0, 120));
    }
  }

  const fut = await storage.getMatchBySlug("arsenal-vs-betis-2026-08-05");
  console.log("prematch_betis", {
    found: !!fut,
    status: fut?.status,
    venue: fut?.venue,
    home: fut?.homeTeam?.name,
    away: fut?.awayTeam?.name,
    logoHome: !!fut?.homeTeam?.logoUrl,
    logoAway: !!fut?.awayTeam?.logoUrl,
    events: readGoalserveMatchTimeline(fut?.timeline)?.events?.length ?? 0,
  });

  const finishedRich = await db.execute(sql`
    SELECT m.slug, m.status, ht.slug AS hs, at.slug AS aws, ht.name AS hn, at.name AS an,
      m.home_score, m.away_score, m.kickoff_time, m.timeline
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    WHERE m.status = 'finished'
      AND jsonb_typeof(m.timeline->'events') = 'array'
      AND jsonb_array_length(m.timeline->'events') > 0
    ORDER BY m.kickoff_time DESC
    LIMIT 3
  `);
  console.log("finished_with_events", finishedRich.rows.length);
  for (const r of finishedRich.rows as any[]) {
    const publicSlug = buildPublicMatchDetailSlug(
      String(r.hs),
      String(r.aws),
      new Date(r.kickoff_time),
    );
    const api = publicSlug ? await storage.getMatchBySlug(publicSlug!) : null;
    const t = readGoalserveMatchTimeline(api?.timeline);
    console.log({
      publicSlug,
      resolved: !!api,
      score: [api?.homeScore, api?.awayScore],
      events: t?.events?.length ?? 0,
      stats: t?.stats?.length ?? 0,
      ht: t?.htScore,
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
