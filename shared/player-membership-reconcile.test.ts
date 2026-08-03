import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyMultiCurrentMembershipRepair,
  extractGoalservePlayerProfileTeamId,
  isAuthoritativeSquadSnapshot,
  MIN_AUTHORITATIVE_SQUAD_SIZE,
  selectMembershipsToClose,
} from "./player-membership-reconcile";

const openTwo = [
  { id: "m-old", teamId: "arsenal", startDate: "2025-01-01T00:00:00.000Z" },
  { id: "m-new", teamId: "chelsea", startDate: "2026-01-01T00:00:00.000Z" },
];

describe("player membership reconcile helpers", () => {
  it("closes absent members and preserves present ones", () => {
    const toClose = selectMembershipsToClose({
      teamId: "arsenal",
      presentPlayerIds: ["p1", "p2"],
      openMembershipsForTeam: [
        { id: "m1", playerId: "p1", teamId: "arsenal" },
        { id: "m2", playerId: "p2", teamId: "arsenal" },
        { id: "m3", playerId: "p3", teamId: "arsenal" },
      ],
    });
    assert.deepEqual(
      toClose.map((m) => m.id),
      ["m3"],
    );
  });

  it("ignores empty, partial, or below-minimum squad feeds", () => {
    assert.equal(isAuthoritativeSquadSnapshot(0), false);
    assert.equal(isAuthoritativeSquadSnapshot(11), false);
    assert.equal(isAuthoritativeSquadSnapshot(MIN_AUTHORITATIVE_SQUAD_SIZE - 1), false);
    assert.equal(isAuthoritativeSquadSnapshot(MIN_AUTHORITATIVE_SQUAD_SIZE), true);
    assert.equal(isAuthoritativeSquadSnapshot(25), true);
    const toClose = selectMembershipsToClose({
      teamId: "arsenal",
      presentPlayerIds: [],
      openMembershipsForTeam: [{ id: "m1", playerId: "p1", teamId: "arsenal" }],
    });
    assert.equal(toClose.length, 0);
  });

  it("does not treat players.team_id alone as writable", () => {
    const decision = classifyMultiCurrentMembershipRepair({
      playerTeamId: "chelsea",
      openMemberships: openTwo,
    });
    assert.equal(decision.classification, "INSUFFICIENT_EVIDENCE");
    assert.equal(decision.writable, false);
    assert.equal(decision.action, "leave");
    assert.equal(decision.closeMembershipIds.length, 0);
    assert.equal(decision.reason, "player_team_id_only_not_sufficient");
  });

  it("marks squad-only evidence as SAFE_CURRENT_SQUAD when others are absent", () => {
    const decision = classifyMultiCurrentMembershipRepair({
      playerTeamId: "arsenal", // stale — must not win alone
      openMemberships: openTwo,
      squadPresenceByTeamId: { chelsea: true, arsenal: false },
    });
    assert.equal(decision.classification, "SAFE_CURRENT_SQUAD");
    assert.equal(decision.writable, true);
    assert.equal(decision.keepTeamId, "chelsea");
    assert.deepEqual(decision.closeMembershipIds, ["m-old"]);
  });

  it("marks profile-only evidence as SAFE_PLAYER_PROFILE", () => {
    const decision = classifyMultiCurrentMembershipRepair({
      playerTeamId: null,
      openMemberships: openTwo,
      profileTeamId: "chelsea",
    });
    assert.equal(decision.classification, "SAFE_PLAYER_PROFILE");
    assert.equal(decision.writable, true);
    assert.equal(decision.keepTeamId, "chelsea");
  });

  it("marks agreeing signals as SAFE_BOTH_SIGNALS", () => {
    const decision = classifyMultiCurrentMembershipRepair({
      playerTeamId: "chelsea",
      openMemberships: openTwo,
      profileTeamId: "chelsea",
      squadPresenceByTeamId: { chelsea: true, arsenal: false },
    });
    assert.equal(decision.classification, "SAFE_BOTH_SIGNALS");
    assert.equal(decision.writable, true);
    assert.equal(decision.keepTeamId, "chelsea");
  });

  it("leaves conflicting signals untouched", () => {
    const decision = classifyMultiCurrentMembershipRepair({
      playerTeamId: "chelsea",
      openMemberships: openTwo,
      profileTeamId: "chelsea",
      squadPresenceByTeamId: { chelsea: false, arsenal: true },
    });
    assert.equal(decision.classification, "CONFLICT");
    assert.equal(decision.writable, false);
    assert.equal(decision.closeMembershipIds.length, 0);
  });

  it("leaves insufficient evidence untouched", () => {
    const decision = classifyMultiCurrentMembershipRepair({
      playerTeamId: null,
      openMemberships: openTwo,
      squadPresenceByTeamId: { chelsea: true }, // other team unknown
    });
    assert.equal(decision.classification, "INSUFFICIENT_EVIDENCE");
    assert.equal(decision.writable, false);
  });

  it("extracts Goalserve profile teamid without inventing data", () => {
    assert.equal(
      extractGoalservePlayerProfileTeamId({
        players: { player: { teamid: "15122", team: "Stirling" } },
      }),
      "15122",
    );
    assert.equal(extractGoalservePlayerProfileTeamId({}), null);
  });
});
