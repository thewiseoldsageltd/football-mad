import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isExplicitHistoricalSeasonRun,
  membershipIsCurrentForTeamSync,
  minTeamsForLeague,
  shouldApplyExclusiveMembershipRollover,
  shouldApplyMembershipRollover,
  shouldPromoteCompetitionCurrentFromFixtureSync,
} from "./membership-rollover";
import {
  areSeasonKeysEquivalent,
  isPreseasonMonthForSeason,
  isSeasonKeyBefore,
  resolveCurrentSeasonKey,
  seasonKeyToUiLabel,
} from "./season";

describe("membership rollover guards", () => {
  it("requires a complete team list before demoting other seasons", () => {
    assert.equal(shouldApplyMembershipRollover(20, "1204"), true);
    assert.equal(shouldApplyMembershipRollover(19, "1204"), false);
    assert.equal(shouldApplyMembershipRollover(0, "1204"), false);
    assert.equal(minTeamsForLeague("1204"), 20);
  });

  it("leaves only the new competition season conceptually current", () => {
    const current = resolveCurrentSeasonKey({
      providerSeason: "2026/2027",
      storedCompetitionSeason: "2026/2027",
      standingsSeasons: ["2025/2026", "2026/2027"],
    });
    assert.equal(current, "2026/2027");
    assert.equal(areSeasonKeysEquivalent(current, "2026/27"), true);
    assert.equal(isSeasonKeyBefore("2025/2026", current), true);
  });
});

describe("historical vs current sync promotion", () => {
  it("treats seasonKeyParam as an explicit historical fixture run", () => {
    assert.equal(isExplicitHistoricalSeasonRun("2025/2026"), true);
    assert.equal(isExplicitHistoricalSeasonRun(undefined), false);
    assert.equal(isExplicitHistoricalSeasonRun(""), false);

    // Current is 2026/2027; historical fixture sync for 2025/2026 must not promote.
    assert.equal(
      shouldPromoteCompetitionCurrentFromFixtureSync({
        seasonKeyParam: "2025/2026",
        feedParsedOk: true,
      }),
      false,
    );
    assert.equal(
      shouldPromoteCompetitionCurrentFromFixtureSync({
        seasonKeyParam: undefined,
        feedParsedOk: true,
      }),
      true,
    );
    assert.equal(
      shouldPromoteCompetitionCurrentFromFixtureSync({
        seasonKeyParam: undefined,
        feedParsedOk: false,
      }),
      false,
    );

    const currentAfterHistorical = resolveCurrentSeasonKey({
      providerSeason: "2026/2027",
      storedCompetitionSeason: "2026/2027",
      matchSeasons: ["2025/2026", "2026/2027"],
    });
    assert.equal(currentAfterHistorical, "2026/2027");
  });

  it("does not displace current 2026/2027 memberships on historical 2025/2026 team sync", () => {
    assert.equal(membershipIsCurrentForTeamSync("2025/2026"), false);
    assert.equal(membershipIsCurrentForTeamSync(undefined), true);
    assert.equal(
      shouldApplyExclusiveMembershipRollover({
        seasonKeyParam: "2025/2026",
        teamCount: 20,
        leagueId: "1204",
      }),
      false,
    );
    assert.equal(
      shouldApplyExclusiveMembershipRollover({
        seasonKeyParam: undefined,
        teamCount: 20,
        leagueId: "1204",
      }),
      true,
    );
    assert.equal(
      shouldApplyExclusiveMembershipRollover({
        seasonKeyParam: undefined,
        teamCount: 10,
        leagueId: "1204",
      }),
      false,
    );
  });
});

describe("team hub season identity", () => {
  it("is not controlled by a July selected month when provider season is 2026/27", () => {
    const provider = "2026/2027";
    const julyMonthSeason = "2025/2026";
    assert.equal(isPreseasonMonthForSeason(6, 2026, provider), true);
    const treatAsHistorical =
      !areSeasonKeysEquivalent(julyMonthSeason, provider) &&
      !isPreseasonMonthForSeason(6, 2026, provider) &&
      isSeasonKeyBefore(julyMonthSeason, provider);
    assert.equal(treatAsHistorical, false);
    assert.equal(seasonKeyToUiLabel(provider), "2026/27");
  });

  it("still treats March as historical relative to the new provider season", () => {
    const provider = "2026/2027";
    const marchSeason = "2025/2026";
    const treatAsHistorical =
      !areSeasonKeysEquivalent(marchSeason, provider) &&
      !isPreseasonMonthForSeason(2, 2026, provider) &&
      isSeasonKeyBefore(marchSeason, provider);
    assert.equal(treatAsHistorical, true);
  });
});
