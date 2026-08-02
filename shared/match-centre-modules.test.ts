import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveCompletedModuleOrder,
  resolveLiveModuleOrder,
  resolveLineupAvailability,
  resolvePreEventModuleOrder,
} from "./match-centre-modules";
import { matchCentreResultLabel, matchCentreStateLabel } from "./match-centre-state";

describe("matchCentreStateLabel", () => {
  it("labels PRE_EVENT as Scheduled", () => {
    assert.equal(
      matchCentreStateLabel({ presentationState: "PRE_EVENT" }),
      "Scheduled",
    );
  });

  it("labels LIVE with minute", () => {
    assert.equal(
      matchCentreStateLabel({ presentationState: "LIVE", minute: 67 }),
      "Live · 67'",
    );
  });

  it("labels half-time", () => {
    assert.equal(
      matchCentreStateLabel({ presentationState: "LIVE", rawStatus: "HT" }),
      "Half-time",
    );
  });

  it("labels COMPLETED as Finished", () => {
    assert.equal(
      matchCentreStateLabel({ presentationState: "COMPLETED", rawStatus: "FT" }),
      "Finished",
    );
  });

  it("keeps exceptional states distinct", () => {
    assert.equal(matchCentreStateLabel({ presentationState: "POSTPONED" }), "Postponed");
    assert.equal(matchCentreStateLabel({ presentationState: "CANCELLED" }), "Cancelled");
    assert.equal(matchCentreStateLabel({ presentationState: "ABANDONED" }), "Abandoned");
  });

  it("keeps concise result markers for the score area", () => {
    assert.equal(matchCentreResultLabel("FT"), "FT");
    assert.equal(matchCentreResultLabel("AET"), "AET");
    assert.equal(matchCentreResultLabel("Pen."), "Pens");
  });
});

describe("resolveLineupAvailability", () => {
  it("confirmed replaces predicted", () => {
    assert.equal(
      resolveLineupAvailability({ hasPredictedLineup: true, hasConfirmedLineup: true }),
      "confirmed",
    );
    assert.equal(
      resolveLineupAvailability({ hasPredictedLineup: true, hasConfirmedLineup: false }),
      "predicted",
    );
    assert.equal(
      resolveLineupAvailability({ hasPredictedLineup: false, hasConfirmedLineup: false }),
      "none",
    );
  });
});

describe("resolvePreEventModuleOrder", () => {
  it("orders standard build-up with no lineup", () => {
    assert.deepEqual(
      resolvePreEventModuleOrder({ hasPredictedLineup: false, hasConfirmedLineup: false }),
      ["howTheyCompare", "recentForm", "upcomingFixtures", "relatedArticles"],
    );
  });

  it("places Predicted XI above Upcoming when predicted data exists", () => {
    assert.deepEqual(
      resolvePreEventModuleOrder({ hasPredictedLineup: true, hasConfirmedLineup: false }),
      ["howTheyCompare", "recentForm", "predictedXi", "upcomingFixtures", "relatedArticles"],
    );
  });

  it("promotes Starting XI beneath hero when confirmed", () => {
    assert.deepEqual(
      resolvePreEventModuleOrder({ hasPredictedLineup: true, hasConfirmedLineup: true }),
      ["startingXi", "howTheyCompare", "recentForm", "upcomingFixtures", "relatedArticles"],
    );
  });
});

describe("resolveLiveModuleOrder", () => {
  it("prioritises timeline over XI", () => {
    assert.deepEqual(resolveLiveModuleOrder({ hasConfirmedLineup: true }), [
      "timeline",
      "startingXi",
      "statistics",
      "howTheyCompare",
      "relatedArticles",
    ]);
  });

  it("omits XI when unavailable", () => {
    assert.deepEqual(resolveLiveModuleOrder({ hasConfirmedLineup: false }), [
      "timeline",
      "statistics",
      "howTheyCompare",
      "relatedArticles",
    ]);
  });
});

describe("resolveCompletedModuleOrder", () => {
  it("keeps chronological story first and omits empty Final XI", () => {
    assert.deepEqual(resolveCompletedModuleOrder({ hasConfirmedLineup: false }), [
      "timeline",
      "statistics",
      "howTheyCompare",
      "h2hDetail",
      "upcomingFixtures",
      "relatedArticles",
    ]);
  });

  it("includes Final XI when lineup data exists", () => {
    assert.ok(resolveCompletedModuleOrder({ hasConfirmedLineup: true }).includes("finalXi"));
  });
});
