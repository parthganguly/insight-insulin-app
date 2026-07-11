import { describe, expect, it } from "vitest";

import { calculateBmr, calculateTdee } from "./utils";
import { ActivityLevel, Gender } from "./stores/settingsStore";

// Mifflin-St Jeor equation (Mifflin et al., 1990). Audit case from issue #80:
// age 30, weight 70 kg, height 175 cm.
describe("calculateBmr (issue #80)", () => {
	it("computes the published male BMR", () => {
		expect(calculateBmr(70, 175, 30, Gender.Male)).toBeCloseTo(1648.75, 5);
	});

	it("computes the published female BMR", () => {
		expect(calculateBmr(70, 175, 30, Gender.Female)).toBeCloseTo(1482.75, 5);
	});

	it("gives male a higher BMR than female for identical inputs, per the +5 vs -161 constants", () => {
		const male = calculateBmr(70, 175, 30, Gender.Male);
		const female = calculateBmr(70, 175, 30, Gender.Female);
		expect(male - female).toBeCloseTo(166, 5);
	});
});

describe("calculateTdee (issue #80)", () => {
	it("applies the existing sedentary multiplier (1.2) on top of BMR, unchanged", () => {
		expect(calculateTdee(70, 175, 30, ActivityLevel.Sedentary, Gender.Male)).toBe(Math.round(1648.75 * 1.2));
		expect(calculateTdee(70, 175, 30, ActivityLevel.Sedentary, Gender.Female)).toBe(Math.round(1482.75 * 1.2));
	});
});
