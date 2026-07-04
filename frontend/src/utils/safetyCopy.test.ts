import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
	AI_EXTRACTION_PRIVACY_DISCLOSURE,
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
	shouldShowProvidedFiiDisclaimer,
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

describe("provided-FII disclaimer gating", () => {
	it("shows the disclaimer for user_confirmed items regardless of the fii field", () => {
		expect(shouldShowProvidedFiiDisclaimer("user_confirmed", 50)).toBe(true);
		expect(shouldShowProvidedFiiDisclaimer("user_confirmed", undefined)).toBe(true);
	});

	it.each(["exact_fii", "mapped_fii", "macro_fallback", "unknown"])("does not show the disclaimer for %s even when an FII value exists", (source) => {
		expect(shouldShowProvidedFiiDisclaimer(source, 50)).toBe(false);
		expect(shouldShowProvidedFiiDisclaimer(source, undefined)).toBe(false);
	});

	it("shows the disclaimer for draft items where the user explicitly entered an FII", () => {
		// Draft items carry no backend source (manual/re-log drafts) or the
		// frontend "ai" marker; an explicit FII there can only come from a user edit.
		expect(shouldShowProvidedFiiDisclaimer(undefined, 50)).toBe(true);
		expect(shouldShowProvidedFiiDisclaimer("ai", 50)).toBe(true);
	});

	it("does not show the disclaimer for draft items without an entered FII", () => {
		expect(shouldShowProvidedFiiDisclaimer(undefined, undefined)).toBe(false);
		expect(shouldShowProvidedFiiDisclaimer("ai", undefined)).toBe(false);
	});

	it("stays source-based for unrecognized backend tokens instead of trusting a bare fii field", () => {
		expect(shouldShowProvidedFiiDisclaimer("some_future_token", 50)).toBe(false);
		expect(shouldShowProvidedFiiDisclaimer("provided", 50)).toBe(false);
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
		AI_EXTRACTION_PRIVACY_DISCLOSURE,
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

describe("privacy overclaim guard", () => {
	// Guards against unsafe privacy *claims*, not bare words: qualified or
	// negative wording ("Private beta", "not processed locally", "not HIPAA
	// compliant") must pass, while positive overclaims must fail.
	const UNSAFE_PRIVACY_CLAIMS: RegExp[] = [
		/never leaves your device/i,
		/(?<!not\s)processed locally/i,
		/local-only/i,
		/fully private/i,
		/private and secure/i,
		/secure by default/i,
		/(?<!not\s)hipaa[\s-]compliant/i,
		/(?<!not\s)gdpr[\s-]compliant/i,
		/clinical-grade privacy/i,
		/medical-grade privacy/i,
		/we never share your data/i,
		/external service does not store your data/i,
		/end-to-end encrypted/i,
		/safe for medical records/i,
		/(?<!not\s)suitable for sensitive medical records/i,
	];

	const findUnsafePrivacyClaims = (text: string): string[] => UNSAFE_PRIVACY_CLAIMS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);

	const README_BETA_PRIVACY_NOTE =
		"Private beta privacy note: meal data is stored for app functionality; AI meal extraction sends submitted meal images/descriptions to an external AI service. Uploaded images are not retained by the INSIGHT backend by default after extraction. This beta is not intended for sensitive medical records or regulated clinical use.";

	it("states the external AI data flow in the approved disclosure", () => {
		expect(AI_EXTRACTION_PRIVACY_DISCLOSURE).toContain("external AI service");
		expect(AI_EXTRACTION_PRIVACY_DISCLOSURE).toContain("does not retain uploaded images on the backend by default");
		expect(AI_EXTRACTION_PRIVACY_DISCLOSURE).toContain("may process the data according to its own policies");
	});

	it("passes the approved in-app disclosure copy", () => {
		expect(findUnsafePrivacyClaims(AI_EXTRACTION_PRIVACY_DISCLOSURE)).toEqual([]);
	});

	it("passes the approved README beta privacy note", () => {
		const readme = readFileSync(resolve(process.cwd(), "..", "README.md"), "utf8");
		expect(readme).toContain(README_BETA_PRIVACY_NOTE);
		expect(findUnsafePrivacyClaims(README_BETA_PRIVACY_NOTE)).toEqual([]);
	});

	it("passes every approved safety-copy string", () => {
		for (const copy of [APP_DISCLAIMER, MEAL_SCORE_DISCLAIMER, UNKNOWN_ITEMS_NOTICE, ROUGH_ESTIMATE_NOTICE, CHRONIC_TREND_DISCLAIMER, PROVIDED_FII_DISCLAIMER, AI_EXTRACTION_PRIVACY_DISCLOSURE]) {
			expect(findUnsafePrivacyClaims(copy)).toEqual([]);
		}
	});

	it.each([
		"Private beta",
		"This data is not processed locally.",
		"This beta is not HIPAA compliant.",
		"This beta is not GDPR compliant.",
		"This app is not suitable for sensitive medical records.",
		"INSIGHT does not retain uploaded images on the backend by default.",
	])("allows qualified or negative wording: %s", (phrase) => {
		expect(findUnsafePrivacyClaims(phrase)).toEqual([]);
	});

	it.each([
		"Your data never leaves your device.",
		"All images are processed locally.",
		"This app is local-only.",
		"Your meals stay fully private.",
		"Your data is private and secure.",
		"INSIGHT is secure by default.",
		"INSIGHT is HIPAA compliant.",
		"INSIGHT is HIPAA-compliant.",
		"INSIGHT is GDPR compliant.",
		"We offer clinical-grade privacy.",
		"We offer medical-grade privacy.",
		"We never share your data.",
		"The external service does not store your data.",
		"Everything is end-to-end encrypted.",
		"This app is safe for medical records.",
		"This app is suitable for sensitive medical records.",
	])("rejects unsafe privacy overclaims: %s", (phrase) => {
		expect(findUnsafePrivacyClaims(phrase)).not.toEqual([]);
	});
});
