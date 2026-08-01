import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchCentreRefetchIntervalMs,
  normalizeGoalserveMatchStatus,
  preferStoredMatchStatus,
  resolveMatchCentreState,
} from "./match-centre-state";
import {
  mergeGoalserveMatchTimeline,
  type GoalserveMatchTimeline,
} from "./goalserve-match-detail";
import {
  formResultForTeam,
  isEligibleCompletedH2HMatch,
  isEligibleFormMatch,
  isEligibleNextFixture,
  isEligiblePreEventH2HMatch,
  summariseH2HForCurrentFixture,
} from "./match-centre-filters";

describe("resolveMatchCentreState", () => {
  it("maps Cancl. to CANCELLED", () => {
    const s = resolveMatchCentreState({ rawStatus: "Cancl.", storedStatus: "scheduled" });
    assert.equal(s.presentationState, "CANCELLED");
    assert.equal(s.isTerminal, true);
    assert.equal(s.shouldPoll, false);
  });

  it("maps Aban. to ABANDONED", () => {
    const s = resolveMatchCentreState({ rawStatus: "Aban.", storedStatus: "scheduled" });
    assert.equal(s.presentationState, "ABANDONED");
  });

  it("maps numeric minute to LIVE", () => {
    const s = resolveMatchCentreState({ rawStatus: "67", storedStatus: "scheduled" });
    assert.equal(s.presentationState, "LIVE");
    assert.equal(s.isLive, true);
  });

  it("maps HT to LIVE", () => {
    assert.equal(
      resolveMatchCentreState({ rawStatus: "HT", storedStatus: "live" }).presentationState,
      "LIVE",
    );
  });

  it("maps FT / AET / Pen. to COMPLETED", () => {
    assert.equal(
      resolveMatchCentreState({ rawStatus: "FT", storedStatus: "finished" }).presentationState,
      "COMPLETED",
    );
    assert.equal(
      resolveMatchCentreState({ rawStatus: "AET", storedStatus: "finished" }).presentationState,
      "COMPLETED",
    );
    assert.equal(
      resolveMatchCentreState({ rawStatus: "Pen.", storedStatus: "finished" }).presentationState,
      "COMPLETED",
    );
  });

  it("maps Postp. to POSTPONED", () => {
    assert.equal(
      resolveMatchCentreState({ rawStatus: "Postp.", storedStatus: "postponed" }).presentationState,
      "POSTPONED",
    );
  });

  it("does not infer LIVE from kickoff; unknown raw falls back safely", () => {
    const s = resolveMatchCentreState({ rawStatus: "WeirdStatus", storedStatus: "scheduled" });
    assert.equal(s.presentationState, "PRE_EVENT");
  });

  it("uses stored finished when raw missing", () => {
    assert.equal(
      resolveMatchCentreState({ rawStatus: "", storedStatus: "finished" }).presentationState,
      "COMPLETED",
    );
  });

  it("labels suspended as LIVE interruption", () => {
    const s = resolveMatchCentreState({ rawStatus: "Susp.", storedStatus: "live" });
    assert.equal(s.presentationState, "LIVE");
    assert.equal(s.interruptionKind, "suspended");
  });

  it("prefers stored finished over stale live raw", () => {
    const s = resolveMatchCentreState({ rawStatus: "72", storedStatus: "finished" });
    assert.equal(s.presentationState, "COMPLETED");
  });
});

describe("normalizeGoalserveMatchStatus", () => {
  it("stores cancelled and abandoned distinctly", () => {
    assert.equal(normalizeGoalserveMatchStatus("Cancl."), "cancelled");
    assert.equal(normalizeGoalserveMatchStatus("Aban."), "abandoned");
    assert.equal(normalizeGoalserveMatchStatus("Postp."), "postponed");
    assert.equal(normalizeGoalserveMatchStatus("Canc."), "cancelled");
    assert.equal(normalizeGoalserveMatchStatus("Awarded"), "finished");
  });
});

describe("preferStoredMatchStatus", () => {
  it("does not revert finished to live", () => {
    assert.equal(preferStoredMatchStatus("finished", "live"), "finished");
    assert.equal(preferStoredMatchStatus("cancelled", "scheduled"), "cancelled");
    assert.equal(preferStoredMatchStatus("finished", "finished"), "finished");
    assert.equal(preferStoredMatchStatus("live", "finished"), "finished");
  });
});

describe("matchCentreRefetchIntervalMs", () => {
  it("polls live every 15s and stops when terminal", () => {
    assert.equal(matchCentreRefetchIntervalMs({ presentationState: "LIVE" }), 15_000);
    assert.equal(matchCentreRefetchIntervalMs({ presentationState: "COMPLETED" }), false);
  });

  it("polls scheduled near kickoff", () => {
    const now = Date.UTC(2026, 7, 1, 12, 0, 0);
    const kickoff = new Date(now + 10 * 60 * 1000);
    assert.equal(
      matchCentreRefetchIntervalMs({
        presentationState: "PRE_EVENT",
        kickoffTime: kickoff,
        nowMs: now,
      }),
      30_000,
    );
  });
});

describe("mergeGoalserveMatchTimeline", () => {
  it("live payload adds stats", () => {
    const existing: GoalserveMatchTimeline = { status: "20", events: [] };
    const incoming: GoalserveMatchTimeline = {
      status: "45",
      stats: [{ key: "IPosession", label: "Possession", home: 40, away: 60 }],
    };
    const merged = mergeGoalserveMatchTimeline(existing, incoming);
    assert.equal(merged.stats?.[0].home, 40);
    assert.equal(merged.status, "45");
  });

  it("preserves stats when later feed omits them", () => {
    const existing: GoalserveMatchTimeline = {
      status: "65",
      stats: [{ key: "IPosession", label: "Possession", home: 40, away: 60 }],
      events: [{ type: "goal", minute: "12", team: "home", player: "A", eventId: "1" }],
      htScore: "[1-0]",
      referee: "Ref Name",
    };
    const incoming: GoalserveMatchTimeline = {
      status: "FT",
      events: [
        { type: "goal", minute: "12", team: "home", player: "A", eventId: "1" },
        { type: "goal", minute: "80", team: "away", player: "B", eventId: "2" },
      ],
    };
    const merged = mergeGoalserveMatchTimeline(existing, incoming);
    assert.equal(merged.status, "FT");
    assert.equal(merged.stats?.length, 1);
    assert.equal(merged.htScore, "[1-0]");
    assert.equal(merged.referee, "Ref Name");
    assert.equal(merged.events?.length, 2);
  });

  it("updates stats when newer valid stats arrive", () => {
    const existing: GoalserveMatchTimeline = {
      stats: [{ key: "IPosession", label: "Possession", home: 40, away: 60 }],
    };
    const incoming: GoalserveMatchTimeline = {
      stats: [{ key: "IPosession", label: "Possession", home: 55, away: 45 }],
    };
    const merged = mergeGoalserveMatchTimeline(existing, incoming);
    assert.equal(merged.stats?.[0].home, 55);
  });

  it("corrected event updates existing event by id", () => {
    const existing: GoalserveMatchTimeline = {
      events: [{ type: "goal", minute: "12", team: "home", player: "Wrong", eventId: "9" }],
    };
    const incoming: GoalserveMatchTimeline = {
      events: [{ type: "goal", minute: "12", team: "home", player: "Correct", eventId: "9" }],
    };
    const merged = mergeGoalserveMatchTimeline(existing, incoming);
    assert.equal(merged.events?.length, 1);
    assert.equal(merged.events?.[0].player, "Correct");
  });

  it("VAR cancellation drops matching goal", () => {
    const existing: GoalserveMatchTimeline = {
      events: [{ type: "goal", minute: "40", team: "home", player: "A", eventId: "1" }],
    };
    const incoming: GoalserveMatchTimeline = {
      status: "FT",
      events: [
        { type: "goal", minute: "40", team: "home", player: "A", eventId: "1" },
        { type: "var_cancel", minute: "40", team: "home", player: "A", eventId: "2" },
      ],
    };
    const merged = mergeGoalserveMatchTimeline(existing, incoming);
    assert.ok(merged.events?.some((e) => e.type === "var_cancel"));
    assert.ok(!merged.events?.some((e) => e.type === "goal"));
  });

  it("finished status is not reverted by stale live data", () => {
    const existing: GoalserveMatchTimeline = {
      status: "FT",
      events: [{ type: "goal", minute: "10", team: "home", eventId: "1" }],
      stats: [{ key: "ICorner", label: "Corners", home: 3, away: 1 }],
    };
    const incoming: GoalserveMatchTimeline = { status: "80", timer: "80" };
    const merged = mergeGoalserveMatchTimeline(existing, incoming);
    assert.equal(merged.status, "FT");
    assert.ok((merged.stats?.length ?? 0) >= 1);
  });

  it("newer valid HT or score correction is accepted", () => {
    const existing: GoalserveMatchTimeline = {
      htScore: "[0-0]",
      home: { score: 0 },
      away: { score: 0 },
    };
    const incoming: GoalserveMatchTimeline = {
      htScore: "[1-0]",
      home: { score: 2 },
      away: { score: 1 },
    };
    const merged = mergeGoalserveMatchTimeline(existing, incoming);
    assert.equal(merged.htScore, "[1-0]");
    assert.equal(merged.home?.score, 2);
    assert.equal(merged.away?.score, 1);
  });
});

describe("Match Centre context filters", () => {
  const kickoff = "2026-08-21T19:00:00.000Z";

  it("form excludes friendlies and exceptional statuses", () => {
    assert.equal(
      isEligibleFormMatch({
        matchId: "a",
        currentMatchId: "cur",
        status: "finished",
        kickoffTime: "2026-08-10T15:00:00.000Z",
        currentKickoff: kickoff,
        homeScore: 1,
        awayScore: 0,
        goalserveCompetitionId: "1534",
        competitionName: "Club Friendlies",
        includeFriendlies: false,
      }),
      false,
    );
  });

  it("form treats away win as W for the requested team", () => {
    assert.equal(formResultForTeam(0, 2, "away"), "W");
    assert.equal(formResultForTeam(0, 2, "home"), "L");
  });

  it("form excludes current completed match and later matches", () => {
    assert.equal(
      isEligibleFormMatch({
        matchId: "cur",
        currentMatchId: "cur",
        status: "finished",
        kickoffTime: kickoff,
        currentKickoff: kickoff,
        homeScore: 2,
        awayScore: 1,
        goalserveCompetitionId: "1204",
        includeFriendlies: false,
      }),
      false,
    );
    assert.equal(
      isEligibleFormMatch({
        matchId: "later",
        currentMatchId: "cur",
        status: "finished",
        kickoffTime: "2026-08-28T15:00:00.000Z",
        currentKickoff: kickoff,
        homeScore: 1,
        awayScore: 1,
        goalserveCompetitionId: "1204",
        includeFriendlies: false,
      }),
      false,
    );
  });

  it("historical H2H excludes current scheduled fixture", () => {
    assert.equal(
      isEligiblePreEventH2HMatch({
        matchId: "cur",
        currentMatchId: "cur",
        status: "scheduled",
        kickoffTime: kickoff,
        currentKickoff: kickoff,
        homeScore: null,
        awayScore: null,
      }),
      false,
    );
  });

  it("completed H2H includes current result once", () => {
    assert.equal(
      isEligibleCompletedH2HMatch({
        matchId: "cur",
        currentMatchId: "cur",
        status: "finished",
        kickoffTime: kickoff,
        currentKickoff: kickoff,
        homeScore: 2,
        awayScore: 1,
      }),
      true,
    );
  });

  it("H2H summary respects swapped home/away roles", () => {
    const summary = summariseH2HForCurrentFixture({
      centreHomeTeamId: "home-club",
      centreHomeGoalserveId: null,
      meetings: [
        // Current home club played away and won 2-0
        { homeTeamId: "away-club", homeScore: 0, awayScore: 2 },
        // Current home club played home and drew
        { homeTeamId: "home-club", homeScore: 1, awayScore: 1 },
        // Current home club played away and lost
        { homeTeamId: "away-club", homeScore: 3, awayScore: 1 },
      ],
    });
    assert.equal(summary.homeTeamWins, 1);
    assert.equal(summary.draws, 1);
    assert.equal(summary.awayTeamWins, 1);
  });

  it("next fixtures exclude the current match", () => {
    assert.equal(
      isEligibleNextFixture({
        matchId: "cur",
        currentMatchId: "cur",
        status: "scheduled",
        kickoffTime: "2026-08-28T15:00:00.000Z",
        currentKickoff: kickoff,
      }),
      false,
    );
  });
});
