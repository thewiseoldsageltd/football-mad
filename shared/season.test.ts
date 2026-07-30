import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  areSeasonKeysEquivalent,
  buildCompetitionSeasonList,
  calendarFootballSeasonKey,
  calendarFootballSeasonKeyLocal,
  comparePreseasonStandingsRows,
  isPreseasonMonthForSeason,
  isSeasonKeyBefore,
  isUnplayedStandingsTable,
  normalizeSeasonKey,
  resolveCurrentSeasonKey,
  seasonKeyToUiLabel,
  seasonKeyToUrlSlug,
  seasonSlugToCanonical,
} from "./season";

describe("season utilities", () => {
  it("provider season 2026/2027 resolves to UI label 2026/27", () => {
    assert.equal(seasonKeyToUiLabel("2026/2027"), "2026/27");
    assert.equal(seasonKeyToUiLabel("2026-2027"), "2026/27");
    assert.equal(seasonKeyToUrlSlug("2026/2027"), "2026-27");
  });

  it("normalizes equivalent formats to YYYY/YYYY", () => {
    assert.equal(normalizeSeasonKey("2026/27"), "2026/2027");
    assert.equal(normalizeSeasonKey("2026-27"), "2026/2027");
    assert.equal(normalizeSeasonKey("2026/2027"), "2026/2027");
    assert.equal(normalizeSeasonKey("2025-2026"), "2025/2026");
    assert.ok(areSeasonKeysEquivalent("2026/27", "2026-2027"));
  });

  it("slug round-trips to canonical", () => {
    assert.equal(seasonSlugToCanonical("2026-27"), "2026/2027");
    assert.equal(seasonSlugToCanonical("2025-26"), "2025/2026");
  });

  it("defaults current season to provider when present", () => {
    const current = resolveCurrentSeasonKey({
      providerSeason: "2026/2027",
      storedCompetitionSeason: "2025/2026",
      standingsSeasons: ["2025/2026", "2024/2025"],
      now: new Date("2026-07-27T12:00:00Z"),
    });
    assert.equal(current, "2026/2027");
    assert.equal(seasonKeyToUiLabel(current), "2026/27");
  });

  it("keeps trusted provider current despite newer stored match/standings evidence", () => {
    const current = resolveCurrentSeasonKey({
      providerSeason: "2026/2027",
      storedCompetitionSeason: "2026/2027",
      standingsSeasons: ["2027/2028", "2026/2027"],
      matchSeasons: ["2027/2028"],
      now: new Date("2026-07-27T12:00:00Z"),
    });
    assert.equal(current, "2026/2027");
    const list = buildCompetitionSeasonList({
      standingsSeasons: ["2027/2028", "2026/2027"],
      matchSeasons: ["2027/2028"],
      currentSeason: current,
    });
    assert.equal(list[0], "2027/2028");
    assert.ok(list.includes("2026/2027"));
  });

  it("prefers marked current over newer stored competition season", () => {
    const current = resolveCurrentSeasonKey({
      markedCurrentSeason: "2026/2027",
      storedCompetitionSeason: "2027/2028",
      standingsSeasons: ["2027/2028"],
      now: new Date("2027-08-01T12:00:00Z"),
    });
    assert.equal(current, "2026/2027");
  });

  it("includes new current season before standings rows exist", () => {
    const current = resolveCurrentSeasonKey({
      providerSeason: "2026/2027",
      storedCompetitionSeason: "2026/2027",
      standingsSeasons: ["2025/2026", "2024/2025"],
    });
    const list = buildCompetitionSeasonList({
      standingsSeasons: ["2025/2026", "2024/2025"],
      currentSeason: current,
    });
    assert.equal(list[0], "2026/2027");
    assert.ok(list.includes("2025/2026"));
  });

  it("uses August-to-July calendar only as fallback when no trusted marker exists", () => {
    const july = resolveCurrentSeasonKey({
      now: new Date("2026-07-15T12:00:00Z"),
    });
    assert.equal(july, "2025/2026");

    const august = resolveCurrentSeasonKey({
      now: new Date("2026-08-15T12:00:00Z"),
    });
    assert.equal(august, "2026/2027");

    // Newer standings/match alone must not become current or skip calendar.
    const withOrphanFuture = resolveCurrentSeasonKey({
      standingsSeasons: ["2027/2028"],
      matchSeasons: ["2027/2028"],
      now: new Date("2026-07-15T12:00:00Z"),
    });
    assert.equal(withOrphanFuture, "2025/2026");

    assert.equal(calendarFootballSeasonKey(new Date("2026-07-27T12:00:00Z")), "2025/2026");
    assert.equal(calendarFootballSeasonKeyLocal(6, 2026), "2025/2026");
    assert.equal(calendarFootballSeasonKeyLocal(7, 2026), "2026/2027");
  });

  it("prefers stored competition season over calendar when provider missing", () => {
    const current = resolveCurrentSeasonKey({
      storedCompetitionSeason: "2026/2027",
      now: new Date("2026-07-27T12:00:00Z"),
    });
    assert.equal(current, "2026/2027");
  });

  it("detects July preseason for the provider season start year", () => {
    assert.equal(isPreseasonMonthForSeason(6, 2026, "2026/2027"), true);
    assert.equal(isPreseasonMonthForSeason(5, 2026, "2026/2027"), true);
    assert.equal(isPreseasonMonthForSeason(2, 2026, "2026/2027"), false);
    assert.equal(isPreseasonMonthForSeason(6, 2025, "2026/2027"), false);
  });

  it("orders seasons newest first and compares before", () => {
    const list = buildCompetitionSeasonList({
      standingsSeasons: ["2023/2024", "2025/2026", "2024/2025"],
      currentSeason: "2026/2027",
    });
    assert.deepEqual(list, ["2026/2027", "2025/2026", "2024/2025", "2023/2024"]);
    assert.equal(isSeasonKeyBefore("2025/2026", "2026/2027"), true);
    assert.equal(isSeasonKeyBefore("2026/2027", "2025/2026"), false);
  });

  it("treats all-unplayed tables as preseason even with points deductions", () => {
    // Premier League: all P=0, Pts=0
    assert.equal(
      isUnplayedStandingsTable([
        { played: 0, pts: 0 },
        { played: 0, points: 0 },
      ]),
      true,
    );
    // Championship: Southampton start on -4
    assert.equal(
      isUnplayedStandingsTable([
        { played: 0, pts: 0 },
        { played: 0, pts: -4 },
      ]),
      true,
    );
    assert.equal(
      isUnplayedStandingsTable([
        { played: 0, pts: 0 },
        { played: 1, pts: 1 },
      ]),
      false,
    );
    assert.equal(isUnplayedStandingsTable([]), false);
  });

  it("orders preseason PL all-zero tables alphabetically", () => {
    const rows = [
      { played: 0, pts: 0, teamName: "Wolves" },
      { played: 0, pts: 0, teamName: "Arsenal" },
      { played: 0, pts: 0, teamName: "Chelsea" },
    ];
    assert.equal(isUnplayedStandingsTable(rows), true);
    const ordered = [...rows].sort(comparePreseasonStandingsRows);
    assert.deepEqual(
      ordered.map((r) => r.teamName),
      ["Arsenal", "Chelsea", "Wolves"],
    );
  });

  it("orders Championship preseason with a deducted team at the bottom", () => {
    const rows = [
      { played: 0, pts: -4, teamName: "Southampton" },
      { played: 0, pts: 0, teamName: "Leeds" },
      { played: 0, pts: 0, teamName: "Burnley" },
    ];
    assert.equal(isUnplayedStandingsTable(rows), true);
    const ordered = [...rows]
      .sort(comparePreseasonStandingsRows)
      .map((row, index) => ({ ...row, pos: index + 1 }));
    assert.deepEqual(
      ordered.map((r) => [r.pos, r.teamName, r.pts]),
      [
        [1, "Burnley", 0],
        [2, "Leeds", 0],
        [3, "Southampton", -4],
      ],
    );
  });

  it("orders multiple deducted teams by points then alphabetically", () => {
    const rows = [
      { played: 0, points: -2, team: { name: "Team B" } },
      { played: 0, points: -4, team: { name: "Team A" } },
      { played: 0, points: -2, team: { name: "Team A Deducted" } },
      { played: 0, points: 0, team: { name: "Zebra" } },
      { played: 0, points: 0, team: { name: "Alpha" } },
    ];
    const ordered = [...rows].sort(comparePreseasonStandingsRows);
    assert.deepEqual(
      ordered.map((r) => [r.points, r.team.name]),
      [
        [0, "Alpha"],
        [0, "Zebra"],
        [-2, "Team A Deducted"],
        [-2, "Team B"],
        [-4, "Team A"],
      ],
    );
  });

  it("does not treat in-progress tables as preseason", () => {
    const rows = [
      { played: 1, pts: 3, teamName: "Arsenal", pos: 1 },
      { played: 0, pts: 0, teamName: "Wolves", pos: 2 },
    ];
    assert.equal(isUnplayedStandingsTable(rows), false);
    // Callers preserve provider order when not preseason.
    assert.deepEqual(
      rows.map((r) => r.teamName),
      ["Arsenal", "Wolves"],
    );
  });

  it("leaves historical-season ordering to callers (current-season gate)", () => {
    // Helper only detects unplayed rows; Tables/API apply sort only when viewing current.
    const historicalUnplayed = [
      { played: 0, pts: 0, teamName: "Wolves", pos: 12 },
      { played: 0, pts: 0, teamName: "Arsenal", pos: 1 },
    ];
    assert.equal(isUnplayedStandingsTable(historicalUnplayed), true);
    const viewingHistorical = !areSeasonKeysEquivalent("2025/2026", "2026/2027");
    const ordered = viewingHistorical
      ? historicalUnplayed
      : [...historicalUnplayed].sort(comparePreseasonStandingsRows);
    assert.deepEqual(
      ordered.map((r) => r.teamName),
      ["Wolves", "Arsenal"],
    );
  });
});
