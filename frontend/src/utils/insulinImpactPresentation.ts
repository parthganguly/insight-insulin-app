import { Meal } from "../types/Meal";

// Presentation-only mapping from a meal's canonical backend fields to the
// "Estimated Insulin Demand" card wording. Shared by the review screen and
// the read-only saved-meal detail view (issue #89). Never use this to
// persist or recalculate acute_score.
//
// Issue #93: the former green/amber/red tiers at 35/60 had no empirical
// calibration, and with the current uncalibrated internal reference nearly
// every realistic meal rendered red — a traffic-light certainty the data
// cannot support. Scored meals now share one calm neutral presentation, and
// the insufficient-data state is identified by an explicit `kind` instead of
// a colour hex. No replacement thresholds were introduced.

export type ImpactPresentationKind = "insufficient-data" | "score";

export type ImpactPresentation = {
	kind: ImpactPresentationKind;
	title: string;
	description: string;
	color: string;
};

// Neutral tones only: grey for "we can't estimate this well", a calm blue for
// "here is the relative score". Neither colour encodes a biological category.
const INSUFFICIENT_DATA_COLOR = "#95a5a6";
const NEUTRAL_SCORE_COLOR = "#2f86c0";

export const getImpactPresentation = (savedMeal: Meal): ImpactPresentation => {
	const quality = savedMeal.estimate_quality?.toLowerCase();
	if (quality === "low" || quality === "unknown" || typeof savedMeal.acute_score !== "number" || !Number.isFinite(savedMeal.acute_score)) {
		return {
			kind: "insufficient-data",
			title: "Hard to estimate from this meal",
			description: "This saved meal has limited data quality, so the insulin-demand estimate could be off.",
			color: INSUFFICIENT_DATA_COLOR,
		};
	}

	return {
		kind: "score",
		title: "Relative insulin-demand score",
		description:
			"Higher scores mean a larger estimated insulin demand relative to the app's internal reference of 100. The reference has not yet been calibrated to typical meals or personal responses, so this is a relative comparison, not a health category and not a personal prediction.",
		color: NEUTRAL_SCORE_COLOR,
	};
};

// The insufficient-data presentation means the score itself is suppressed as
// unreliable, so score-detail lines must also stay hidden.
export const isHardToEstimatePresentation = (presentation: ImpactPresentation): boolean => presentation.kind === "insufficient-data";
