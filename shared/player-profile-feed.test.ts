import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPlayerHubCareerApi,
  buildPlayerHubHonoursApi,
  buildPlayerHubTransfersApi,
  buildSafePlayerIdentityUpdate,
  parseGoalserveDate,
  parseGoalservePlayerProfile,
  parseHonourSeasons,
} from "./player-profile-feed";

const samplePayload = {
  players: {
    player: {
      "@common_name": "E. Haaland",
      "@id": "441484",
      name: "Erling Haaland",
      firstname: "Erling",
      lastname: "Haaland",
      team: "Manchester City",
      teamid: "9259",
      nationality: "Norway",
      birthdate: "21.07.2000",
      age: "25",
      birthcountry: "England",
      birthplace: "Leeds",
      position: "Attacker",
      height: "194",
      weight: "88",
      preferredFoot: "Left",
      marketValueEUR: "180000000",
      image: "abc",
      statistic: {
        club: [
          {
            "@name": "Manchester City",
            "@id": "9259",
            "@league": "Premier League",
            "@league_id": "1204",
            "@season": "2024/2025",
            "@appearences": "31",
            "@goals": "22",
            "@assists": "3",
            "@minutes": "2730",
          },
        ],
      },
      statistic_cups: { club: [] },
      statistic_cups_intl: { club: [] },
      statistic_intl: { club: [] },
      overall_clubs: {
        stats: {
          "@appearences": "250",
          "@minutesPlayed": "20000",
          "@assists": "40",
        },
      },
      transfers: {
        transfer: [
          {
            "@date": "01.07.2022",
            "@from": "Dortmund",
            "@from_id": "10303",
            "@to": "Manchester City",
            "@to_id": "9259",
            "@type": "Transfer",
            "@price": "EUR 60.0m",
          },
        ],
      },
      sidelined: {
        item: [
          {
            "@type": "Ankle Injury",
            "@date_start": "31.03.2025",
            "@date_end": "01.05.2025",
          },
        ],
      },
      trophies: {
        trophy: [
          {
            "@country": "England",
            "@league": "Premier League",
            "@status": "Winner",
            "@count": "2",
            "@seasons": "2023/2024,2022/2023,",
          },
        ],
      },
    },
  },
};

describe("parseGoalservePlayerProfile", () => {
  it("parses identity, career, transfers, sidelined, honours", () => {
    const parsed = parseGoalservePlayerProfile(samplePayload);
    assert.ok(parsed);
    assert.equal(parsed!.identity.commonName, "E. Haaland");
    assert.equal(parsed!.identity.preferredFoot, "Left");
    assert.equal(parsed!.identity.heightCm, 194);
    assert.equal(parsed!.careerSeasons.length, 1);
    assert.equal(parsed!.careerSeasons[0].category, "domestic_league");
    assert.equal(parsed!.careerSeasons[0].goals, 22);
    assert.equal(parsed!.careerTotals?.appearances, 250);
    assert.equal(parsed!.careerTotals?.minutes, 20000);
    assert.equal(parsed!.transfers.length, 1);
    assert.equal(parsed!.transfers[0].fee, "EUR 60.0m");
    assert.equal(parsed!.sidelined[0].kind, "injury");
    assert.equal(parsed!.honours[0].competition, "Premier League");
  });
});

describe("buildSafePlayerIdentityUpdate", () => {
  it("does not overwrite existing nationality or preferred foot", () => {
    const patch = buildSafePlayerIdentityUpdate(
      {
        nationality: "NOR",
        preferredFoot: "Right",
        heightCm: null,
      },
      parseGoalservePlayerProfile(samplePayload)!.identity,
      new Date("2026-08-03T00:00:00Z"),
    );
    assert.equal(patch.nationality, undefined);
    assert.equal(patch.preferredFoot, undefined);
    assert.equal(patch.heightCm, 194);
    assert.ok(patch.profileSyncedAt);
  });
});

describe("API builders", () => {
  it("sorts transfers newest first and groups honour seasons", () => {
    assert.deepEqual(parseHonourSeasons("2023/2024,2022/2023,"), ["2023/2024", "2022/2023"]);
    const transfers = buildPlayerHubTransfersApi([
      {
        transferDate: parseGoalserveDate("01.07.2019"),
        transferDateRaw: "01.07.2019",
        fromClubName: "A",
        toClubName: "B",
        fee: null,
        transferType: "Transfer",
      },
      {
        transferDate: parseGoalserveDate("01.07.2022"),
        transferDateRaw: "01.07.2022",
        fromClubName: "B",
        toClubName: "C",
        fee: "EUR 1m",
        transferType: "Transfer",
      },
    ]);
    assert.equal(transfers![0].fromClub, "B");
    const career = buildPlayerHubCareerApi({
      totals: { appearances: 10, goals: null, assists: 1, starts: null, substituteAppearances: null, substitutedOff: null, unusedBench: null, minutes: 900, captainAppearances: null, shots: null, shotsOnTarget: null, keyPasses: null, dribbles: null, successfulDribbles: null, penaltiesWon: null, penaltiesScored: null, penaltiesMissed: null, woodworkHits: null, passes: null, passesAccurate: null, crosses: null, accurateCrosses: null, tackles: null, interceptions: null, blocks: null, clearances: null, duels: null, duelsWon: null, foulsWon: null, foulsCommitted: null, dispossessions: null, penaltiesConceded: null, saves: null, goalsConceded: null, penaltiesSaved: null, insideBoxSaves: null, yellowCards: null, secondYellow: null, redCards: null, rating: null },
      seasons: [],
    });
    assert.equal(career!.totals!.appearances, 10);
    const honours = buildPlayerHubHonoursApi([
      {
        competition: "Premier League",
        country: "England",
        status: "Winner",
        count: 1,
        seasonsRaw: "2023/2024,",
      },
    ]);
    assert.deepEqual(honours![0].seasons, ["2023/2024"]);
  });
});
