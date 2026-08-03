import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePassAccuracy,
  parseGoalserveSquadPlayerStats,
  selectBestCurrentSeasonStatsRow,
  toCurrentSeasonStatsApi,
} from "./player-season-stats";
import { buildThisSeasonStatCards } from "./player-hub-season-ui";

describe("parseGoalserveSquadPlayerStats", () => {
  it("maps Goalserve typos and treats empty strings as null", () => {
    const parsed = parseGoalserveSquadPlayerStats({
      "@appearences": "14",
      "@lineups": "14",
      "@substitute_in": "0",
      "@substitute_out": "",
      "@minutes": "1290",
      "@goals": "",
      "@assists": "0",
      "@isCaptain": "7",
      "@pAccuracy": "283",
      "@passes": "434",
      "@dispossesed": "11",
      "@fouldDrawn": "10",
      "@woordworks": "",
      "@rating": "7.364285",
      "@saves": "36",
      "@goalsConceded": "5",
    });
    assert.equal(parsed.appearances, 14);
    assert.equal(parsed.starts, 14);
    assert.equal(parsed.substituteAppearances, 0);
    assert.equal(parsed.substitutedOff, null);
    assert.equal(parsed.goals, null);
    assert.equal(parsed.assists, 0);
    assert.equal(parsed.captainAppearances, 7);
    assert.equal(parsed.passesAccurate, 283);
    assert.equal(parsed.dispossessions, 11);
    assert.equal(parsed.foulsWon, 10);
    assert.equal(parsed.woodworkHits, null);
    assert.equal(parsed.saves, 36);
    assert.ok(parsed.rating != null && Math.abs(parsed.rating - 7.364285) < 1e-6);
  });
});

describe("toCurrentSeasonStatsApi", () => {
  it("omits nulls and computes passAccuracy percentage", () => {
    const api = toCurrentSeasonStatsApi({
      season: "2025/2026",
      appearances: 11,
      goals: 3,
      assists: 2,
      passes: 207,
      passesAccurate: 171,
      rating: 7.054545,
      shots: null,
    });
    assert.ok(api);
    assert.equal(api!.appearances, 11);
    assert.equal(api!.passAccuracy, 83);
    assert.equal(api!.rating, 7.05);
    assert.equal("shots" in api!, false);
  });

  it("returns null when no numeric stats", () => {
    assert.equal(toCurrentSeasonStatsApi({ season: "2025/2026" }), null);
  });
});

describe("computePassAccuracy", () => {
  it("handles edge cases", () => {
    assert.equal(computePassAccuracy(null, 10), null);
    assert.equal(computePassAccuracy(0, 0), null);
    assert.equal(computePassAccuracy(100, 50), 50);
  });
});

describe("selectBestCurrentSeasonStatsRow", () => {
  it("prefers current club and priority competition", () => {
    const best = selectBestCurrentSeasonStatsRow(
      [
        {
          teamId: "other",
          competitionId: "c1",
          goalserveCompetitionId: "1229",
          season: "2025/2026",
          appearances: 20,
          starts: null,
          substituteAppearances: null,
          substitutedOff: null,
          unusedBench: null,
          minutes: null,
          captainAppearances: null,
          goals: null,
          assists: null,
          shots: null,
          shotsOnTarget: null,
          keyPasses: null,
          dribbles: null,
          successfulDribbles: null,
          penaltiesWon: null,
          penaltiesScored: null,
          penaltiesMissed: null,
          woodworkHits: null,
          passes: null,
          passesAccurate: null,
          crosses: null,
          accurateCrosses: null,
          tackles: null,
          interceptions: null,
          blocks: null,
          clearances: null,
          duels: null,
          duelsWon: null,
          foulsWon: null,
          foulsCommitted: null,
          dispossessions: null,
          penaltiesConceded: null,
          saves: null,
          goalsConceded: null,
          penaltiesSaved: null,
          insideBoxSaves: null,
          yellowCards: null,
          secondYellow: null,
          redCards: null,
          rating: null,
          updatedAt: new Date("2026-01-01"),
          isPriority: false,
        },
        {
          teamId: "arsenal",
          competitionId: "c2",
          goalserveCompetitionId: "1204",
          season: "2025/2026",
          appearances: 11,
          starts: null,
          substituteAppearances: null,
          substitutedOff: null,
          unusedBench: null,
          minutes: null,
          captainAppearances: null,
          goals: null,
          assists: null,
          shots: null,
          shotsOnTarget: null,
          keyPasses: null,
          dribbles: null,
          successfulDribbles: null,
          penaltiesWon: null,
          penaltiesScored: null,
          penaltiesMissed: null,
          woodworkHits: null,
          passes: null,
          passesAccurate: null,
          crosses: null,
          accurateCrosses: null,
          tackles: null,
          interceptions: null,
          blocks: null,
          clearances: null,
          duels: null,
          duelsWon: null,
          foulsWon: null,
          foulsCommitted: null,
          dispossessions: null,
          penaltiesConceded: null,
          saves: null,
          goalsConceded: null,
          penaltiesSaved: null,
          insideBoxSaves: null,
          yellowCards: null,
          secondYellow: null,
          redCards: null,
          rating: null,
          updatedAt: new Date("2026-02-01"),
          isPriority: true,
        },
      ],
      { currentTeamId: "arsenal", currentSeasonKeys: new Set(["2025/2026"]) },
    );
    assert.equal(best?.goalserveCompetitionId, "1204");
    assert.equal(best?.appearances, 11);
  });
});

describe("buildThisSeasonStatCards", () => {
  it("hides when empty and shows GK-specific metrics", () => {
    assert.deepEqual(buildThisSeasonStatCards(null), []);
    const cards = buildThisSeasonStatCards(
      { appearances: 14, minutes: 1290, saves: 36, goalsConceded: 5, rating: 7.36 },
      "G",
    );
    const keys = cards.map((c) => c.key);
    assert.ok(keys.includes("saves"));
    assert.ok(keys.includes("goalsConceded"));
    assert.ok(!keys.includes("shots"));
  });

  it("shows outfield attacking/defensive metrics", () => {
    const cards = buildThisSeasonStatCards(
      { appearances: 11, goals: 3, assists: 2, shots: 18, tackles: 7, yellowCards: 1, redCards: 0 },
      "A",
    );
    const keys = cards.map((c) => c.key);
    assert.ok(keys.includes("goals"));
    assert.ok(keys.includes("shots"));
    assert.ok(keys.includes("cards"));
    assert.ok(!keys.includes("saves"));
    assert.ok(!keys.includes("tackles")); // attacker's secondary set skips tackles
  });
});
