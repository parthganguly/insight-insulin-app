// Presentation-only helpers for GitHub issues #79 and #93. Never use these
// helpers to persist or recalculate acute_score.
//
// Wording contract (issue #93): 100 is an *internal reference value*. It is
// not a percentage, not a maximum, and not a validated "typical meal" — the
// reference constant has not been calibrated against representative meals or
// personal physiology. Copy here must never assert an empirical meaning the
// data cannot support.

export const getAcuteRingValue = (score?: number): number => {
	if (score === undefined || !Number.isFinite(score)) return 0;
	return Math.min(100, Math.max(0, Math.round(score)));
};

export const getAcuteScoreText = (score?: number): string => {
	if (score === undefined || !Number.isFinite(score)) return "--";
	return String(Math.round(score));
};

export const isAboveAcuteReference = (score?: number): boolean => {
	if (score === undefined || !Number.isFinite(score)) return false;
	return Math.round(score) > 100;
};

export const getAcuteScoreCaption = (score?: number): string => (isAboveAcuteReference(score) ? "above ref" : "score");

export const getAcuteScoreDetailLine = (score: number): string => {
	const roundedScore = Math.round(score);
	return roundedScore > 100 ? `Score: ${roundedScore} · above internal reference (100)` : `Score: ${roundedScore} · internal reference: 100`;
};

export const ACUTE_SCORE_SCALE_EXPLAINER =
	"This score compares estimated meal insulin demand with an internal reference set to 100. The reference has not yet been calibrated to typical meals or personal responses. It is not a percentage and can exceed 100.";

export const getAcuteScoreAriaLabel = (score?: number): string => {
	if (score === undefined || !Number.isFinite(score)) {
		return "Estimated meal insulin demand score not available for this meal.";
	}

	const roundedScore = Math.round(score);
	if (roundedScore > 100) {
		return `Estimated meal insulin demand score ${roundedScore}. This is above the internal reference of 100, which has not yet been calibrated. The score is not a percentage and can exceed 100; the ring caps at 100 and is a visual guide only.`;
	}

	return `Estimated meal insulin demand score ${roundedScore}. The internal reference is 100 and has not yet been calibrated; the score is not a percentage. The ring is a visual guide only.`;
};
