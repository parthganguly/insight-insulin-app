import type { AssessmentState } from "../types/experimentalReference";

// Immutable build-time flag, read once (freeze D9). Default OFF: only an
// explicit "1" enables the reference private preview, and no settings toggle,
// config service or runtime switch can turn it on.
export const REFERENCE_PREVIEW_MODE: boolean = import.meta.env.VITE_REFERENCE_PREVIEW === "1";

export type ExperimentalPresentationGate = {
  /** The large legacy acute number. */
  showLegacyPrimaryScore: boolean;
  /** The legacy 7-day chronic trend, including its fetch. */
  showLegacyTrend: boolean;
  /**
   * The whole legacy result-interpretation subtree: verdict copy, score
   * captions, Advanced partial model output, and estimate-quality or
   * FII-source verdicts.
   */
  showLegacyInterpretation: boolean;
  /** Legacy score and data-quality captions on history and reuse cards. */
  showLegacyCardCaptions: boolean;
};

/**
 * R3B applies this before rendering any result, card caption or the legacy
 * trend. In preview mode the legacy interpretation subtree is hidden for every
 * assessment state — including a null state, which means unknown, loading or
 * failed. An unknown state must fail closed rather than opt back into legacy
 * rendering, so the state deliberately never widens the gate.
 */
export function experimentalPresentationGate(
  previewMode: boolean,
  assessmentState: AssessmentState | null,
): ExperimentalPresentationGate {
  void assessmentState;
  return {
    showLegacyPrimaryScore: !previewMode,
    showLegacyTrend: !previewMode,
    showLegacyInterpretation: !previewMode,
    showLegacyCardCaptions: !previewMode,
  };
}

/** Convenience for callers that only need the build-time mode. */
export const currentPresentationGate = (assessmentState: AssessmentState | null = null): ExperimentalPresentationGate =>
  experimentalPresentationGate(REFERENCE_PREVIEW_MODE, assessmentState);
