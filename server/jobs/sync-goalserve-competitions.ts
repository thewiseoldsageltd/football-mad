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

interface NormalizedCompetition {
  goalserveCompetitionId: string;
  name: string;
  country?: string;
  type?: string;
}

function extractLeagues(obj: any, results: NormalizedCompetition[], visited = new WeakSet()): void {
  if (!obj || typeof obj !== "object") return;
  if (visited.has(obj)) return;
  visited.add(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractLeagues(item, results, visited);
    }
    return;
  }

  const id = obj.id ?? obj.league_id ?? obj.competition_id;
  const name = obj.name ?? obj.league_name ?? obj.competition_name;

  if (id && name && typeof name === "string") {
    results.push({
      goalserveCompetitionId: String(id),
      name: name,
      country: obj.country ?? obj.country_name ?? undefined,
      type: obj.type ?? "league",
    });
  }

  for (const key of Object.keys(obj)) {
    extractLeagues(obj[key], results, visited);
  }
}

export async function syncGoalserveCompetitions(): Promise<{
  ok: boolean;
  upserted: number;
  error?: string;
  sample?: any;
}> {
  try {
    const response = await goalserveFetch("soccerfixtures/data/mapping");
    
    const normalized: NormalizedCompetition[] = [];
    extractLeagues(response, normalized);

    const seen = new Set<string>();
    const deduped = normalized.filter((c) => {
      if (seen.has(c.goalserveCompetitionId)) return false;
      seen.add(c.goalserveCompetitionId);
      return true;
    });

    if (deduped.length === 0) {
      return {
        ok: false,
        upserted: 0,
        error: "No leagues found in response",
        sample: JSON.stringify(Object.keys(response || {})).slice(0, 300),
      };
    }

    let upserted = 0;
    for (const comp of deduped) {
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
