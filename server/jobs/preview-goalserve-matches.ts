import { goalserveFetch } from "../integrations/goalserve/client";

interface MatchSample {
  id: string;
  staticId: string;
  formattedDate: string;
  timeOrStatus: string;
  home: { id: string; name: string; score: string };
  away: { id: string; name: string; score: string };
}

export async function previewGoalserveMatches(feed: string): Promise<{
  ok: boolean;
  feed: string;
  categoriesCount?: number;
  matchesCount?: number;
  sample?: MatchSample[];
  topLevelKeys?: string[];
  responseSample?: string;
  error?: string;
}> {
  try {
    const response = await goalserveFetch(feed);

    if (!response?.scores?.category) {
      return {
        ok: false,
        feed,
        topLevelKeys: response ? Object.keys(response) : [],
        responseSample: JSON.stringify(response).slice(0, 500),
        error: "Missing scores.category in response",
      };
    }

    const categoryData = response.scores.category;
    const categories = Array.isArray(categoryData) ? categoryData : [categoryData];

    const allMatches: MatchSample[] = [];

    for (const category of categories) {
      if (!category?.matches?.match) continue;

      const matchData = category.matches.match;
      const matches = Array.isArray(matchData) ? matchData : [matchData];

      for (const match of matches) {
        const id = String(match["@id"] ?? match.id ?? "");
        const staticId = String(match["@static_id"] ?? match.static_id ?? "");
        const formattedDate = String(match["@formatted_date"] ?? match.formatted_date ?? "");
        const timeOrStatus = String(match["@time"] ?? match.time ?? match["@status"] ?? match.status ?? "");

        const localTeam = match.localteam || match.home || {};
        const visitorTeam = match.visitorteam || match.away || {};

        allMatches.push({
          id,
          staticId,
          formattedDate,
          timeOrStatus,
          home: {
            id: String(localTeam["@id"] ?? localTeam.id ?? ""),
            name: String(localTeam["@name"] ?? localTeam.name ?? ""),
            score: String(localTeam["@score"] ?? localTeam.score ?? ""),
          },
          away: {
            id: String(visitorTeam["@id"] ?? visitorTeam.id ?? ""),
            name: String(visitorTeam["@name"] ?? visitorTeam.name ?? ""),
            score: String(visitorTeam["@score"] ?? visitorTeam.score ?? ""),
          },
        });
      }
    }

    return {
      ok: true,
      feed,
      categoriesCount: categories.length,
      matchesCount: allMatches.length,
      sample: allMatches.slice(0, 10),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      feed,
      error,
    };
  }
}
