import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formationRowSizes,
  parseGoalserveLineups,
  placeLineupOnDualPitch,
} from "./goalserve-lineup";

describe("parseGoalserveLineups", () => {
  it("returns null for empty input", () => {
    assert.equal(parseGoalserveLineups(null), null);
    assert.equal(parseGoalserveLineups({}), null);
  });

  it("parses Goalserve teams.localteam / visitorteam shape", () => {
    const raw = {
      teams: {
        localteam: {
          formation: "4-3-3",
          player: [
            { formation_pos: "1", id: "1", name: "Raya", number: "22", pos: "G" },
            { formation_pos: "2", id: "2", name: "White", number: "4", pos: "D" },
            { formation_pos: "3", id: "3", name: "Saliba", number: "2", pos: "D" },
            { formation_pos: "4", id: "4", name: "Gabriel", number: "6", pos: "D" },
            { formation_pos: "5", id: "5", name: "Timber", number: "12", pos: "D" },
            { formation_pos: "6", id: "6", name: "Partey", number: "5", pos: "M" },
            { formation_pos: "7", id: "7", name: "Ødegaard", number: "8", pos: "M" },
            { formation_pos: "8", id: "8", name: "Rice", number: "41", pos: "M" },
            { formation_pos: "9", id: "9", name: "Saka", number: "7", pos: "F" },
            { formation_pos: "10", id: "10", name: "Havertz", number: "29", pos: "F" },
            { formation_pos: "11", id: "11", name: "Martinelli", number: "11", pos: "F" },
            { id: "99", name: "Bench Player", number: "1", pos: "G", isSubst: "True" },
          ],
        },
        visitorteam: {
          "@formation": "4-2-3-1",
          player: [
            { "@formation_pos": "1", "@id": "20", "@name": "Sánchez", "@number": "1", "@pos": "G" },
          ],
        },
      },
    };

    const parsed = parseGoalserveLineups(raw);
    assert.ok(parsed);
    assert.equal(parsed!.kind, "confirmed");
    assert.equal(parsed!.home?.formation, "4-3-3");
    assert.equal(parsed!.home?.starters.length, 11);
    assert.equal(parsed!.home?.substitutes.length, 1);
    assert.equal(parsed!.home?.starters[0].name, "Raya");
    assert.equal(parsed!.away?.formation, "4-2-3-1");
    assert.equal(parsed!.away?.starters[0].name, "Sánchez");
  });

  it("reads from timeline.raw.lineups", () => {
    const timelineLike = {
      raw: {
        lineups: {
          localteam: {
            formation: "4-4-2",
            player: [{ name: "Keeper", number: "1", pos: "G", formation_pos: "1" }],
          },
        },
      },
    };
    const parsed = parseGoalserveLineups(timelineLike);
    assert.ok(parsed?.home);
    assert.equal(parsed!.home!.starters[0].name, "Keeper");
    assert.equal(parsed!.away, null);
  });
});

describe("formationRowSizes", () => {
  it("splits formation strings", () => {
    assert.deepEqual(formationRowSizes("4-3-3"), [4, 3, 3]);
    assert.deepEqual(formationRowSizes("4-2-3-1"), [4, 2, 3, 1]);
  });
});

describe("placeLineupOnDualPitch", () => {
  it("keeps home in left half and away in right half", () => {
    const home = {
      formation: "4-3-3",
      starters: Array.from({ length: 11 }, (_, i) => ({
        id: String(i),
        name: `H${i}`,
        number: String(i),
        position: i === 0 ? "G" : "M",
        formationPos: i + 1,
        isSubstitute: false,
      })),
      substitutes: [],
    };
    const away = {
      formation: "4-3-3",
      starters: Array.from({ length: 11 }, (_, i) => ({
        id: String(i),
        name: `A${i}`,
        number: String(i),
        position: i === 0 ? "G" : "M",
        formationPos: i + 1,
        isSubstitute: false,
      })),
      substitutes: [],
    };
    const homePlaces = placeLineupOnDualPitch(home, "home");
    const awayPlaces = placeLineupOnDualPitch(away, "away");
    assert.equal(homePlaces.length, 11);
    assert.equal(awayPlaces.length, 11);
    assert.ok(homePlaces.every((p) => p.x < 50));
    assert.ok(awayPlaces.every((p) => p.x > 50));
    const homeGk = homePlaces.find((p) => p.player.formationPos === 1)!;
    const awayGk = awayPlaces.find((p) => p.player.formationPos === 1)!;
    assert.ok(homeGk.x < 20);
    assert.ok(awayGk.x > 80);
  });
});
