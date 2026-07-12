import { describe, expect, it } from "vitest";

import {
	ACUTE_SCORE_SCALE_EXPLAINER,
	getAcuteRingValue,
	getAcuteScoreAriaLabel,
	getAcuteScoreCaption,
	getAcuteScoreDetailLine,
	getAcuteScoreText,
	isAboveAcuteReference,
} from "./acuteScoreDisplay";

// Durable truth-in-presentation matrix (issue #93). These scores cover the
// audit's required boundary set: undefined, non-finite, negative, 0, the old
// (retired) 35/60 tier boundaries, the internal reference at 100/101, real
// demo outputs (189), and extreme values (500, 1580, near-max finite).
const EXTREME_FINITE = Number.MAX_SAFE_INTEGER;

describe("getAcuteRingValue (ring caps at 100, visual guide only)", () => {
	it.each([
		[undefined, 0],
		[Number.NaN, 0],
		[Number.POSITIVE_INFINITY, 0],
		[Number.NEGATIVE_INFINITY, 0],
		[-5, 0],
		[0, 0],
		[34, 34],
		[35, 35],
		[60, 60],
		[75, 75],
		[100, 100],
		[101, 100],
		[189, 100],
		[500, 100],
		[1580, 100],
		[EXTREME_FINITE, 100],
	])("maps %s to %s for ring geometry", (score, expected) => {
		expect(getAcuteRingValue(score)).toBe(expected);
	});
});

describe("getAcuteScoreText (raw visible number is never capped)", () => {
	it.each([
		[undefined, "--"],
		[Number.NaN, "--"],
		[Number.POSITIVE_INFINITY, "--"],
		[-5, "-5"],
		[0, "0"],
		[34, "34"],
		[35, "35"],
		[60, "60"],
		[99.6, "100"],
		[100, "100"],
		[101, "101"],
		[189, "189"],
		[500, "500"],
		[1580, "1580"],
		[EXTREME_FINITE, String(EXTREME_FINITE)],
	])("formats %s as %s without capping", (score, expected) => {
		expect(getAcuteScoreText(score)).toBe(expected);
	});
});

describe("isAboveAcuteReference", () => {
	it.each([
		[0, false],
		[34, false],
		[35, false],
		[60, false],
		[100, false],
		[100.4, false],
		[101, true],
		[189, true],
		[500, true],
		[1580, true],
		[EXTREME_FINITE, true],
		[undefined, false],
		[Number.NaN, false],
		[-5, false],
	])("classifies %s as %s", (score, expected) => {
		expect(isAboveAcuteReference(score)).toBe(expected);
	});
});

describe("getAcuteScoreCaption", () => {
	it.each([
		[0, "score"],
		[34, "score"],
		[35, "score"],
		[60, "score"],
		[75, "score"],
		[100, "score"],
		[101, "above ref"],
		[189, "above ref"],
		[500, "above ref"],
		[1580, "above ref"],
		[undefined, "score"],
	])("labels %s as %s", (score, expected) => {
		expect(getAcuteScoreCaption(score)).toBe(expected);
	});
});

describe("getAcuteScoreDetailLine", () => {
	it("uses exact internal-reference wording for scores at or below 100", () => {
		expect(getAcuteScoreDetailLine(0)).toBe("Score: 0 · internal reference: 100");
		expect(getAcuteScoreDetailLine(34)).toBe("Score: 34 · internal reference: 100");
		expect(getAcuteScoreDetailLine(35)).toBe("Score: 35 · internal reference: 100");
		expect(getAcuteScoreDetailLine(60)).toBe("Score: 60 · internal reference: 100");
		expect(getAcuteScoreDetailLine(75)).toBe("Score: 75 · internal reference: 100");
		expect(getAcuteScoreDetailLine(100)).toBe("Score: 100 · internal reference: 100");
	});

	it("uses exact above-reference wording, keeping the raw number", () => {
		expect(getAcuteScoreDetailLine(101)).toBe("Score: 101 · above internal reference (100)");
		expect(getAcuteScoreDetailLine(189)).toBe("Score: 189 · above internal reference (100)");
		expect(getAcuteScoreDetailLine(500)).toBe("Score: 500 · above internal reference (100)");
		expect(getAcuteScoreDetailLine(1580)).toBe("Score: 1580 · above internal reference (100)");
	});

	it("never calls the reference a meal", () => {
		for (const score of [0, 34, 35, 60, 100, 101, 189, 500, 1580]) {
			expect(getAcuteScoreDetailLine(score).toLowerCase()).not.toContain("reference meal");
			expect(getAcuteScoreDetailLine(score).toLowerCase()).not.toContain("typical");
		}
	});
});

describe("getAcuteScoreAriaLabel (accessible meaning)", () => {
	it("uses exact at-or-below-reference labels that disclose the uncalibrated reference", () => {
		expect(getAcuteScoreAriaLabel(75)).toBe(
			"Estimated meal insulin demand score 75. The internal reference is 100 and has not yet been calibrated; the score is not a percentage. The ring is a visual guide only.",
		);
		expect(getAcuteScoreAriaLabel(100)).toBe(
			"Estimated meal insulin demand score 100. The internal reference is 100 and has not yet been calibrated; the score is not a percentage. The ring is a visual guide only.",
		);
	});

	it("uses exact above-reference labels that keep the raw number and disclose the capped ring", () => {
		for (const score of [101, 189, 500, 1580]) {
			expect(getAcuteScoreAriaLabel(score)).toBe(
				`Estimated meal insulin demand score ${score}. This is above the internal reference of 100, which has not yet been calibrated. The score is not a percentage and can exceed 100; the ring caps at 100 and is a visual guide only.`,
			);
		}
	});

	it("uses the exact unknown-score label for undefined and non-finite scores", () => {
		expect(getAcuteScoreAriaLabel(undefined)).toBe("Estimated meal insulin demand score not available for this meal.");
		expect(getAcuteScoreAriaLabel(Number.NaN)).toBe("Estimated meal insulin demand score not available for this meal.");
		expect(getAcuteScoreAriaLabel(Number.POSITIVE_INFINITY)).toBe("Estimated meal insulin demand score not available for this meal.");
	});
});

describe("approved acute-score copy (issue #93 truth guard)", () => {
	const copyWithout = (text: string, phrase: string): string => text.replaceAll(phrase, "");

	it("keeps the scale explainer exact", () => {
		expect(ACUTE_SCORE_SCALE_EXPLAINER).toBe(
			"This score compares estimated meal insulin demand with an internal reference set to 100. The reference has not yet been calibrated to typical meals or personal responses. It is not a percentage and can exceed 100.",
		);
	});

	it("describes the reference as internal and uncalibrated", () => {
		expect(ACUTE_SCORE_SCALE_EXPLAINER).toContain("internal reference");
		expect(ACUTE_SCORE_SCALE_EXPLAINER).toContain("has not yet been calibrated");
	});

	it("contains no misleading empirical or biological wording", () => {
		const exportedCopy = [
			ACUTE_SCORE_SCALE_EXPLAINER,
			getAcuteScoreText(undefined),
			getAcuteScoreCaption(75),
			getAcuteScoreCaption(101),
			getAcuteScoreDetailLine(75),
			getAcuteScoreDetailLine(1580),
			getAcuteScoreAriaLabel(undefined),
			getAcuteScoreAriaLabel(75),
			getAcuteScoreAriaLabel(1580),
		]
			.join(" ")
			.toLowerCase();
		const copyWithoutApprovedPhrase = copyWithout(exportedCopy, "not a percentage");
		// "typical meals" may only appear inside the negative calibration
		// disclaimer ("has not yet been calibrated to typical meals").
		const copyWithoutCalibrationDisclaimer = copyWithout(exportedCopy, "not yet been calibrated to typical meals");

		expect(copyWithoutApprovedPhrase).not.toContain("percentage");
		expect(copyWithoutCalibrationDisclaimer).not.toContain("typical");
		for (const forbidden of ["%", "risk", "danger", "dangerous", "spike", "maximum", "max score", "average meal", "safe", "healthy", "reference meal"]) {
			expect(exportedCopy).not.toContain(forbidden);
		}
	});
});
