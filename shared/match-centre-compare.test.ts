import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareFormLabel,
  compareH2HSupport,
  compareLeagueLabel,
  howTheyCompareHeading,
  upcomingFixturesHeading,
} from "./match-centre-compare";
import {
  isEligibleCompletedH2HMatch,
  isEligibleFormMatch,
  isEligiblePreEventH2HMatch,
} from "./match-centre-filters";

describe("match-centre compare labels", () => {
  it("uses How they compared only when completed", () => {
    assert.equal(howTheyCompareHeading(false), "How they compare");
    assert.equal(howTheyCompareHeading(true), "How they compared");
  });

  it("labels completed form as before kick-off", () => {
    assert.equal(compareFormLabel(false), "Form");
    assert.equal(compareFormLabel(true), "Form before kick-off");
  });

  it("labels league as current snapshot wording when completed", () => {
    assert.equal(compareLeagueLabel(false), "League position");
    assert.equal(compareLeagueLabel(true), "Current league position");
    assert.equal(compareLeagueLabel(true).toLowerCase().includes("before"), false);
    assert.equal(compareLeagueLabel(true).toLowerCase().includes("pre-match"), false);
  });

  it("adds Including this match only for completed H2H", () => {
    assert.equal(compareH2HSupport(false), null);
    assert.equal(compareH2HSupport(true), "Including this match");
  });

  it("uses Upcoming fixtures for completed and pre-event", () => {
    assert.equal(upcomingFixturesHeading(), "Upcoming fixtures");
  });
});

describe("completed vs pre-event filter semantics", () => {
  const kickoff = "2026-08-02T13:00:00.000Z";

  it("completed form excludes the current match", () => {
    assert.equal(
      isEligibleFormMatch({
        matchId: "sjp-kil-2026-08-02",
        currentMatchId: "sjp-kil-2026-08-02",
        status: "finished",
        kickoffTime: kickoff,
        currentKickoff: kickoff,
        homeScore: 4,
        awayScore: 3,
        goalserveCompetitionId: "1370",
        includeFriendlies: false,
      }),
      false,
    );
  });

  it("completed H2H includes the current match exactly once (eligible)", () => {
    assert.equal(
      isEligibleCompletedH2HMatch({
        matchId: "sjp-kil-2026-08-02",
        currentMatchId: "sjp-kil-2026-08-02",
        status: "finished",
        kickoffTime: kickoff,
        currentKickoff: kickoff,
        homeScore: 4,
        awayScore: 3,
      }),
      true,
    );
  });

  it("PRE_EVENT H2H excludes the current fixture", () => {
    assert.equal(
      isEligiblePreEventH2HMatch({
        matchId: "sjp-kil-2026-08-02",
        currentMatchId: "sjp-kil-2026-08-02",
        status: "scheduled",
        kickoffTime: kickoff,
        currentKickoff: kickoff,
        homeScore: null,
        awayScore: null,
      }),
      false,
    );
    assert.equal(
      isEligiblePreEventH2HMatch({
        matchId: "sjp-kil-2026-08-02",
        currentMatchId: "sjp-kil-2026-08-02",
        status: "finished",
        kickoffTime: kickoff,
        currentKickoff: kickoff,
        homeScore: 4,
        awayScore: 3,
      }),
      false,
    );
  });
});
