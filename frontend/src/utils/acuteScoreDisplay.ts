// Presentation-only helpers for GitHub issue #79. Never use these helpers to
// persist or recalculate acute_score.

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
	return roundedScore > 100 ? `Score: ${roundedScore} · above reference meal (100)` : `Score: ${roundedScore} · reference meal: 100`;
};

export const ACUTE_SCORE_SCALE_EXPLAINER = "This relative score compares estimated meal insulin demand with a reference meal set to 100. It is not a percentage and can exceed 100.";

export const getAcuteScoreAriaLabel = (score?: number): string => {
	if (score === undefined || !Number.isFinite(score)) {
		return "Estimated meal insulin demand score not available for this meal.";
	}

	const roundedScore = Math.round(score);
	if (roundedScore > 100) {
		return `Estimated meal insulin demand score ${roundedScore}. This is above the reference meal of 100. The score is not a percentage and can exceed 100; the ring is a visual guide only.`;
	}

	return `Estimated meal insulin demand score ${roundedScore}. The reference meal is 100.`;
};
