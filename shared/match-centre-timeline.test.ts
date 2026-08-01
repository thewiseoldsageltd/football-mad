import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTimelineMinute,
  resolveTimelineEventSide,
  timelineEventKind,
  timelineEventTitle,
  type TimelineEventOwnership,
} from "./match-centre-timeline";

const home = {
  id: "home-uuid",
  goalserveTeamId: "15072",
  name: "Falkirk",
  shortName: "FAL",
  slug: "falkirk",
};
const away = {
  id: "away-uuid",
  goalserveTeamId: "15120",
  name: "St. Mirren",
  shortName: "STM",
  slug: "st-mirren",
};

function ev(partial: Partial<TimelineEventOwnership>): TimelineEventOwnership {
  return {
    type: "goal",
    minute: "11",
    team: "neutral",
    ...partial,
  };
}

describe("resolveTimelineEventSide", () => {
  it("maps structured home goal to HOME", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "home", type: "goal", player: "A. Doherty" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "HOME",
    );
  });

  it("maps structured away goal to AWAY", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "away", type: "goal", player: "K. Phillips" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "AWAY",
    );
  });

  it("maps home substitution to HOME", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "home", type: "subst", player: "A. Doherty", assist: "J. Gardner" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "HOME",
    );
  });

  it("maps away card to AWAY", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "away", type: "yellowcard", player: "R. Carr" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "AWAY",
    );
  });

  it("keeps VAR on the structured side (Falkirk/home)", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({
          team: "home",
          type: "var",
          player: "B. Parkinson",
          assist: "Goal Disallowed - handball",
          minute: "70",
        }),
        homeTeam: home,
        awayTeam: away,
      }),
      "HOME",
    );
  });

  it("matches abbreviated/punctuation names only as fallback", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "neutral", teamName: "St Mirren" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "AWAY",
    );
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "neutral", teamName: "Falkirk FC" }),
        homeTeam: home,
        awayTeam: { ...away, name: "Something Else", slug: "other", shortName: "OTH" },
      }),
      "HOME",
    );
  });

  it("matches Goalserve team IDs", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "neutral", teamId: "15120" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "AWAY",
    );
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "neutral", teamId: "home-uuid" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "HOME",
    );
  });

  it("returns NEUTRAL when team identity is missing", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "neutral", type: "goal", player: "Someone" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "NEUTRAL",
    );
  });

  it("returns NEUTRAL for system/period events", () => {
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "home", type: "ht" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "NEUTRAL",
    );
    assert.equal(
      resolveTimelineEventSide({
        event: ev({ team: "away", type: "full-time" }),
        homeTeam: home,
        awayTeam: away,
      }),
      "NEUTRAL",
    );
  });
});

describe("formatTimelineMinute", () => {
  it("renders stoppage time", () => {
    assert.equal(formatTimelineMinute({ minute: "90", extraMin: "1" }), "90+1'");
    assert.equal(formatTimelineMinute({ minute: "11" }), "11'");
  });
});

describe("timelineEvent presentation", () => {
  it("labels VAR disallow distinctly from a goal", () => {
    const event = ev({
      type: "var",
      assist: "Goal Disallowed - handball",
      team: "home",
    });
    assert.equal(timelineEventKind(event), "disallowed");
    assert.equal(timelineEventTitle(event), "Goal disallowed");
  });
});
