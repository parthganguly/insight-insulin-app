import { describe, expect, it } from "vitest";

import { getImpactPresentation, isHardToEstimatePresentation } from "./insulinImpactPresentation";
import { Meal } from "../types/Meal";

// getImpactPresentation was moved verbatim out of PreviewMeal.tsx (issue #89)
// so the saved-meal detail view can share it. These tests pin the exact
// pre-existing wording and presentation thresholds so the move cannot
// silently change what users are shown. Presentation only — no scoring.

const meal = (overrides: Partial<Meal> = {}): Meal => ({
	id: "synthetic-meal-1",
	image: null,
	name: "Synthetic Meal",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	items: [],
	...overrides,
});

describe("getImpactPresentation (moved verbatim from PreviewMeal, issue #89)", () => {
	it("falls back to 'Hard to estimate' for low quality, unknown quality, or a missing score", () => {
		for (const candidate of [
			meal({ estimate_quality: "low", acute_score: 80 }),
			meal({ estimate_quality: "unknown", acute_score: 80 }),
			meal({ estimate_quality: "high", acute_score: undefined }),
			meal({ estimate_quality: "high", acute_score: Number.NaN }),
		]) {
			const presentation = getImpactPresentation(candidate);
			expect(presentation.title).toBe("Hard to estimate from this meal");
			expect(presentation.color).toBe("#95a5a6");
			expect(isHardToEstimatePresentation(presentation)).toBe(true);
		}
	});

	it("maps scores below 35 to the lower-demand presentation", () => {
		const presentation = getImpactPresentation(meal({ estimate_quality: "high", acute_score: 34.9 }));
		expect(presentation.title).toBe("Lower relative insulin demand");
		expect(presentation.color).toBe("#2ecc71");
		expect(isHardToEstimatePresentation(presentation)).toBe(false);
	});

	it("maps scores from 35 up to below 60 to the moderate presentation", () => {
		expect(getImpactPresentation(meal({ estimate_quality: "high", acute_score: 35 })).title).toBe("Moderate relative insulin demand");
		expect(getImpactPresentation(meal({ estimate_quality: "high", acute_score: 59.9 })).title).toBe("Moderate relative insulin demand");
		expect(getImpactPresentation(meal({ estimate_quality: "high", acute_score: 35 })).color).toBe("#f1c40f");
	});

	it("maps scores of 60 and above — including far above the 100 reference — to the higher presentation", () => {
		expect(getImpactPresentation(meal({ estimate_quality: "high", acute_score: 60 })).title).toBe("Higher relative insulin demand");
		expect(getImpactPresentation(meal({ estimate_quality: "high", acute_score: 360 })).title).toBe("Higher relative insulin demand");
		expect(getImpactPresentation(meal({ estimate_quality: "high", acute_score: 60 })).color).toBe("#e74c3c");
	});

	it("only gates on quality strings case-insensitively, like the original", () => {
		expect(getImpactPresentation(meal({ estimate_quality: "LOW", acute_score: 80 })).title).toBe("Hard to estimate from this meal");
		expect(getImpactPresentation(meal({ estimate_quality: "medium", acute_score: 80 })).title).toBe("Higher relative insulin demand");
	});
});
