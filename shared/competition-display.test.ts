import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isClubFriendlyCompetition } from "./competition-display";

describe("isClubFriendlyCompetition", () => {
  it("detects Goalserve friendlies id and name", () => {
    assert.equal(
      isClubFriendlyCompetition({ goalserveCompetitionId: "1534", competitionName: "x" }),
      true,
    );
    assert.equal(
      isClubFriendlyCompetition({
        goalserveCompetitionId: "1204",
        competitionName: "Club Friendlies",
      }),
      true,
    );
    assert.equal(
      isClubFriendlyCompetition({
        goalserveCompetitionId: "1204",
        competitionName: "Premier League",
      }),
      false,
    );
  });
});
