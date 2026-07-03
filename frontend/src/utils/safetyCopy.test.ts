import { describe, expect, it } from "vitest";

import {
	APP_DISCLAIMER,
	CHRONIC_TREND_DISCLAIMER,
	MEAL_SCORE_DISCLAIMER,
	PROVIDED_FII_DISCLAIMER,
	ROUGH_ESTIMATE_NOTICE,
	UNKNOWN_ITEMS_NOTICE,
	getEstimateQualityCopy,
	humanizeFiiSource,
	isProvidedFiiSource,
	isRoughEstimateSource,
	isUnknownSource,
} from "./safetyCopy";

describe("safety copy source labels", () => {
	it.each([
		["user_confirmed", "User-entered FII"],
		["exact_fii", "Direct FII match"],
		["mapped_fii", "Mapped FII estimate"],
		["macro_fallback", "Macro-based rough estimate"],
		["unknown", "Unknown / not estimated"],
	])("humanizes %s as %s", (source, label) => {
		expect(humanizeFiiSource(source)).toBe(label);
	});

	it("falls back to the unknown label for missing or unrecognized sources", () => {
		expect(humanizeFiiSource(undefined)).toBe("Unknown / not estimated");
		expect(humanizeFiiSource("")).toBe("Unknown / not estimated");
		expect(humanizeFiiSource("provided")).toBe("Unknown / not estimated");
		expect(humanizeFiiSource("some_new_token")).toBe("Unknown / not estimated");
	});
});

describe("estimate quality copy", () => {
	it.each([
		["high", "High", "Based on direct or explicitly provided insulin-index data."],
		["medium", "Medium", "Based on mapped or decomposed food-insulin data. Useful, but less direct."],
		["low", "Low", "Uses rough fallback, unknown, or mixed-quality estimates. Treat as approximate."],
		["unknown", "Unknown", "Not enough reliable data to estimate this confidently."],
	])("returns approved copy for %s quality", (quality, label, description) => {
		expect(getEstimateQualityCopy(quality)).toEqual({ label, description });
	});

	it("normalizes casing and whitespace", () => {
		expect(getEstimateQualityCopy(" High ").label).toBe("High");
		expect(getEstimateQualityCopy("MEDIUM").label).toBe("Medium");
	});

	it("falls back to unknown copy for missing or unrecognized values", () => {
		expect(getEstimateQualityCopy(undefined).label).toBe("Unknown");
		expect(getEstimateQualityCopy("").label).toBe("Unknown");
		expect(getEstimateQualityCopy("excellent").label).toBe("Unknown");
	});
});

describe("source predicates", () => {
	it("flags unknown, rough-estimate, and provided sources", () => {
		expect(isUnknownSource("unknown")).toBe(true);
		expect(isUnknownSource("exact_fii")).toBe(false);
		expect(isUnknownSource(undefined)).toBe(false);

		expect(isRoughEstimateSource("macro_fallback")).toBe(true);
		expect(isRoughEstimateSource("mapped_fii")).toBe(true);
		expect(isRoughEstimateSource("exact_fii")).toBe(false);
		expect(isRoughEstimateSource(undefined)).toBe(false);

		expect(isProvidedFiiSource("user_confirmed")).toBe(true);
		expect(isProvidedFiiSource("exact_fii")).toBe(false);
		expect(isProvidedFiiSource(undefined)).toBe(false);
	});
});

describe("banned wording guard", () => {
	const allCopy = [
		APP_DISCLAIMER,
		MEAL_SCORE_DISCLAIMER,
		UNKNOWN_ITEMS_NOTICE,
		ROUGH_ESTIMATE_NOTICE,
		CHRONIC_TREND_DISCLAIMER,
		PROVIDED_FII_DISCLAIMER,
		humanizeFiiSource("user_confirmed"),
		humanizeFiiSource("exact_fii"),
		humanizeFiiSource("mapped_fii"),
		humanizeFiiSource("macro_fallback"),
		humanizeFiiSource("unknown"),
		getEstimateQualityCopy("high").description,
		getEstimateQualityCopy("medium").description,
		getEstimateQualityCopy("low").description,
		getEstimateQualityCopy("unknown").description,
	]
		.join(" ")
		.toLowerCase();

	it.each([
		"calculating insulin response",
		"predicts your insulin",
		"measures insulin response",
		"insulin resistance score",
		"glucose prediction",
		"diagnosis",
	])("never contains %s", (phrase) => {
		expect(allCopy).not.toContain(phrase);
	});

	it("only uses medical advice, treatment, and insulin-resistance wording in negative disclaimers", () => {
		expect(APP_DISCLAIMER).toContain("is not medical advice");
		expect(APP_DISCLAIMER).toContain("Do not use it to make insulin dosing or treatment decisions");
		expect(CHRONIC_TREND_DISCLAIMER).toContain("It is not a measure of insulin resistance");
		expect(allCopy.split("medical advice").length - 1).toBe(1);
		expect(allCopy.split("treatment").length - 1).toBe(1);
		expect(allCopy.split("insulin resistance").length - 1).toBe(1);
	});
});
