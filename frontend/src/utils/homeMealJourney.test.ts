import { describe, expect, it } from "vitest";

import { getHomeTrendCoverageLine, resolveHomeLifecycleState } from "./homeMealJourney";

describe("resolveHomeLifecycleState", () => {
	it("uses the empty state when no meals exist", () => {
		expect(resolveHomeLifecycleState({ mealCount: 0, loggedDaysLast7: 0, coverageKnown: true })).toBe("empty");
	});

	it.each([0, 1, 2])("builds history with %s confirmed logged days", (loggedDaysLast7) => {
		expect(resolveHomeLifecycleState({ mealCount: 2, loggedDaysLast7, coverageKnown: true })).toBe("building-history");
	});

	it.each([3, 4, 7])("shows the trend with %s confirmed logged days", (loggedDaysLast7) => {
		expect(resolveHomeLifecycleState({ mealCount: 3, loggedDaysLast7, coverageKnown: true })).toBe("trend-ready");
	});

	// Coverage is "unknown" while the chronic-metrics fetch is in flight or has
	// failed — not yet a confirmed low count. It must not be misread as
	// "building history", or the trend card's own loading/error announcements
	// (with their distinct ARIA labels) would never render.
	it("stays on the full trend card while coverage is unknown (loading), regardless of meal count", () => {
		expect(resolveHomeLifecycleState({ mealCount: 1, loggedDaysLast7: undefined, coverageKnown: false })).toBe("trend-ready");
	});

	it("stays on the full trend card while coverage is unknown (fetch failed), regardless of meal count", () => {
		expect(resolveHomeLifecycleState({ mealCount: 1, loggedDaysLast7: null, coverageKnown: false })).toBe("trend-ready");
	});
});

describe("getHomeTrendCoverageLine", () => {
	it("states the existing seven-day coverage requirement plainly", () => {
		expect(getHomeTrendCoverageLine(2, 7)).toBe("Your 7-day trend appears after you log meals on 3 different days (2 of 3 so far).");
	});

	it("keeps displayed coverage within the three-day gate", () => {
		expect(getHomeTrendCoverageLine(-2, 7)).toContain("(0 of 3 so far)");
		expect(getHomeTrendCoverageLine(8, 7)).toContain("(3 of 3 so far)");
	});
});
