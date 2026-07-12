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
		// The negation distributes across the list: "It does not measure or
		// predict ... , diagnose any condition, or provide medical advice."
		expect(APP_DISCLAIMER).toContain("It does not measure or predict your personal insulin or glucose response, diagnose any condition, or provide medical advice.");
		expect(APP_DISCLAIMER).toContain("Do not use it for insulin dosing or treatment decisions");
		expect(CHRONIC_TREND_DISCLAIMER).toContain("It is not a measure of insulin resistance");
		expect(allCopy.split("medical advice").length - 1).toBe(1);
		expect(allCopy.split("treatment").length - 1).toBe(1);
		expect(allCopy.split("insulin resistance").length - 1).toBe(1);
	});
});

describe("dataset overclaim guard (issue #93)", () => {
	// The live dataset is ten hand-entered `starter_placeholder` rows: no value
	// traces to a cited primary study and the confidences are not
	// measurement-derived. Copy asserting published / population-level /
	// population-average / validated / measured data therefore claims evidence
	// the repository does not have. These tests fail if such wording returns.
	const SCORE_COPY = [APP_DISCLAIMER, MEAL_SCORE_DISCLAIMER, CHRONIC_TREND_DISCLAIMER].join(" ");

	// Positive claims are forbidden; the same words are allowed when the
	// sentence explicitly negates them ("not yet scientifically validated").
	const UNSUPPORTED_DATASET_CLAIMS: RegExp[] = [
		/published (population|food|data)/i,
		/population-level/i,
		/population-average/i,
		/population average/i,
		/(?<!not yet |not )scientifically validated/i,
		/(?<!not yet |not )clinically validated/i,
		/measured (insulin|food|data)/i,
		/validated dataset/i,
		/peer-reviewed/i,
	];

	const findUnsupportedClaims = (text: string): string[] => UNSUPPORTED_DATASET_CLAIMS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);

	it("makes no unsupported dataset claim in any score-facing copy", () => {
		expect(findUnsupportedClaims(SCORE_COPY)).toEqual([]);
	});

	it.each([
		"INSIGHT estimates the relative insulin demand of meals using population-level food data.",
		"Estimated from population-average food insulin index data and your entered portions.",
		"Estimated from published population data.",
		"Built on a validated dataset.",
		"Uses measured insulin values.",
		"Our model is scientifically validated.",
	])("rejects the unsupported claim: %s", (phrase) => {
		expect(findUnsupportedClaims(phrase)).not.toEqual([]);
	});

	it("allows the honest negations the app actually ships", () => {
		expect(findUnsupportedClaims("The dataset and model are not yet scientifically validated.")).toEqual([]);
		expect(findUnsupportedClaims("The dataset and model are not yet validated.")).toEqual([]);
	});

	it("admits the starter dataset and the heuristic fallbacks", () => {
		expect(APP_DISCLAIMER).toContain("limited starter set of food insulin-index values");
		expect(APP_DISCLAIMER).toContain("heuristic estimates when a suitable food value is unavailable");
		expect(APP_DISCLAIMER).toContain("not yet scientifically validated");
		expect(MEAL_SCORE_DISCLAIMER).toContain("limited food insulin-index dataset");
		expect(MEAL_SCORE_DISCLAIMER).toContain("heuristic fallbacks");
		expect(MEAL_SCORE_DISCLAIMER).toContain("not yet validated");
	});

	it("keeps every non-claim the app must always make", () => {
		expect(APP_DISCLAIMER).toContain("does not measure or predict your personal insulin or glucose response");
		expect(APP_DISCLAIMER).toContain("diagnose any condition");
		expect(APP_DISCLAIMER).toContain("provide medical advice");
		expect(APP_DISCLAIMER).toContain("Do not use it for insulin dosing or treatment decisions");
		expect(MEAL_SCORE_DISCLAIMER).toContain("relative comparison tool");
		expect(MEAL_SCORE_DISCLAIMER).toContain("not a prediction of your body’s response");
	});

	it("describes the trend as an energy-normalized index that can exceed 100", () => {
		expect(CHRONIC_TREND_DISCLAIMER).toContain("energy-normalized insulin-demand index");
		expect(CHRONIC_TREND_DISCLAIMER).toContain("can exceed 100");
		expect(CHRONIC_TREND_DISCLAIMER).toContain("ring caps at 100");
		expect(CHRONIC_TREND_DISCLAIMER).toContain("not a measure of insulin resistance or metabolic health");
		// "percentage" may appear ONLY inside the approved negation ("not a
		// total or a percentage"); strip it, then no positive use may remain.
		const withoutApprovedNegation = CHRONIC_TREND_DISCLAIMER.toLowerCase().replace("not a total or a percentage", "");
		expect(withoutApprovedNegation).not.toContain("percentage");
		expect(withoutApprovedNegation).not.toContain("total daily insulin demand");
		expect(withoutApprovedNegation).not.toContain("average insulin demand per day");
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
