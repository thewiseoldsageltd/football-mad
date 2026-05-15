import { eq } from "drizzle-orm";
import { db } from "../db";
import { articleTeams, teams } from "@shared/schema";
import type { Article } from "@shared/schema";

function titleCaseCategory(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Up to 4 short labels for the social card pill row. */
export async function resolveArticleOgPills(article: Article): Promise<string[]> {
  const pills: string[] = [];

  if (article.isBreaking) pills.push("Breaking");

  const competition = article.competition?.trim();
  if (competition) pills.push(competition);

  const teamRows = await db
    .select({ name: teams.name })
    .from(articleTeams)
    .innerJoin(teams, eq(articleTeams.teamId, teams.id))
    .where(eq(articleTeams.articleId, article.id))
    .limit(2);

  for (const row of teamRows) {
    const name = row.name?.trim();
    if (name) pills.push(name);
  }

  const category = article.category?.trim();
  if (category && category.toLowerCase() !== "news") {
    pills.push(titleCaseCategory(category));
  }

  for (const tag of article.tags ?? []) {
    const t = tag?.trim();
    if (t) pills.push(t);
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const pill of pills) {
    const key = pill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(pill.length > 28 ? `${pill.slice(0, 27)}…` : pill);
    if (unique.length >= 4) break;
  }
  return unique;
}
