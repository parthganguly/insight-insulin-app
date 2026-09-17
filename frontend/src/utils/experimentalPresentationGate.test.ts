import { describe, expect, it } from "vitest";
import { experimentalPresentationGate } from "./experimentalPresentationGate";

describe("future activation gate", () => {
  it("hides legacy score for every experimental assessment state and legacy trend in preview mode", () => {
    for (const state of ["evaluated", "not_evaluated", "evidence_error"] as const) {
      expect(experimentalPresentationGate(true, state)).toEqual({ showLegacyPrimaryScore: false, showLegacyTrend: false });
    }
    expect(experimentalPresentationGate(false, "evaluated")).toEqual({ showLegacyPrimaryScore: true, showLegacyTrend: true });
  });
});
