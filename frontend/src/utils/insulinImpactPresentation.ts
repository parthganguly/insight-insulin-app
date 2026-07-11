import { Meal } from "../types/Meal";

// Presentation-only mapping from a meal's canonical backend fields to the
// "Estimated Insulin Demand" card wording. Moved verbatim from PreviewMeal.tsx
// (issue #89) so the read-only saved-meal detail view shows exactly the same
// copy, thresholds, and colors as the review screen. Never use this to
// persist or recalculate acute_score.

export type ImpactPresentation = {
	title: string;
	description: string;
	color: string;
};

export const getImpactPresentation = (savedMeal: Meal): ImpactPresentation => {
	const quality = savedMeal.estimate_quality?.toLowerCase();
	if (quality === "low" || quality === "unknown" || typeof savedMeal.acute_score !== "number" || !Number.isFinite(savedMeal.acute_score)) {
		return {
			title: "Hard to estimate from this meal",
			description: "This saved meal has limited data quality, so the insulin-demand estimate could be off.",
			color: "#95a5a6",
		};
	}

	if (savedMeal.acute_score < 35) {
		return {
			title: "Lower relative insulin demand",
			description: "Meals like this tend to create a smaller estimated insulin demand. This is a general tendency, not a personal prediction.",
			color: "#2ecc71",
		};
	}

	if (savedMeal.acute_score < 60) {
		return {
			title: "Moderate relative insulin demand",
			description: "Meals like this tend to create a moderate estimated insulin demand. This is a general tendency, not a personal prediction.",
			color: "#f1c40f",
		};
	}

	return {
		title: "Higher relative insulin demand",
		description: "Meals like this tend to create a larger estimated insulin demand. This is a general tendency, not a personal prediction.",
		color: "#e74c3c",
	};
};

// The grey presentation means the score itself is suppressed as unreliable,
// so score-detail lines must also stay hidden. Same check PreviewMeal makes.
export const isHardToEstimatePresentation = (presentation: ImpactPresentation): boolean => presentation.color === "#95a5a6";
