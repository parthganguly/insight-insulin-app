import { describe, expect, it } from "vitest";
import { REFERENCE_PREVIEW_MODE, experimentalPresentationGate } from "./experimentalPresentationGate";

const ALL_CLOSED = {
  showLegacyPrimaryScore: false,
  showLegacyTrend: false,
  showLegacyInterpretation: false,
  showLegacyCardCaptions: false,
};
const ALL_OPEN = {
  showLegacyPrimaryScore: true,
  showLegacyTrend: true,
  showLegacyInterpretation: true,
  showLegacyCardCaptions: true,
};

describe("reference preview presentation gate", () => {
  it("hides the whole legacy interpretation subtree for every assessment state in preview mode", () => {
    for (const state of ["evaluated", "not_evaluated", "evidence_error"] as const) {
      expect(experimentalPresentationGate(true, state)).toEqual(ALL_CLOSED);
    }
  });

  it("fails closed on an unknown, loading or failed state instead of restoring legacy output", () => {
    // The R3A defect: a null state re-enabled the legacy primary score.
    expect(experimentalPresentationGate(true, null)).toEqual(ALL_CLOSED);
  });

  it("leaves legacy presentation intact when preview mode is off", () => {
    expect(experimentalPresentationGate(false, "evaluated")).toEqual(ALL_OPEN);
    expect(experimentalPresentationGate(false, null)).toEqual(ALL_OPEN);
  });

  it("defaults the build-time flag to off", () => {
    // Nothing in the default test/build environment sets VITE_REFERENCE_PREVIEW.
    expect(REFERENCE_PREVIEW_MODE).toBe(false);
  });
});
