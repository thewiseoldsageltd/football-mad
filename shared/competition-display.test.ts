import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCompetitionHeroLabel,
  getCompetitionRegionById,
  getPublicCompetitionDisplayName,
  isClubFriendlyCompetition,
} from "./competition-display";

describe("isClubFriendlyCompetition", () => {
  it("detects Goalserve friendlies id and name", () => {
    assert.equal(isClubFriendlyCompetition({ goalserveCompetitionId: "1534" }), true);
    assert.equal(isClubFriendlyCompetition({ competitionName: "Club Friendlies" }), true);
    assert.equal(isClubFriendlyCompetition({ goalserveCompetitionId: "1204" }), false);
  });
});

describe("getPublicCompetitionDisplayName", () => {
  it("aliases Scottish Premiership id to Premiership", () => {
    assert.equal(getPublicCompetitionDisplayName("Scottish Premiership", "1370"), "Premiership");
  });
});

describe("formatCompetitionHeroLabel", () => {
  it("formats Scotland · Premiership", () => {
    assert.equal(formatCompetitionHeroLabel("Premiership", "1370"), "Scotland · Premiership");
  });

  it("formats England · Premier League", () => {
    assert.equal(formatCompetitionHeroLabel("Premier League", "1204"), "England · Premier League");
  });

  it("formats Europe · Champions League without UEFA duplication", () => {
    assert.equal(
      formatCompetitionHeroLabel("UEFA Champions League", "1005"),
      "Europe · Champions League",
    );
  });

  it("falls back to competition name alone when region unknown", () => {
    assert.equal(formatCompetitionHeroLabel("Some Cup", "99999"), "Some Cup");
  });
});

describe("getCompetitionRegionById", () => {
  it("returns Scotland for Premiership", () => {
    assert.equal(getCompetitionRegionById("1370"), "Scotland");
  });
});
