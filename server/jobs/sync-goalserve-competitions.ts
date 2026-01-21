import { db } from "../db";
import { competitions } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function syncGoalserveCompetitions(): Promise<{
  ok: boolean;
  upserted: number;
  error?: string;
  sample?: any;
}> {
  try {
    const response = await goalserveFetch("soccernew/league_list");
    
    const normalized: {
      goalserveCompetitionId: string;
      name: string;
      country?: string;
      type?: string;
    }[] = [];

    const leagues = response?.leagues?.league;
    if (!leagues) {
      return {
        ok: false,
        upserted: 0,
        error: "No leagues found in response",
        sample: JSON.stringify(response).slice(0, 300),
      };
    }

    const leagueArray = Array.isArray(leagues) ? leagues : [leagues];
    
    for (const league of leagueArray) {
      if (league?.id && league?.name) {
        normalized.push({
          goalserveCompetitionId: String(league.id),
          name: league.name,
          country: league.country || undefined,
          type: league.type || "league",
        });
      }
    }

    let upserted = 0;
    for (const comp of normalized) {
      const existing = await db
        .select()
        .from(competitions)
        .where(eq(competitions.goalserveCompetitionId, comp.goalserveCompetitionId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(competitions)
          .set({
            name: comp.name,
            country: comp.country,
            type: comp.type,
          })
          .where(eq(competitions.goalserveCompetitionId, comp.goalserveCompetitionId));
      } else {
        await db.insert(competitions).values({
          name: comp.name,
          slug: slugify(comp.name),
          goalserveCompetitionId: comp.goalserveCompetitionId,
          country: comp.country,
          type: comp.type,
        });
      }
      upserted++;
    }

    return { ok: true, upserted };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      upserted: 0,
      error,
      sample: error.slice(0, 300),
    };
  }
}
