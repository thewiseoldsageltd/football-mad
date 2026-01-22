import { db } from "../db";
import { matches, teams } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDMY(dmy?: string): { y: number; m: number; d: number } | null {
  // Goalserve often uses "21.01.2026"
  if (!dmy) return null;
  const parts = dmy.split(".");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  if (!dd || !mm || !yyyy) return null;
  return { y: yyyy, m: mm, d: dd };
}

function pickKickoffTime(match: any): string | null {
  // Many feeds put kickoff time in @status for scheduled games (e.g. "15:00", "00:15")
  const status = String(match?.["@status"] ?? match?.status ?? "");
  if (/^\d{1,2}:\d{2}$/.test(status)) return status;
  const time = String(match?.["@time"] ?? match?.time ?? "");
  if (/^\d{1,2}:\d{2}$/.test(time)) return time;
  return null;
}

function computeKickoff(match: any, matchesBlock: any): Date | null {
  const dmy =
    match?.["@formatted_date"] ??
    match?.formatted_date ??
    matchesBlock?.["@formatted_date"] ??
    matchesBlock?.formatted_date;

  const parsed = parseDMY(String(dmy ?? ""));
  if (!parsed) return null;

  const timeStr = pickKickoffTime(match) ?? "00:00";
  const [hh, mi] = timeStr.split(":").map((x: string) => parseInt(x, 10));
  const hour = Number.isFinite(hh) ? hh : 0;
  const minute = Number.isFinite(mi) ? mi : 0;

  // Store as UTC-ish timestamp without TZ (your DB column is timestamp without time zone)
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, hour, minute, 0));
}

function getHome(match: any): any {
  return match?.localteam ?? match?.home ?? match?.home_team ?? match?.hometeam ?? null;
}
function getAway(match: any): any {
  return match?.visitorteam ?? match?.away ?? match?.away_team ?? match?.awayteam ?? null;
}

function parseIntSafe(v: any): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function deriveStatus(match: any): string {
  const s = String(match?.["@status"] ?? match?.status ?? "").toLowerCase();

  // scheduled if looks like a time
  if (/^\d{1,2}:\d{2}$/.test(s)) return "scheduled";

  if (s.includes("ft") || s === "finished") return "finished";
  if (s.includes("ht")) return "live";
  if (s.includes("live")) return "live";
  if (s.includes("post") || s.includes("susp") || s.includes("abn")) return "postponed";

  // fallback
  return s || "scheduled";
}

export async function upsertGoalserveMatches(feed: string): Promise<{
  ok: boolean;
  feed: string;
  totalFromGoalserve: number;
  inserted: number;
  updated: number;
  skippedNoTeamMapping: number;
  skippedNoMatchId: number;
  sampleMissingTeams: { goalserveTeamId: string; name: string }[];
  error?: string;
  sample?: any;
}> {
  try {
    // feed examples: "home", "live", "d1", "d-1", etc
    console.log("[upsert-goalserve-matches] feed =", feed);
    const rawFeed = String(feed ?? "").trim().replace(/^\/+/, "");

    let feedPath = rawFeed;

    // If the caller passed just "home" (no slash), assume soccernew/<feed>
    if (!feedPath.includes("/")) {
      feedPath = `soccernew/${feedPath}`;
    }

    // If the caller passed something already prefixed, ensure we never double-prefix
    while (feedPath.startsWith("soccernew/soccernew/")) {
      feedPath = feedPath.replace("soccernew/soccernew/", "soccernew/");
    }

    console.log("[upsert-goalserve-matches] feedPath =", feedPath);

    const response = await goalserveFetch(feedPath);

    const categories = response?.scores?.category;
    if (!categories) {
      return {
        ok: false,
        feed,
        totalFromGoalserve: 0,
        inserted: 0,
        updated: 0,
        skippedNoTeamMapping: 0,
        skippedNoMatchId: 0,
        sampleMissingTeams: [],
        error: "No scores.category found",
        sample: Object.keys(response ?? {}),
      };
    }

    const categoryArray = Array.isArray(categories) ? categories : [categories];

    // Build team lookup map: goalserveTeamId -> db team row
    const dbTeams = await db
      .select({ id: teams.id, goalserveTeamId: teams.goalserveTeamId, name: teams.name, slug: teams.slug })
      .from(teams);

    const teamByGoalserveId = new Map<string, { id: string; name: string; slug: string }>();
    for (const t of dbTeams) {
      if (t.goalserveTeamId) teamByGoalserveId.set(String(t.goalserveTeamId), { id: t.id, name: t.name, slug: t.slug });
    }

    let totalFromGoalserve = 0;
    let inserted = 0;
    let updated = 0;
    let skippedNoTeamMapping = 0;
    let skippedNoMatchId = 0;

    const missingTeams: { goalserveTeamId: string; name: string }[] = [];
    const missingTeamSeen = new Set<string>();

    for (const cat of categoryArray) {
      const matchesBlock = cat?.matches;
      if (!matchesBlock) continue;

      const matchNode = matchesBlock?.match;
      if (!matchNode) continue;

      const matchArray = Array.isArray(matchNode) ? matchNode : [matchNode];

      for (const m of matchArray) {
        totalFromGoalserve++;

        const home = getHome(m);
        const away = getAway(m);

        const homeGsId = String(home?.["@id"] ?? home?.id ?? "");
        const awayGsId = String(away?.["@id"] ?? away?.id ?? "");

        const homeDb = teamByGoalserveId.get(homeGsId);
        const awayDb = teamByGoalserveId.get(awayGsId);

        if (!homeDb || !awayDb) {
          skippedNoTeamMapping++;
          if (homeGsId && !homeDb && !missingTeamSeen.has(homeGsId)) {
            missingTeamSeen.add(homeGsId);
            missingTeams.push({ goalserveTeamId: homeGsId, name: String(home?.["@name"] ?? home?.name ?? "Unknown") });
          }
          if (awayGsId && !awayDb && !missingTeamSeen.has(awayGsId)) {
            missingTeamSeen.add(awayGsId);
            missingTeams.push({ goalserveTeamId: awayGsId, name: String(away?.["@name"] ?? away?.name ?? "Unknown") });
          }
          continue;
        }

        const goalserveMatchId = String(m?.["@id"] ?? m?.id ?? "");
        const goalserveStaticId = String(m?.["@static_id"] ?? m?.static_id ?? "");
        if (!goalserveMatchId) {
          skippedNoMatchId++;
          continue;
        }

        const kickoff = computeKickoff(m, matchesBlock);
        if (!kickoff) {
          // if we cannot parse kickoff, still store something deterministic
          // but kickoff_time is NOT NULL in your schema, so skip for now
          continue;
        }

        const homeScore =
          parseIntSafe(home?.["@score"] ?? home?.score ?? m?.["@localteam_score"] ?? m?.localteam_score);
        const awayScore =
          parseIntSafe(away?.["@score"] ?? away?.score ?? m?.["@visitorteam_score"] ?? m?.visitorteam_score);

        const competitionId = String(cat?.["@id"] ?? cat?.id ?? "");
        const season = String(m?.["@season"] ?? m?.season ?? "");

        // Use stable slug based on Goalserve match id (avoids reschedule collisions)
        const slug = `gs-${goalserveMatchId}`;

        const venue = String(m?.["@venue"] ?? m?.venue ?? home?.venue?.["@name"] ?? home?.venue?.name ?? "");

        const status = deriveStatus(m);

        const existing = await db
          .select({ id: matches.id })
          .from(matches)
          .where(eq(matches.goalserveMatchId, goalserveMatchId))
          .limit(1);

        const payload = {
          slug,
          homeTeamId: homeDb.id,
          awayTeamId: awayDb.id,
          homeScore,
          awayScore,
          competition: String(cat?.["@name"] ?? cat?.name ?? "Unknown"),
          venue: venue || null,
          status,
          kickoffTime: kickoff,
          goalserveMatchId,
          goalserveCompetitionId: competitionId || null,
          goalserveStaticId: goalserveStaticId || null,
          season: season || null,
          raw: { category: cat, match: m },
        };

        if (existing.length > 0) {
          await db.update(matches).set(payload).where(eq(matches.goalserveMatchId, goalserveMatchId));
          updated++;
        } else {
          await db.insert(matches).values(payload);
          inserted++;
        }
      }
    }

    return {
      ok: true,
      feed,
      totalFromGoalserve,
      inserted,
      updated,
      skippedNoTeamMapping,
      skippedNoMatchId,
      sampleMissingTeams: missingTeams.slice(0, 15),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      feed,
      totalFromGoalserve: 0,
      inserted: 0,
      updated: 0,
      skippedNoTeamMapping: 0,
      skippedNoMatchId: 0,
      sampleMissingTeams: [],
      error,
      sample: error.slice(0, 300),
    };
  }
}
