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

export const hasInsufficientEstimateStatus = (meal: Meal): boolean => meal.estimate_status === "insufficient_data";

export const getImpactPresentation = (savedMeal: Meal): ImpactPresentation => {
	const quality = savedMeal.estimate_quality?.toLowerCase();
	if (
		hasInsufficientEstimateStatus(savedMeal) ||
		quality === "low" ||
		quality === "unknown" ||
		typeof savedMeal.acute_score !== "number" ||
		!Number.isFinite(savedMeal.acute_score)
	) {
		return {
			kind: "insufficient-data",
			title: "Hard to estimate from this meal",
			description: "Some items were approximated or not estimated by the current model, so this result has limited model coverage.",
			color: INSUFFICIENT_DATA_COLOR,
		};
	}

	return {
		kind: "score",
		title: "Estimated meal insulin demand",
		description:
			"This model-derived estimate uses the foods and amounts saved for this meal. Within the current model, higher scores correspond to a larger modelled meal load.",
		color: NEUTRAL_SCORE_COLOR,
	};
};

// The insufficient-data presentation means the score itself is suppressed as
// unreliable, so score-detail lines must also stay hidden.
export const isHardToEstimatePresentation = (presentation: ImpactPresentation): boolean => presentation.kind === "insufficient-data";
