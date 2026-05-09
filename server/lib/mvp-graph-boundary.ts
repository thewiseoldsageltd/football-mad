import { and, asc, desc, eq, inArray, isNull, notInArray, or, gt } from "drizzle-orm";
import { db } from "../db";
import {
  articleCompetitions,
  articleManagers,
  articlePlayers,
  articleTeams,
  competitions,
  competitionTeamMemberships,
  managers,
  playerTeamMemberships,
  players,
} from "@shared/schema";
import { TEAMS_PAGE_EXCLUDED_GOALSERVE_IDS } from "@shared/teams-mvp";

type RowWithId = { id: string };

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => typeof id === "string" && id.length > 0)));
}

export class MvpGraphBoundary {
  private mvpTeamIdsPromise: Promise<Set<string>> | null = null;
  private teamsPageMvpTeamIdsPromise: Promise<Set<string>> | null = null;
  private mvpCompetitionIdsPromise: Promise<Set<string>> | null = null;
  private playerCurrentTeamCache = new Map<string, string | null>();
  private managerCurrentTeamCache = new Map<string, string | null>();

  async getMvpTeamIds(): Promise<Set<string>> {
    if (!this.mvpTeamIdsPromise) {
      this.mvpTeamIdsPromise = (async () => {
        const rows = await db
          .select({ teamId: competitionTeamMemberships.teamId })
          .from(competitionTeamMemberships)
          .innerJoin(
            competitions,
            eq(competitionTeamMemberships.competitionId, competitions.id),
          )
          .where(
            and(
              eq(competitions.isPriority, true),
              eq(competitionTeamMemberships.isCurrent, true),
            ),
          );
        return new Set(rows.map((row) => row.teamId));
      })();
    }
    return this.mvpTeamIdsPromise;
  }

  /**
   * Teams page: `is_priority` competitions minus domestic cups and UEFA (see shared `TEAMS_PAGE_EXCLUDED_GOALSERVE_IDS`).
   */
  async getTeamsPageMvpTeamIds(): Promise<Set<string>> {
    if (!this.teamsPageMvpTeamIdsPromise) {
      const excluded = [...TEAMS_PAGE_EXCLUDED_GOALSERVE_IDS];
      this.teamsPageMvpTeamIdsPromise = (async () => {
        const rows = await db
          .select({ teamId: competitionTeamMemberships.teamId })
          .from(competitionTeamMemberships)
          .innerJoin(competitions, eq(competitionTeamMemberships.competitionId, competitions.id))
          .where(
            and(
              eq(competitionTeamMemberships.isCurrent, true),
              eq(competitions.isPriority, true),
              eq(competitions.isCup, false),
              or(
                isNull(competitions.goalserveCompetitionId),
                notInArray(competitions.goalserveCompetitionId, excluded),
              ),
            ),
          );
        return new Set(
          rows.map((row) => row.teamId).filter((id): id is string => typeof id === "string" && id.length > 0),
        );
      })();
    }
    return this.teamsPageMvpTeamIdsPromise;
  }

  async getMvpCompetitionIds(): Promise<Set<string>> {
    if (!this.mvpCompetitionIdsPromise) {
      this.mvpCompetitionIdsPromise = (async () => {
        const rows = await db
          .select({ id: competitions.id })
          .from(competitions)
          .where(eq(competitions.isPriority, true));
        return new Set(rows.map((row) => row.id));
      })();
    }
    return this.mvpCompetitionIdsPromise;
  }

  async isMvpTeam(teamId: string): Promise<boolean> {
    const mvpTeamIds = await this.getMvpTeamIds();
    return mvpTeamIds.has(teamId);
  }

  async isMvpCompetition(competitionId: string): Promise<boolean> {
    const mvpCompetitionIds = await this.getMvpCompetitionIds();
    return mvpCompetitionIds.has(competitionId);
  }

  private async hydratePlayerCurrentTeams(playerIds: string[]): Promise<void> {
    const missing = uniqueIds(playerIds).filter((id) => !this.playerCurrentTeamCache.has(id));
    if (missing.length === 0) return;

    const now = new Date();
    const activeMembershipRows = await db
      .select({
        playerId: playerTeamMemberships.playerId,
        teamId: playerTeamMemberships.teamId,
      })
      .from(playerTeamMemberships)
      .where(
        and(
          inArray(playerTeamMemberships.playerId, missing),
          or(
            isNull(playerTeamMemberships.endDate),
            gt(playerTeamMemberships.endDate, now),
          ),
        ),
      )
      .orderBy(
        asc(playerTeamMemberships.playerId),
        desc(playerTeamMemberships.startDate),
        desc(playerTeamMemberships.createdAt),
        desc(playerTeamMemberships.id),
      );

    for (const row of activeMembershipRows) {
      if (!this.playerCurrentTeamCache.has(row.playerId)) {
        this.playerCurrentTeamCache.set(row.playerId, row.teamId);
      }
    }

    const unresolvedPlayerIds = missing.filter((id) => !this.playerCurrentTeamCache.has(id));
    if (unresolvedPlayerIds.length > 0) {
      const playerRows = await db
        .select({
          id: players.id,
          teamId: players.teamId,
        })
        .from(players)
        .where(inArray(players.id, unresolvedPlayerIds));
      for (const row of playerRows) {
        this.playerCurrentTeamCache.set(row.id, row.teamId ?? null);
      }
      for (const id of unresolvedPlayerIds) {
        if (!this.playerCurrentTeamCache.has(id)) this.playerCurrentTeamCache.set(id, null);
      }
    }
  }

  private async hydrateManagerCurrentTeams(managerIds: string[]): Promise<void> {
    const missing = uniqueIds(managerIds).filter((id) => !this.managerCurrentTeamCache.has(id));
    if (missing.length === 0) return;

    const rows = await db
      .select({
        id: managers.id,
        currentTeamId: managers.currentTeamId,
      })
      .from(managers)
      .where(inArray(managers.id, missing));

    for (const row of rows) {
      this.managerCurrentTeamCache.set(row.id, row.currentTeamId ?? null);
    }
    for (const id of missing) {
      if (!this.managerCurrentTeamCache.has(id)) this.managerCurrentTeamCache.set(id, null);
    }
  }

  async filterTeamIds(teamIds: string[]): Promise<Set<string>> {
    const mvpTeamIds = await this.getMvpTeamIds();
    return new Set(uniqueIds(teamIds).filter((id) => mvpTeamIds.has(id)));
  }

  async filterCompetitionIds(competitionIds: string[]): Promise<Set<string>> {
    const mvpCompetitionIds = await this.getMvpCompetitionIds();
    return new Set(uniqueIds(competitionIds).filter((id) => mvpCompetitionIds.has(id)));
  }

  async filterPlayerIds(playerIds: string[]): Promise<Set<string>> {
    const ids = uniqueIds(playerIds);
    if (ids.length === 0) return new Set<string>();
    const mvpTeamIds = await this.getMvpTeamIds();
    await this.hydratePlayerCurrentTeams(ids);
    return new Set(
      ids.filter((id) => {
        const teamId = this.playerCurrentTeamCache.get(id) ?? null;
        return !!teamId && mvpTeamIds.has(teamId);
      }),
    );
  }

  async filterManagerIds(managerIds: string[]): Promise<Set<string>> {
    const ids = uniqueIds(managerIds);
    if (ids.length === 0) return new Set<string>();
    const mvpTeamIds = await this.getMvpTeamIds();
    await this.hydrateManagerCurrentTeams(ids);
    return new Set(
      ids.filter((id) => {
        const teamId = this.managerCurrentTeamCache.get(id) ?? null;
        return !!teamId && mvpTeamIds.has(teamId);
      }),
    );
  }

  async filterRowsById<T extends RowWithId>(
    rows: T[],
    entityType: "team" | "competition" | "player" | "manager",
  ): Promise<T[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const allowedIds =
      entityType === "team"
        ? await this.filterTeamIds(ids)
        : entityType === "competition"
          ? await this.filterCompetitionIds(ids)
          : entityType === "player"
            ? await this.filterPlayerIds(ids)
            : await this.filterManagerIds(ids);
    return rows.filter((row) => allowedIds.has(row.id));
  }

  async getArticleIdSetsByBoundary(articleIds: string[]): Promise<{
    articleTeamIds: Set<string>;
    articlePlayerIds: Set<string>;
    articleManagerIds: Set<string>;
    articleCompetitionIds: Set<string>;
  }> {
    const ids = uniqueIds(articleIds);
    if (ids.length === 0) {
      return {
        articleTeamIds: new Set<string>(),
        articlePlayerIds: new Set<string>(),
        articleManagerIds: new Set<string>(),
        articleCompetitionIds: new Set<string>(),
      };
    }

    const [teamRows, playerRows, managerRows, competitionRows] = await Promise.all([
      db
        .select({ teamId: articleTeams.teamId })
        .from(articleTeams)
        .where(inArray(articleTeams.articleId, ids)),
      db
        .select({ playerId: articlePlayers.playerId })
        .from(articlePlayers)
        .where(inArray(articlePlayers.articleId, ids)),
      db
        .select({ managerId: articleManagers.managerId })
        .from(articleManagers)
        .where(inArray(articleManagers.articleId, ids)),
      db
        .select({ competitionId: articleCompetitions.competitionId })
        .from(articleCompetitions)
        .where(inArray(articleCompetitions.articleId, ids)),
    ]);

    const [allowedTeamIds, allowedPlayerIds, allowedManagerIds, allowedCompetitionIds] =
      await Promise.all([
        this.filterTeamIds(teamRows.map((row) => row.teamId)),
        this.filterPlayerIds(playerRows.map((row) => row.playerId)),
        this.filterManagerIds(managerRows.map((row) => row.managerId)),
        this.filterCompetitionIds(competitionRows.map((row) => row.competitionId)),
      ]);

    return {
      articleTeamIds: allowedTeamIds,
      articlePlayerIds: allowedPlayerIds,
      articleManagerIds: allowedManagerIds,
      articleCompetitionIds: allowedCompetitionIds,
    };
  }
}
