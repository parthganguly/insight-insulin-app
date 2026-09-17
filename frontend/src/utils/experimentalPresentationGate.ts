import type { AssessmentState } from "../types/experimentalReference";

// R3B must apply this before rendering a result or the legacy 7-day trend.
export function experimentalPresentationGate(previewMode: boolean, assessmentState: AssessmentState | null) {
  return {
    showLegacyPrimaryScore: !previewMode || assessmentState === null,
    showLegacyTrend: !previewMode,
  };
}
