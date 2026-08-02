import { and, desc, eq, inArray, ne, or, lt, isNotNull, SQL } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { db } from "../db";
import {
  articles,
  articleCompetitions,
  articleTeams,
  competitionTeamMemberships,
  competitions,
  matches,
  standingsRows,
  standingsSnapshots,
  teams,
  type Match,
  type Team,
} from "@shared/schema";
import {
  getPublicCompetitionDisplayName,
  isClubFriendlyCompetition,
} from "@shared/competition-display";
import { readGoalserveMatchTimeline } from "@shared/goalserve-match-detail";
import { parseGoalserveLineups } from "@shared/goalserve-lineup";
import { resolveMatchDetailHref } from "@shared/match-slug";
import { resolveMatchCentreState } from "@shared/match-centre-state";
import type {
  MatchCentreFormMatch,
  MatchCentreFormResult,
  MatchCentreFixtureLink,
  MatchCentreH2H,
  MatchCentreLineups,
  MatchCentrePayload,
  MatchCentreRelatedArticle,
  MatchCentreStandingContext,
  MatchCentreTeamContext,
  MatchCentreTeamRef,
} from "@shared/match-centre";
import {
  isEligibleCompletedH2HMatch,
  isEligibleFormMatch,
  isEligibleNextFixture,
  isEligiblePreEventH2HMatch,
  formResultForTeam,
  summariseH2HForCurrentFixture,
} from "@shared/match-centre-filters";
import { getCompetitionSeasonsForLeague } from "../lib/competition-seasons";

const homeTeamAlias = aliasedTable(teams, "mc_home_team");
const awayTeamAlias = aliasedTable(teams, "mc_away_team");

function teamRef(
  team: Team | undefined | null,
  fallbackName: string,
  goalserveTeamId?: string | null,
): MatchCentreTeamRef {
  return {
    id: team?.id ?? null,
    name: team?.name || fallbackName,
    shortName: team?.shortName || fallbackName.slice(0, 3).toUpperCase(),
    slug: team?.slug || "",
    primaryColor: team?.primaryColor ?? null,
    logoUrl: team?.logoUrl ?? null,
    goalserveTeamId: goalserveTeamId ?? team?.goalserveTeamId ?? null,
  };
}

function isFriendlyRow(row: {
  goalserveCompetitionId?: string | null;
  competition?: string | null;
}): boolean {
  return isClubFriendlyCompetition({
    goalserveCompetitionId: row.goalserveCompetitionId,
    competitionName: row.competition,
  });
}

function formResult(
  homeScore: number,
  awayScore: number,
  side: "home" | "away",
): MatchCentreFormResult {
  return formResultForTeam(homeScore, awayScore, side);
}

function matchHref(row: {
  slug?: string | null;
  kickoffTime?: Date | string | null;
  homeSlug?: string | null;
  awaySlug?: string | null;
}): string | null {
  return resolveMatchDetailHref({
    slug: row.slug,
    homeTeamSlug: row.homeSlug,
    awayTeamSlug: row.awaySlug,
    kickoffTime: row.kickoffTime,
  });
}

type EnrichedMatchRow = {
  id: string;
  slug: string;
  kickoffTime: Date | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
  competition: string | null;
  goalserveCompetitionId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoalserveTeamId: string | null;
  awayGoalserveTeamId: string | null;
  homeSlug: string | null;
  awaySlug: string | null;
  homeName: string | null;
  awayName: string | null;
};

async function loadTeamMatches(
  teamId: string | null,
  goalserveTeamId: string | null,
  currentMatchId: string,
  opts: { includeFriendlies: boolean },
): Promise<EnrichedMatchRow[]> {
  if (!teamId && !goalserveTeamId) return [];

  const teamClause = teamId
    ? or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId))
    : or(
        eq(matches.homeGoalserveTeamId, goalserveTeamId!),
        eq(matches.awayGoalserveTeamId, goalserveTeamId!),
      );

  const rows = await db
    .select({
      id: matches.id,
      slug: matches.slug,
      kickoffTime: matches.kickoffTime,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      competition: matches.competition,
      goalserveCompetitionId: matches.goalserveCompetitionId,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeGoalserveTeamId: matches.homeGoalserveTeamId,
      awayGoalserveTeamId: matches.awayGoalserveTeamId,
      homeSlug: homeTeamAlias.slug,
      awaySlug: awayTeamAlias.slug,
      homeName: homeTeamAlias.name,
      awayName: awayTeamAlias.name,
    })
    .from(matches)
    .leftJoin(homeTeamAlias, eq(matches.homeTeamId, homeTeamAlias.id))
    .leftJoin(awayTeamAlias, eq(matches.awayTeamId, awayTeamAlias.id))
    .where(and(teamClause!, ne(matches.id, currentMatchId), isNotNull(matches.kickoffTime)))
    .orderBy(desc(matches.kickoffTime))
    .limit(80);

  return rows.filter((r) => opts.includeFriendlies || !isFriendlyRow(r));
}

function isTeamHome(
  row: EnrichedMatchRow,
  teamId: string | null,
  goalserveTeamId: string | null,
): boolean {
  if (teamId && row.homeTeamId === teamId) return true;
  if (!teamId && goalserveTeamId && row.homeGoalserveTeamId === goalserveTeamId) return true;
  if (teamId && row.homeTeamId === teamId) return true;
  if (goalserveTeamId && row.homeGoalserveTeamId === goalserveTeamId && row.homeTeamId === teamId) {
    return true;
  }
  if (teamId) return row.homeTeamId === teamId;
  return row.homeGoalserveTeamId === goalserveTeamId;
}

function toFormMatch(
  row: EnrichedMatchRow,
  teamId: string | null,
  goalserveTeamId: string | null,
): MatchCentreFormMatch | null {
  if (String(row.status || "").toLowerCase() !== "finished") return null;
  if (row.homeScore == null || row.awayScore == null || !row.kickoffTime) return null;

  const side: "home" | "away" = isTeamHome(row, teamId, goalserveTeamId) ? "home" : "away";
  return {
    opponentName: (side === "home" ? row.awayName : row.homeName) || "Opponent",
    opponentSlug: (side === "home" ? row.awaySlug : row.homeSlug) ?? null,
    opponentTeamId: (side === "home" ? row.awayTeamId : row.homeTeamId) ?? null,
    homeAway: side,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    result: formResult(row.homeScore, row.awayScore, side),
    kickoffTime: new Date(row.kickoffTime).toISOString(),
    competitionName: getPublicCompetitionDisplayName(row.competition, row.goalserveCompetitionId),
    href: matchHref(row),
  };
}

function toFixtureLink(
  row: EnrichedMatchRow,
  teamId: string | null,
  goalserveTeamId: string | null,
): MatchCentreFixtureLink {
  const side: "home" | "away" = isTeamHome(row, teamId, goalserveTeamId) ? "home" : "away";
  return {
    kickoffTime: new Date(row.kickoffTime!).toISOString(),
    homeTeamName: row.homeName || "Home",
    awayTeamName: row.awayName || "Away",
    homeTeamSlug: row.homeSlug ?? null,
    awayTeamSlug: row.awaySlug ?? null,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    competitionName: getPublicCompetitionDisplayName(row.competition, row.goalserveCompetitionId),
    status: row.status || "scheduled",
    href: matchHref(row),
    homeAway: side,
    opponentName: (side === "home" ? row.awayName : row.homeName) || "Opponent",
    opponentTeamId: (side === "home" ? row.awayTeamId : row.homeTeamId) ?? null,
  };
}

async function resolveDomesticStanding(
  teamId: string | null,
): Promise<MatchCentreStandingContext | null> {
  if (!teamId) return null;

  const memberships = await db
    .select({
      competitionName: competitions.name,
      competitionSlug: competitions.slug,
      goalserveCompetitionId: competitions.goalserveCompetitionId,
      season: competitions.season,
      isCup: competitions.isCup,
    })
    .from(competitionTeamMemberships)
    .innerJoin(competitions, eq(competitions.id, competitionTeamMemberships.competitionId))
    .where(
      and(
        eq(competitionTeamMemberships.teamId, teamId),
        eq(competitionTeamMemberships.isCurrent, true),
      ),
    )
    .limit(20);

  const league =
    memberships.find(
      (m) =>
        !m.isCup &&
        m.goalserveCompetitionId &&
        !isClubFriendlyCompetition({
          goalserveCompetitionId: m.goalserveCompetitionId,
          competitionName: m.competitionName,
        }),
    ) || memberships.find((m) => m.goalserveCompetitionId && !m.isCup);

  if (!league?.goalserveCompetitionId) return null;

  let seasonKey = league.season || null;
  try {
    const seasons = await getCompetitionSeasonsForLeague(league.goalserveCompetitionId);
    seasonKey = seasons.currentSeason?.key || seasonKey;
  } catch {
    // keep competition.season
  }
  if (!seasonKey) return null;

  const [snapshot] = await db
    .select()
    .from(standingsSnapshots)
    .where(
      and(
        eq(standingsSnapshots.leagueId, league.goalserveCompetitionId),
        eq(standingsSnapshots.season, seasonKey),
      ),
    )
    .orderBy(desc(standingsSnapshots.asOf))
    .limit(1);

  if (!snapshot) return null;

  const [row] = await db
    .select()
    .from(standingsRows)
    .where(and(eq(standingsRows.snapshotId, snapshot.id), eq(standingsRows.teamId, teamId)))
    .limit(1);

  if (!row) return null;

  return {
    position: row.position,
    played: row.played,
    points: row.points,
    competitionName: getPublicCompetitionDisplayName(
      league.competitionName,
      league.goalserveCompetitionId,
    ),
    competitionSlug: league.competitionSlug,
    season: seasonKey,
    tableLabel: "Current table",
  };
}

async function buildTeamContext(
  team: Team | undefined,
  goalserveTeamId: string | null,
  fallbackName: string,
  current: Match,
  kickoff: Date,
): Promise<MatchCentreTeamContext> {
  const teamId = team?.id ?? null;
  const includeFriendlies = isClubFriendlyCompetition({
    goalserveCompetitionId: current.goalserveCompetitionId,
    competitionName: current.competition,
  });

  const rows = await loadTeamMatches(teamId, goalserveTeamId, current.id, { includeFriendlies });
  const before = rows.filter((r) => r.kickoffTime && new Date(r.kickoffTime) < kickoff);
  const after = rows
    .filter((r) => r.kickoffTime && new Date(r.kickoffTime) > kickoff)
    .sort((a, b) => new Date(a.kickoffTime!).getTime() - new Date(b.kickoffTime!).getTime());

  const form: MatchCentreFormMatch[] = [];
  for (const row of before) {
    if (form.length >= 5) break;
    if (
      !isEligibleFormMatch({
        matchId: row.id,
        currentMatchId: current.id,
        status: row.status || "",
        kickoffTime: row.kickoffTime,
        currentKickoff: kickoff,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        goalserveCompetitionId: row.goalserveCompetitionId,
        competitionName: row.competition,
        includeFriendlies,
      })
    ) {
      continue;
    }
    const fm = toFormMatch(row, teamId, goalserveTeamId);
    if (fm) form.push(fm);
  }

  let previousFixture: MatchCentreFixtureLink | null = null;
  for (const row of before) {
    if (String(row.status || "").toLowerCase() !== "finished") continue;
    if (row.homeScore == null || row.awayScore == null) continue;
    if (
      !includeFriendlies &&
      isFriendlyRow(row)
    ) {
      continue;
    }
    previousFixture = toFixtureLink(row, teamId, goalserveTeamId);
    break;
  }

  const nextFixtures: MatchCentreFixtureLink[] = [];
  for (const row of after) {
    if (nextFixtures.length >= 5) break;
    if (
      !isEligibleNextFixture({
        matchId: row.id,
        currentMatchId: current.id,
        status: row.status || "",
        kickoffTime: row.kickoffTime,
        currentKickoff: kickoff,
      })
    ) {
      continue;
    }
    nextFixtures.push(toFixtureLink(row, teamId, goalserveTeamId));
  }

  const standing = await resolveDomesticStanding(teamId);

  return {
    team: teamRef(team, fallbackName, goalserveTeamId),
    standing,
    form,
    previousFixture,
    nextFixtures,
  };
}

async function buildH2H(
  current: Match,
  homeTeam: Team | undefined,
  awayTeam: Team | undefined,
  includeCurrent: boolean,
): Promise<MatchCentreH2H> {
  const emptyMessage = "No recorded meetings.";
  const homeId = homeTeam?.id ?? null;
  const awayId = awayTeam?.id ?? null;
  const homeGs = current.homeGoalserveTeamId;
  const awayGs = current.awayGoalserveTeamId;

  if ((!homeId || !awayId) && (!homeGs || !awayGs)) {
    return { matches: [], summary: { homeTeamWins: 0, draws: 0, awayTeamWins: 0 }, emptyMessage };
  }

  const pairClause =
    homeId && awayId
      ? or(
          and(eq(matches.homeTeamId, homeId), eq(matches.awayTeamId, awayId)),
          and(eq(matches.homeTeamId, awayId), eq(matches.awayTeamId, homeId)),
        )
      : or(
          and(eq(matches.homeGoalserveTeamId, homeGs!), eq(matches.awayGoalserveTeamId, awayGs!)),
          and(eq(matches.homeGoalserveTeamId, awayGs!), eq(matches.awayGoalserveTeamId, homeGs!)),
        );

  const kickoff = current.kickoffTime ? new Date(current.kickoffTime) : new Date(0);
  const conditions: SQL[] = [
    pairClause!,
    eq(matches.status, "finished"),
    isNotNull(matches.homeScore),
    isNotNull(matches.awayScore),
  ];
  if (!includeCurrent) {
    conditions.push(ne(matches.id, current.id));
    conditions.push(lt(matches.kickoffTime, kickoff));
  }

  const rows = await db
    .select({
      id: matches.id,
      slug: matches.slug,
      kickoffTime: matches.kickoffTime,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      competition: matches.competition,
      goalserveCompetitionId: matches.goalserveCompetitionId,
      goalserveStaticId: matches.goalserveStaticId,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeGoalserveTeamId: matches.homeGoalserveTeamId,
      awayGoalserveTeamId: matches.awayGoalserveTeamId,
      homeSlug: homeTeamAlias.slug,
      awaySlug: awayTeamAlias.slug,
      homeName: homeTeamAlias.name,
      awayName: awayTeamAlias.name,
    })
    .from(matches)
    .leftJoin(homeTeamAlias, eq(matches.homeTeamId, homeTeamAlias.id))
    .leftJoin(awayTeamAlias, eq(matches.awayTeamId, awayTeamAlias.id))
    .where(and(...conditions))
    .orderBy(desc(matches.kickoffTime))
    .limit(20);

  const filtered: (EnrichedMatchRow & { goalserveStaticId?: string | null })[] = [];
  const seenStatic = new Set<string>();
  for (const r of rows) {
    const eligible = includeCurrent
      ? isEligibleCompletedH2HMatch({
          matchId: r.id,
          currentMatchId: current.id,
          status: r.status || "",
          kickoffTime: r.kickoffTime,
          currentKickoff: kickoff,
          homeScore: r.homeScore,
          awayScore: r.awayScore,
        })
      : isEligiblePreEventH2HMatch({
          matchId: r.id,
          currentMatchId: current.id,
          status: r.status || "",
          kickoffTime: r.kickoffTime,
          currentKickoff: kickoff,
          homeScore: r.homeScore,
          awayScore: r.awayScore,
        });
    if (!eligible) continue;
    const sid = String(r.goalserveStaticId ?? "").trim();
    if (sid) {
      if (seenStatic.has(sid)) continue;
      seenStatic.add(sid);
    }
    filtered.push(r);
    if (filtered.length >= 5) break;
  }

  if (
    includeCurrent &&
    String(current.status || "").toLowerCase() === "finished" &&
    current.homeScore != null &&
    current.awayScore != null &&
    !filtered.some((r) => r.id === current.id)
  ) {
    const curSid = String(current.goalserveStaticId ?? "").trim();
    if (!curSid || !seenStatic.has(curSid)) {
      filtered.unshift({
        id: current.id,
        slug: current.slug,
        kickoffTime: current.kickoffTime,
        homeScore: current.homeScore,
        awayScore: current.awayScore,
        status: current.status,
        competition: current.competition,
        goalserveCompetitionId: current.goalserveCompetitionId,
        homeTeamId: current.homeTeamId,
        awayTeamId: current.awayTeamId,
        homeGoalserveTeamId: current.homeGoalserveTeamId,
        awayGoalserveTeamId: current.awayGoalserveTeamId,
        homeSlug: homeTeam?.slug ?? null,
        awaySlug: awayTeam?.slug ?? null,
        homeName: homeTeam?.name ?? null,
        awayName: awayTeam?.name ?? null,
      });
    }
  }

  const slice = filtered.slice(0, 5);
  const summary = summariseH2HForCurrentFixture({
    centreHomeTeamId: homeId,
    centreHomeGoalserveId: homeGs,
    meetings: slice.map((r) => ({
      homeTeamId: r.homeTeamId,
      homeGoalserveTeamId: r.homeGoalserveTeamId,
      homeScore: r.homeScore ?? 0,
      awayScore: r.awayScore ?? 0,
    })),
  });

  const h2hMatches = slice.map((r) => {
    const hs = r.homeScore ?? 0;
    const ascore = r.awayScore ?? 0;
    return {
      kickoffTime: r.kickoffTime ? new Date(r.kickoffTime).toISOString() : "",
      homeTeamName: r.homeName || "Home",
      awayTeamName: r.awayName || "Away",
      homeTeamSlug: r.homeSlug ?? null,
      awayTeamSlug: r.awaySlug ?? null,
      homeScore: hs,
      awayScore: ascore,
      competitionName: getPublicCompetitionDisplayName(r.competition, r.goalserveCompetitionId),
      href: matchHref(r),
      isCurrentMatch: r.id === current.id,
    };
  });

  return {
    matches: h2hMatches,
    summary,
    emptyMessage: h2hMatches.length ? null : emptyMessage,
  };
}

async function buildRelatedNews(
  homeTeamId: string | null,
  awayTeamId: string | null,
  competitionId: string | null,
): Promise<MatchCentreRelatedArticle[]> {
  const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];
  if (!teamIds.length && !competitionId) return [];

  const conditions = [];
  if (teamIds.length) conditions.push(inArray(articleTeams.teamId, teamIds));
  if (competitionId) conditions.push(eq(articleCompetitions.competitionId, competitionId));

  const rows = await db
    .selectDistinct({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      coverImage: articles.coverImage,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .leftJoin(articleTeams, eq(articleTeams.articleId, articles.id))
    .leftJoin(articleCompetitions, eq(articleCompetitions.articleId, articles.id))
    .where(or(...conditions))
    .orderBy(desc(articles.publishedAt))
    .limit(12);

  const bothTeamBoost = new Map<string, number>();
  if (teamIds.length === 2 && rows.length) {
    const links = await db
      .select({ articleId: articleTeams.articleId, teamId: articleTeams.teamId })
      .from(articleTeams)
      .where(
        and(
          inArray(
            articleTeams.articleId,
            rows.map((r) => r.id),
          ),
          inArray(articleTeams.teamId, teamIds),
        ),
      );
    for (const link of links) {
      bothTeamBoost.set(link.articleId, (bothTeamBoost.get(link.articleId) || 0) + 1);
    }
  }

  return rows
    .sort((a, b) => {
      const boostA = bothTeamBoost.get(a.id) || 0;
      const boostB = bothTeamBoost.get(b.id) || 0;
      if (boostA !== boostB) return boostB - boostA;
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt ?? null,
      coverImage: r.coverImage ?? null,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    }));
}

function lineupsFromTimeline(
  timeline: ReturnType<typeof readGoalserveMatchTimeline>,
): MatchCentreLineups | null {
  if (!timeline) return null;
  const parsed = parseGoalserveLineups(timeline) ?? parseGoalserveLineups(timeline.raw ?? null);
  if (!parsed) return null;
  const mapTeam = (
    t: NonNullable<typeof parsed.home>,
  ): NonNullable<MatchCentreLineups["home"]> => ({
    formation: t.formation,
    starters: t.starters.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      formationPos: p.formationPos,
    })),
    substitutes: t.substitutes.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      formationPos: p.formationPos,
    })),
  });
  return {
    kind: "confirmed",
    home: parsed.home ? mapTeam(parsed.home) : null,
    away: parsed.away ? mapTeam(parsed.away) : null,
  };
}

export async function buildMatchCentrePayload(
  match: Match & { homeTeam?: Team; awayTeam?: Team },
): Promise<MatchCentrePayload> {
  const timeline = readGoalserveMatchTimeline(match.timeline);
  const state = resolveMatchCentreState({
    rawStatus: timeline?.status ?? null,
    storedStatus: match.status,
  });
  const lineups = lineupsFromTimeline(timeline);

  const kickoff = match.kickoffTime ? new Date(match.kickoffTime) : new Date();
  const includeCurrentInH2H = state.presentationState === "COMPLETED";

  const emptyTeam = (
    fallback: string,
    team?: Team,
    goalserveTeamId?: string | null,
  ): MatchCentreTeamContext => ({
    team: teamRef(team, fallback, goalserveTeamId),
    standing: null,
    form: [],
    previousFixture: null,
    nextFixtures: [],
  });

  const [homeRes, awayRes, h2hRes, newsRes, competitionRes] = await Promise.allSettled([
    buildTeamContext(match.homeTeam, match.homeGoalserveTeamId, "Home", match, kickoff),
    buildTeamContext(match.awayTeam, match.awayGoalserveTeamId, "Away", match, kickoff),
    buildH2H(match, match.homeTeam, match.awayTeam, includeCurrentInH2H),
    buildRelatedNews(
      match.homeTeam?.id ?? match.homeTeamId ?? null,
      match.awayTeam?.id ?? match.awayTeamId ?? null,
      match.competitionId ?? null,
    ),
    match.competitionId
      ? db
          .select({
            slug: competitions.slug,
            name: competitions.name,
            season: competitions.season,
            goalserveCompetitionId: competitions.goalserveCompetitionId,
          })
          .from(competitions)
          .where(eq(competitions.id, match.competitionId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  if (homeRes.status === "rejected") console.error("[match-centre] home context failed", homeRes.reason);
  if (awayRes.status === "rejected") console.error("[match-centre] away context failed", awayRes.reason);
  if (h2hRes.status === "rejected") console.error("[match-centre] h2h failed", h2hRes.reason);
  if (newsRes.status === "rejected") console.error("[match-centre] news failed", newsRes.reason);

  const homeCtx =
    homeRes.status === "fulfilled"
      ? homeRes.value
      : emptyTeam("Home", match.homeTeam, match.homeGoalserveTeamId);
  const awayCtx =
    awayRes.status === "fulfilled"
      ? awayRes.value
      : emptyTeam("Away", match.awayTeam, match.awayGoalserveTeamId);
  const h2h =
    h2hRes.status === "fulfilled"
      ? h2hRes.value
      : {
          matches: [],
          summary: { homeTeamWins: 0, draws: 0, awayTeamWins: 0 },
          emptyMessage: "No recorded meetings.",
        };
  const relatedNews = newsRes.status === "fulfilled" ? newsRes.value : [];
  const competitionRow = competitionRes.status === "fulfilled" ? competitionRes.value : null;

  const competitionName = getPublicCompetitionDisplayName(
    competitionRow?.name || match.competition,
    competitionRow?.goalserveCompetitionId || match.goalserveCompetitionId,
  );
  const goalserveCompetitionId =
    competitionRow?.goalserveCompetitionId || match.goalserveCompetitionId || null;

  return {
    match: {
      id: match.id,
      slug: match.slug,
      kickoffTime: match.kickoffTime ? new Date(match.kickoffTime).toISOString() : null,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      venue: match.venue || timeline?.venue || null,
      referee: timeline?.referee || null,
      competitionName,
      goalserveCompetitionId,
      competitionSlug: competitionRow?.slug ?? null,
      season: match.seasonKey || competitionRow?.season || null,
      round: match.goalserveRound || null,
      status: match.status || "scheduled",
      timeline,
      homeTeam: homeCtx.team,
      awayTeam: awayCtx.team,
    },
    state,
    presentationState: state.presentationState,
    home: homeCtx,
    away: awayCtx,
    h2h,
    relatedNews,
    lineups,
  };
}
