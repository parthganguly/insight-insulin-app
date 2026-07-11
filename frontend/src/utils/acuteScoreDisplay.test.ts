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

describe("getAcuteRingValue", () => {
	it.each([
		[undefined, 0],
		[Number.NaN, 0],
		[Number.POSITIVE_INFINITY, 0],
		[-5, 0],
		[0, 0],
		[75, 75],
		[100, 100],
		[101, 100],
		[300, 100],
		[500, 100],
		[1_000_000_000, 100],
	])("maps %s to %s for ring geometry", (score, expected) => {
		expect(getAcuteRingValue(score)).toBe(expected);
	});
});

describe("getAcuteScoreText", () => {
	it.each([
		[undefined, "--"],
		[Number.NaN, "--"],
		[75, "75"],
		[300, "300"],
		[99.6, "100"],
	])("formats %s as %s without capping", (score, expected) => {
		expect(getAcuteScoreText(score)).toBe(expected);
	});
});

describe("isAboveAcuteReference", () => {
	it.each([
		[100, false],
		[100.4, false],
		[101, true],
		[500, true],
		[undefined, false],
		[Number.NaN, false],
	])("classifies %s as %s", (score, expected) => {
		expect(isAboveAcuteReference(score)).toBe(expected);
	});
});

describe("getAcuteScoreCaption", () => {
	it.each([
		[75, "score"],
		[100, "score"],
		[101, "above ref"],
		[undefined, "score"],
	])("labels %s as %s", (score, expected) => {
		expect(getAcuteScoreCaption(score)).toBe(expected);
	});
});

describe("getAcuteScoreDetailLine", () => {
	it("uses exact reference wording for scores at or below 100", () => {
		expect(getAcuteScoreDetailLine(75)).toBe("Score: 75 · reference meal: 100");
		expect(getAcuteScoreDetailLine(100)).toBe("Score: 100 · reference meal: 100");
	});

	it("uses exact above-reference wording without capping", () => {
		expect(getAcuteScoreDetailLine(300)).toBe("Score: 300 · above reference meal (100)");
	});
});

describe("getAcuteScoreAriaLabel", () => {
	it("uses exact known-score labels", () => {
		expect(getAcuteScoreAriaLabel(75)).toBe("Estimated meal insulin demand score 75. The reference meal is 100.");
		expect(getAcuteScoreAriaLabel(100)).toBe("Estimated meal insulin demand score 100. The reference meal is 100.");
		expect(getAcuteScoreAriaLabel(300)).toBe(
			"Estimated meal insulin demand score 300. This is above the reference meal of 100. The score is not a percentage and can exceed 100; the ring is a visual guide only.",
		);
	});

	it("uses the exact unknown-score label", () => {
		expect(getAcuteScoreAriaLabel(undefined)).toBe("Estimated meal insulin demand score not available for this meal.");
	});
});

describe("approved acute-score copy", () => {
	it("keeps the scale explainer exact", () => {
		expect(ACUTE_SCORE_SCALE_EXPLAINER).toBe("This relative score compares estimated meal insulin demand with a reference meal set to 100. It is not a percentage and can exceed 100.");
	});

	it("contains no forbidden wording outside the approved percentage phrase", () => {
		const exportedCopy = [
			ACUTE_SCORE_SCALE_EXPLAINER,
			getAcuteScoreText(undefined),
			getAcuteScoreCaption(75),
			getAcuteScoreCaption(101),
			getAcuteScoreDetailLine(75),
			getAcuteScoreDetailLine(300),
			getAcuteScoreAriaLabel(undefined),
			getAcuteScoreAriaLabel(75),
			getAcuteScoreAriaLabel(300),
		]
			.join(" ")
			.toLowerCase();
		const copyWithoutApprovedPhrase = exportedCopy.replaceAll("not a percentage", "");

		expect(exportedCopy.match(/not a percentage/g)).toHaveLength(2);
		expect(copyWithoutApprovedPhrase).not.toContain("percentage");
		for (const forbidden of ["%", "risk", "danger", "dangerous", "spike", "maximum", "max score"]) {
			expect(exportedCopy).not.toContain(forbidden);
		}
	});
});
