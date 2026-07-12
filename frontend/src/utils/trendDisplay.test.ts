import { describe, expect, it } from "vitest";

import {
	TREND_ARIA_LOADING,
	TREND_ARIA_NO_DATA,
	TREND_ARIA_UNAVAILABLE,
	TREND_NO_DATA_LINE,
	TREND_RING_MAX,
	TREND_STATUS_LINE,
	getTrendAriaLabel,
	getTrendCoverageText,
	getTrendRingValue,
	getTrendText,
	isAboveTrendRingMax,
	resolveTrendState,
} from "./trendDisplay";

// The displayed trend is rolling_7d_dii × 100. Since
// daily_dii = Σ(fii/100 × kcal) / Σ(kcal), that value is the kcal-weighted
// mean FII — an ENERGY-NORMALIZED INDEX, not total or average daily insulin
// demand. It legitimately exceeds 100: a potato-only day (FII 121, a real row
// in the live dataset) displays 121. So the raw number must never be capped;
// only the ring geometry caps.
const TREND_VALUES = [null, 0, 15, 100, 121, 300] as const;

describe("getTrendRingValue (ring geometry caps at 100)", () => {
	it.each([
		[null, 0],
		[undefined, 0],
		[Number.NaN, 0],
		[Number.POSITIVE_INFINITY, 0],
		[-5, 0],
		[0, 0],
		[15, 15],
		[100, 100],
		[121, 100],
		[300, 100],
		[Number.MAX_SAFE_INTEGER, 100],
	])("clamps %s to %s", (trend, expected) => {
		expect(getTrendRingValue(trend)).toBe(expected);
	});

	it("never exceeds the ring maximum for any finite value", () => {
		for (const value of [101, 121, 300, 5000]) {
			expect(getTrendRingValue(value)).toBeLessThanOrEqual(TREND_RING_MAX);
		}
	});
});

describe("getTrendText (raw number is never capped)", () => {
	it.each([
		[null, "--"],
		[undefined, "--"],
		[Number.NaN, "--"],
		[0, "0"],
		[15, "15"],
		[100, "100"],
		[121, "121"],
		[300, "300"],
	])("renders %s as %s", (trend, expected) => {
		expect(getTrendText(trend)).toBe(expected);
	});

	it("keeps 121 and 300 visible as raw uncapped numbers", () => {
		expect(getTrendText(121)).toBe("121");
		expect(getTrendText(300)).toBe("300");
		// The ring caps while the number does not — the two must disagree.
		expect(getTrendRingValue(121)).toBe(100);
		expect(getTrendRingValue(300)).toBe(100);
	});

	it("shows the loading placeholder only while loading", () => {
		expect(getTrendText(15, true)).toBe("...");
		expect(getTrendText(null, true)).toBe("...");
		expect(getTrendText(15, false)).toBe("15");
	});

	it("never renders missing data as a numeric zero", () => {
		expect(getTrendText(null)).toBe("--");
		expect(getTrendText(undefined)).toBe("--");
		expect(getTrendText(0)).toBe("0"); // a real logged 0 is distinct from no data
	});
});

describe("isAboveTrendRingMax", () => {
	it.each([
		[null, false],
		[0, false],
		[15, false],
		[100, false],
		[121, true],
		[300, true],
	])("classifies %s as %s", (trend, expected) => {
		expect(isAboveTrendRingMax(trend)).toBe(expected);
	});
});

describe("getTrendCoverageText", () => {
	it.each([
		[0, 7, "0 of 7 days logged"],
		[1, 7, "1 of 7 days logged"],
		[4, 7, "4 of 7 days logged"],
		[7, 7, "7 of 7 days logged"],
	])("renders %s/%s as %s", (logged, window, expected) => {
		expect(getTrendCoverageText(logged, window)).toBe(expected);
	});
});

describe("resolveTrendState (never infers no-data from a missing number)", () => {
	const base = { isLoading: false, errorMessage: null, hasResponse: true, hasData: true, trend: 15 };

	it("is loading whenever the request is in flight, whatever else is set", () => {
		expect(resolveTrendState({ ...base, isLoading: true })).toBe("loading");
		expect(resolveTrendState({ ...base, isLoading: true, trend: undefined, hasResponse: false, hasData: false })).toBe("loading");
		expect(resolveTrendState({ ...base, isLoading: true, errorMessage: "boom" })).toBe("loading");
	});

	it("is unavailable on a failed fetch — never no-data", () => {
		const failed = resolveTrendState({ ...base, errorMessage: "Internal server error", trend: undefined, hasResponse: false, hasData: false });
		expect(failed).toBe("unavailable");
		expect(failed).not.toBe("no-data");
	});

	it("is unavailable when no response has arrived, even without an error", () => {
		expect(resolveTrendState({ ...base, hasResponse: false, hasData: false, trend: undefined })).toBe("unavailable");
	});

	it("is no-data only for a SUCCESSFUL response reporting zero logged days", () => {
		expect(resolveTrendState({ isLoading: false, errorMessage: null, hasResponse: true, hasData: false, trend: undefined })).toBe("no-data");
	});

	it("treats a successful response that claims data but carries no number as unavailable, not no-data", () => {
		expect(resolveTrendState({ isLoading: false, errorMessage: null, hasResponse: true, hasData: true, trend: undefined })).toBe("unavailable");
	});

	it.each([0, 15, 100, 121, 300])("is a value state for the finite index %s", (trend) => {
		expect(resolveTrendState({ ...base, trend })).toBe("value");
	});
});

describe("getTrendAriaLabel absent-value states are distinct", () => {
	it("uses the exact loading label and never claims meals were not logged", () => {
		const label = getTrendAriaLabel("loading", undefined, 0, 7);
		expect(label).toBe(TREND_ARIA_LOADING);
		expect(label).toBe("7-day logged meal trend loading.");
		expect(label.toLowerCase()).not.toContain("no meals");
	});

	it("uses the exact unavailable label and never claims meals were not logged", () => {
		const label = getTrendAriaLabel("unavailable", undefined, 0, 7);
		expect(label).toBe(TREND_ARIA_UNAVAILABLE);
		expect(label).toBe("7-day logged meal trend unavailable because the data could not be loaded.");
		expect(label.toLowerCase()).not.toContain("no meals");
	});

	it("uses the exact no-data label, which is the ONLY one that may say no meals were logged", () => {
		const label = getTrendAriaLabel("no-data", undefined, 0, 7);
		expect(label).toBe(TREND_ARIA_NO_DATA);
		expect(label).toBe("7-day logged meal trend not available because no meals were logged in the last 7 days.");
		expect(label.toLowerCase()).toContain("no meals were logged");
	});

	it("keeps the three absent-value labels mutually distinct", () => {
		const labels = [TREND_ARIA_LOADING, TREND_ARIA_UNAVAILABLE, TREND_ARIA_NO_DATA];
		expect(new Set(labels).size).toBe(3);
	});

	it("falls back to unavailable if a value state somehow carries no number", () => {
		expect(getTrendAriaLabel("value", undefined, 4, 7)).toBe(TREND_ARIA_UNAVAILABLE);
		expect(getTrendAriaLabel("value", Number.NaN, 4, 7)).toBe(TREND_ARIA_UNAVAILABLE);
	});
});

describe("getTrendAriaLabel (accessible meaning)", () => {
	it.each(TREND_VALUES)("describes the displayed quantity accurately for %s", (trend) => {
		if (trend === null) {
			expect(getTrendAriaLabel("no-data", trend, 4, 7)).toBe(TREND_ARIA_NO_DATA);
			return;
		}

		const label = getTrendAriaLabel("value", trend, 4, 7);
		expect(label).toContain("energy-normalized insulin-demand index");
		expect(label).toContain("4 of the last 7 days");
		expect(label).toContain("Days without logged meals are excluded");
		expect(label).toContain("meals you did not log on a logged day are not represented");
		expect(label).toContain("ring caps at 100 and is a visual guide only");
		expect(label).toContain("not a measure of insulin resistance or metabolic health");
	});

	it("discloses that the index exceeds 100 and is not a percentage, only when it does", () => {
		for (const above of [121, 300]) {
			const label = getTrendAriaLabel("value", above, 7, 7);
			expect(label).toContain(`trend ${above}`);
			expect(label).toContain("above 100");
			expect(label).toContain("not a percentage and can exceed 100");
		}
		for (const notAbove of [0, 15, 100]) {
			expect(getTrendAriaLabel("value", notAbove, 7, 7)).not.toContain("above 100");
		}
	});
});

describe("trend copy truth guard (issue #93)", () => {
	// "percentage" may appear ONLY inside the approved negation ("not a
	// percentage and can exceed 100"); it is stripped before scanning so a
	// positive use of the word cannot hide behind the disclaimer.
	const ALL_TREND_COPY = [
		TREND_STATUS_LINE,
		TREND_NO_DATA_LINE,
		...TREND_VALUES.map((value) => getTrendAriaLabel(value === null ? "no-data" : "value", value, 4, 7)),
	]
		.join(" ")
		.toLowerCase()
		.replaceAll("not a percentage and can exceed 100", "");

	// The displayed value is an energy-normalized index. Describing it as a
	// total, a per-day average of demand, a chronic response, or a metabolic
	// score misstates what the number is.
	it.each([
		"total daily insulin demand",
		"average insulin demand per day",
		"estimated insulin demand per logged day",
		"chronic insulin response",
		"chronic score",
		"metabolic score",
		"percentage",
	])("never claims %s", (forbidden) => {
		expect(ALL_TREND_COPY).not.toContain(forbidden);
	});

	it("states the index is energy-normalized", () => {
		expect(TREND_STATUS_LINE.toLowerCase()).toContain("energy-normalized insulin-demand index");
		expect(TREND_STATUS_LINE.toLowerCase()).toContain("days you logged meals");
	});
});
