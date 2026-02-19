/**
 * Article entity enrichment (pills): deterministic mention matching for teams, players, managers, competitions.
 * Populates article_teams, article_players, article_managers, article_competitions. Idempotent and resumable.
 */

import { db } from "../db";
import {
  articles,
  teams,
  players,
  managers,
  competitions,
  articleTeams,
  articlePlayers,
  articleManagers,
  articleCompetitions,
} from "@shared/schema";
import { eq, desc, or, lt, and } from "drizzle-orm";

const ENRICH_SOURCE = "enrich";
const LIMIT_TEAMS = 3;
const LIMIT_PLAYERS = 3;
const LIMIT_MANAGERS = 2;
const LIMIT_COMPETITIONS = 1;
const DEFAULT_TIME_BUDGET_MS = 10_000;
const ERROR_TRUNCATE = 500;

/** Strip HTML tags for plain-text matching. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract whole words (letters only) with positions. Returns [{ word: lowercased, position: index }]. */
function extractWords(text: string): { word: string; position: number }[] {
  const out: { word: string; position: number }[] = [];
  const re = /\b[a-zA-Z]+\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ word: m[0].toLowerCase(), position: m.index });
  }
  return out;
}

/** Score: title weight 1000, excerpt 500, body by inverse position (earlier = higher). */
function scorePosition(zone: "title" | "excerpt" | "body", position: number, bodyLength: number): number {
  if (zone === "title") return 1000;
  if (zone === "excerpt") return 500;
  return Math.max(1, 100 - Math.floor(position / Math.max(1, bodyLength / 100)));
}

interface ScoredMatch<T> {
  entity: T;
  score: number;
}

/** Build alias list for an entity: name and slug as words, plus shortName if present. */
function aliasTerms(name: string | null, slug: string | null, shortName?: string | null): string[] {
  const terms = new Set<string>();
  [name, slug, shortName].forEach((s) => {
    if (s && typeof s === "string") {
      s.split(/\s+/).forEach((w) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (clean.length > 1) terms.add(clean);
      });
      const single = (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (single.length > 1) terms.add(single);
    }
  });
  return Array.from(terms);
}

/** Find top N entity matches by whole-word mentions in title, excerpt, body. */
function matchEntities<T extends { id: string }>(
  titleWords: { word: string; position: number }[],
  excerptWords: { word: string; position: number }[],
  bodyWords: { word: string; position: number }[],
  bodyLength: number,
  entities: T[],
  getTerms: (e: T) => string[],
  topN: number
): ScoredMatch<T>[] {
  const scores = new Map<string, number>();

  for (const entity of entities) {
    const terms = getTerms(entity);
    let total = 0;
    for (const term of terms) {
      const t = term.toLowerCase();
      for (const { word, position } of titleWords) {
        if (word === t) total += scorePosition("title", position, 0);
      }
      for (const { word, position } of excerptWords) {
        if (word === t) total += scorePosition("excerpt", position, 0);
      }
      for (const { word, position } of bodyWords) {
        if (word === t) total += scorePosition("body", position, bodyLength);
      }
    }
    if (total > 0) {
      scores.set(entity.id, (scores.get(entity.id) ?? 0) + total);
    }
  }

  return entities
    .filter((e) => (scores.get(e.id) ?? 0) > 0)
    .map((e) => ({ entity: e, score: scores.get(e.id)! }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

export interface EnrichPendingArticlesOptions {
  limit?: number;
  timeBudgetMs?: number;
}

/** Process up to `limit` pending articles, stop when time budget exceeded. */
export async function enrichPendingArticles(options: EnrichPendingArticlesOptions = {}): Promise<{
  processed: number;
  done: number;
  errors: number;
}> {
  const { limit = 50, timeBudgetMs = DEFAULT_TIME_BUDGET_MS } = options;
  const start = Date.now();
  let processed = 0;
  let done = 0;
  let errors = 0;

  // Load entity alias data once per batch (teams: name, slug, shortName; players/managers/competitions: name, slug).
  const [allTeams, allPlayers, allManagers, allCompetitions] = await Promise.all([
    db.select({ id: teams.id, name: teams.name, slug: teams.slug, shortName: teams.shortName }).from(teams),
    db.select({ id: players.id, name: players.name, slug: players.slug }).from(players),
    db.select({ id: managers.id, name: managers.name, slug: managers.slug }).from(managers),
    db.select({ id: competitions.id, name: competitions.name, slug: competitions.slug, canonicalSlug: competitions.canonicalSlug }).from(competitions),
  ]);

  // Pending, or stuck in 'processing' for > 5 min (resumable).
  const staleProcessing = new Date(Date.now() - 5 * 60 * 1000);
  const pending = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      content: articles.content,
    })
    .from(articles)
    .where(
      or(
        eq(articles.entityEnrichStatus, "pending"),
        and(
          eq(articles.entityEnrichStatus, "processing"),
          lt(articles.entityEnrichAttemptedAt, staleProcessing)
        )
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit);

  for (const row of pending) {
    if (Date.now() - start >= timeBudgetMs) break;

    const articleId = row.id;
    try {
      // Mark as processing so we don't re-pick on resumable runs.
      await db
        .update(articles)
        .set({
          entityEnrichStatus: "processing",
          entityEnrichAttemptedAt: new Date(),
          entityEnrichError: null,
        })
        .where(eq(articles.id, articleId));

      const titleText = (row.title ?? "").trim();
      const excerptText = stripHtml((row.excerpt ?? "").trim());
      const bodyText = stripHtml(row.content ?? "");
      const titleWords = extractWords(titleText);
      const excerptWords = extractWords(excerptText);
      const bodyWords = extractWords(bodyText);
      const bodyLen = bodyText.length;

      // Top N matches per entity type (deterministic whole-word).
      const teamMatches = matchEntities(
        titleWords,
        excerptWords,
        bodyWords,
        bodyLen,
        allTeams,
        (t) => aliasTerms(t.name, t.slug, t.shortName),
        LIMIT_TEAMS
      );
      const playerMatches = matchEntities(
        titleWords,
        excerptWords,
        bodyWords,
        bodyLen,
        allPlayers,
        (p) => aliasTerms(p.name, p.slug),
        LIMIT_PLAYERS
      );
      const managerMatches = matchEntities(
        titleWords,
        excerptWords,
        bodyWords,
        bodyLen,
        allManagers,
        (m) => aliasTerms(m.name, m.slug),
        LIMIT_MANAGERS
      );
      const competitionMatches = matchEntities(
        titleWords,
        excerptWords,
        bodyWords,
        bodyLen,
        allCompetitions,
        (c) => aliasTerms(c.name, c.slug, c.canonicalSlug),
        LIMIT_COMPETITIONS
      );

      // Idempotent: only insert links that don't already exist (no unique constraint on join tables).
      const existingTeams = await db
        .select({ teamId: articleTeams.teamId })
        .from(articleTeams)
        .where(eq(articleTeams.articleId, articleId));
      const existingTeamIds = new Set(existingTeams.map((r) => r.teamId));
      for (const { entity, score } of teamMatches) {
        if (existingTeamIds.has(entity.id)) continue;
        await db.insert(articleTeams).values({
          articleId,
          teamId: entity.id,
          source: ENRICH_SOURCE,
          salienceScore: Math.min(100, Math.round(score)),
        });
      }

      const existingPlayers = await db
        .select({ playerId: articlePlayers.playerId })
        .from(articlePlayers)
        .where(eq(articlePlayers.articleId, articleId));
      const existingPlayerIds = new Set(existingPlayers.map((r) => r.playerId));
      for (const { entity, score } of playerMatches) {
        if (existingPlayerIds.has(entity.id)) continue;
        await db.insert(articlePlayers).values({
          articleId,
          playerId: entity.id,
          source: ENRICH_SOURCE,
          salienceScore: Math.min(100, Math.round(score)),
        });
      }

      const existingManagers = await db
        .select({ managerId: articleManagers.managerId })
        .from(articleManagers)
        .where(eq(articleManagers.articleId, articleId));
      const existingManagerIds = new Set(existingManagers.map((r) => r.managerId));
      for (const { entity, score } of managerMatches) {
        if (existingManagerIds.has(entity.id)) continue;
        await db.insert(articleManagers).values({
          articleId,
          managerId: entity.id,
          source: ENRICH_SOURCE,
          salienceScore: Math.min(100, Math.round(score)),
        });
      }

      const existingComps = await db
        .select({ competitionId: articleCompetitions.competitionId })
        .from(articleCompetitions)
        .where(eq(articleCompetitions.articleId, articleId));
      const existingCompIds = new Set(existingComps.map((r) => r.competitionId));
      for (const { entity, score } of competitionMatches) {
        if (existingCompIds.has(entity.id)) continue;
        await db.insert(articleCompetitions).values({
          articleId,
          competitionId: entity.id,
          source: ENRICH_SOURCE,
          salienceScore: Math.min(100, Math.round(score)),
        });
      }

      await db
        .update(articles)
        .set({ entityEnrichStatus: "done", entityEnrichError: null })
        .where(eq(articles.id, articleId));
      done++;
    } catch (err) {
      const msg = (err as Error).message.slice(0, ERROR_TRUNCATE);
      await db
        .update(articles)
        .set({ entityEnrichStatus: "error", entityEnrichError: msg })
        .where(eq(articles.id, articleId));
      errors++;
    }
    processed++;
  }

  return { processed, done, errors };
}
