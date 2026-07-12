import { describe, expect, it } from "vitest";

import { getImpactPresentation, isHardToEstimatePresentation } from "./insulinImpactPresentation";
import { Meal } from "../types/Meal";

// Issue #93: the former green/amber/red 35/60 tiers had no empirical
// calibration and implied biological categories the data cannot support.
// These tests pin the neutral replacement: exactly two presentation states —
// insufficient-data and a single neutral score presentation — with identical
// wording at every score value, including far above the internal reference.

const meal = (overrides: Partial<Meal> = {}): Meal => ({
	id: "synthetic-meal-1",
	image: null,
	name: "Synthetic Meal",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	items: [],
	...overrides,
});

describe("getImpactPresentation (neutral presentation, issue #93)", () => {
	it("falls back to 'Hard to estimate' for low quality, unknown quality, or a missing score", () => {
		for (const candidate of [
			meal({ estimate_quality: "low", acute_score: 80 }),
			meal({ estimate_quality: "unknown", acute_score: 80 }),
			meal({ estimate_quality: "high", acute_score: undefined }),
			meal({ estimate_quality: "high", acute_score: Number.NaN }),
			meal({ estimate_quality: "high", acute_score: Number.POSITIVE_INFINITY }),
		]) {
			const presentation = getImpactPresentation(candidate);
			expect(presentation.kind).toBe("insufficient-data");
			expect(presentation.title).toBe("Hard to estimate from this meal");
			expect(isHardToEstimatePresentation(presentation)).toBe(true);
		}
	});

	it("gives every scored meal the same neutral presentation regardless of score value", () => {
		// Old tier boundaries (34/35, 59.9/60) and extreme values must all
		// produce identical presentation: no threshold survives.
		const presentations = [-5, 0, 34, 34.9, 35, 59.9, 60, 100, 101, 189, 360, 500, 1580, Number.MAX_SAFE_INTEGER].map((score) =>
			getImpactPresentation(meal({ estimate_quality: "high", acute_score: score })),
		);

		for (const presentation of presentations) {
			expect(presentation).toEqual(presentations[0]);
			expect(presentation.kind).toBe("score");
			expect(presentation.title).toBe("Relative insulin-demand score");
			expect(isHardToEstimatePresentation(presentation)).toBe(false);
		}
	});

	it("keeps the neutral description exact and truthful about calibration", () => {
		const presentation = getImpactPresentation(meal({ estimate_quality: "high", acute_score: 80 }));
		expect(presentation.description).toBe(
			"Higher scores mean a larger estimated insulin demand relative to the app's internal reference of 100. The reference has not yet been calibrated to typical meals or personal responses, so this is a relative comparison, not a health category and not a personal prediction.",
		);
	});

	it("no longer uses the retired traffic-light colours or tier titles", () => {
		for (const score of [10, 40, 80, 500]) {
			const presentation = getImpactPresentation(meal({ estimate_quality: "high", acute_score: score }));
			expect(["#2ecc71", "#f1c40f", "#e74c3c"]).not.toContain(presentation.color);
			expect(presentation.title).not.toMatch(/lower relative|moderate relative|higher relative/i);
		}
	});

	it("identifies the insufficient-data state by kind, not by colour", () => {
		const insufficient = getImpactPresentation(meal({ estimate_quality: "low", acute_score: 80 }));
		const scored = getImpactPresentation(meal({ estimate_quality: "high", acute_score: 80 }));
		expect(isHardToEstimatePresentation({ ...insufficient, color: "#123456" })).toBe(true);
		expect(isHardToEstimatePresentation({ ...scored, color: "#95a5a6" })).toBe(false);
	});

	it("only gates on quality strings case-insensitively, like the original", () => {
		expect(getImpactPresentation(meal({ estimate_quality: "LOW", acute_score: 80 })).kind).toBe("insufficient-data");
		expect(getImpactPresentation(meal({ estimate_quality: "medium", acute_score: 80 })).kind).toBe("score");
	});
});
