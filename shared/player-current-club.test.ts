import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPlayerPositionLabel,
  parseShirtNumber,
  playerPositionGroupRank,
  resolvePlayerCurrentClub,
  selectPlayerHubTeammates,
} from "./player-current-club";
import {
  buildPlayerProfileDescription,
  buildPlayerProfileTitle,
  isPlayerProfileIndexable,
} from "./player-hub-seo";

describe("resolvePlayerCurrentClub", () => {
  const now = new Date("2026-08-03T12:00:00.000Z");

  it("uses a single active membership", () => {
    const r = resolvePlayerCurrentClub({
      playerTeamId: "old-team",
      now,
      memberships: [
        {
          id: "m1",
          teamId: "arsenal",
          endDate: null,
          startDate: "2026-07-01T00:00:00.000Z",
          shirtNumber: "1",
          position: "G",
        },
      ],
    });
    assert.equal(r.teamId, "arsenal");
    assert.equal(r.source, "active_membership");
    assert.equal(r.ambiguous, false);
    assert.equal(r.shirtNumber, "1");
    assert.equal(r.position, "G");
  });

  it("ignores stale players.team_id when an active membership exists", () => {
    const r = resolvePlayerCurrentClub({
      playerTeamId: "brentford",
      now,
      memberships: [
        {
          id: "m1",
          teamId: "arsenal",
          endDate: null,
          lastSeenAt: "2026-08-01T00:00:00.000Z",
          shirtNumber: "22",
        },
      ],
    });
    assert.equal(r.teamId, "arsenal");
    assert.equal(r.source, "active_membership");
  });

  it("marks multiple distinct active clubs as ambiguous", () => {
    const r = resolvePlayerCurrentClub({
      playerTeamId: "arsenal",
      now,
      memberships: [
        { id: "m1", teamId: "arsenal", endDate: null, startDate: "2026-01-01T00:00:00.000Z" },
        { id: "m2", teamId: "chelsea", endDate: null, startDate: "2026-06-01T00:00:00.000Z" },
      ],
    });
    assert.equal(r.teamId, null);
    assert.equal(r.source, "none");
    assert.equal(r.ambiguous, true);
  });

  it("falls back to players.team_id when no active membership", () => {
    const r = resolvePlayerCurrentClub({
      playerTeamId: "chelsea",
      now,
      memberships: [
        {
          id: "m1",
          teamId: "arsenal",
          endDate: "2025-01-01T00:00:00.000Z",
        },
      ],
    });
    assert.equal(r.teamId, "chelsea");
    assert.equal(r.source, "player_team_id");
    assert.equal(r.ambiguous, false);
    assert.equal(r.shirtNumber, null);
  });

  it("returns none when empty", () => {
    const r = resolvePlayerCurrentClub({
      playerTeamId: null,
      now,
      memberships: [],
    });
    assert.equal(r.teamId, null);
    assert.equal(r.source, "none");
    assert.equal(r.ambiguous, false);
  });

  it("picks the most recently seen membership when duplicates share a team", () => {
    const r = resolvePlayerCurrentClub({
      playerTeamId: null,
      now,
      memberships: [
        {
          id: "old",
          teamId: "arsenal",
          endDate: null,
          lastSeenAt: "2026-01-01T00:00:00.000Z",
          shirtNumber: "22",
        },
        {
          id: "new",
          teamId: "arsenal",
          endDate: null,
          lastSeenAt: "2026-08-01T00:00:00.000Z",
          shirtNumber: "1",
        },
      ],
    });
    assert.equal(r.membershipId, "new");
    assert.equal(r.shirtNumber, "1");
  });
});

describe("player hub helpers", () => {
  it("formats position labels and shirt numbers", () => {
    assert.equal(formatPlayerPositionLabel("G"), "Goalkeeper");
    assert.equal(parseShirtNumber("1"), 1);
    assert.equal(parseShirtNumber(0), null);
    assert.equal(parseShirtNumber(""), null);
    assert.equal(playerPositionGroupRank("G"), 0);
  });

  it("builds titles and descriptions without missing separators", () => {
    assert.equal(
      buildPlayerProfileTitle({ name: "David Raya", clubName: "Arsenal", position: "G" }),
      "David Raya — Arsenal goalkeeper | Football Mad",
    );
    assert.equal(
      buildPlayerProfileDescription({
        name: "Cole Palmer",
        clubName: "Chelsea",
        position: "M",
        age: 24,
      }),
      "Cole Palmer: Chelsea · Midfielder · age 24. News and profile on Football Mad.",
    );
  });

  it("selects teammates with deterministic ordering", () => {
    const teammates = selectPlayerHubTeammates({
      currentPlayerId: "raya",
      currentPlayerPosition: "G",
      limit: 4,
      minSquadOthers: 3,
      squad: [
        { id: "raya", slug: "david-raya", name: "David Raya", position: "G", shirtNumber: 1 },
        { id: "saka", slug: "bukayo-saka", name: "Bukayo Saka", position: "A", shirtNumber: 7 },
        { id: "ramsdale", slug: "aaron-ramsdale", name: "Aaron Ramsdale", position: "G", shirtNumber: 13 },
        { id: "odegaard", slug: "martin-odegaard", name: "Martin Odegaard", position: "M", shirtNumber: 8 },
        { id: "saliba", slug: "william-saliba", name: "William Saliba", position: "D", shirtNumber: 2 },
      ],
    });
    assert.equal(teammates.length, 4);
    assert.equal(teammates[0]!.id, "ramsdale");
    assert.ok(!teammates.some((t) => t.id === "raya"));
  });

  it("hides teammates when squad is sparse", () => {
    const teammates = selectPlayerHubTeammates({
      currentPlayerId: "p1",
      squad: [
        { id: "p1", slug: "a", name: "A" },
        { id: "p2", slug: "b", name: "B" },
      ],
    });
    assert.equal(teammates.length, 0);
  });

  it("applies indexability threshold", () => {
    assert.equal(
      isPlayerProfileIndexable({
        id: "p1",
        name: "David Raya",
        slug: "david-raya",
        goalservePlayerId: "330279",
        currentClubReliable: true,
        hasImage: true,
        nationality: "Spain",
        age: 30,
      }),
      true,
    );
    assert.equal(
      isPlayerProfileIndexable({
        id: "p2",
        name: "Thin Player",
        slug: "thin-player",
        goalservePlayerId: "1",
        currentClubReliable: false,
        hasImage: true,
      }),
      false,
    );
    assert.equal(
      isPlayerProfileIndexable({
        id: "p3",
        name: "Orphan",
        slug: "orphan",
        goalservePlayerId: "2",
        currentClubReliable: true,
      }),
      false,
    );
  });
});
