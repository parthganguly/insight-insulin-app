import { describe, expect, it } from "vitest";

import { Meal } from "../types/Meal";
import { MealItem, Unit } from "../types/MealItem";
import {
	getItemCalorieShares,
	getResultCompositionLine,
	getResultLoggedLine,
	getVisibleDrivers,
	hasCalorieShareBars,
	orderItemsByDriver,
} from "./resultPresentation";

// Annotated Journal J5 display helpers. Synthetic data only — no real user or
// health data. These helpers must never derive a score, a load, or a quality
// judgement; the assertions below pin them to plain display arithmetic.

const item = (overrides: Partial<MealItem> = {}): MealItem => ({
	id: "item-1",
	name: "Steamed rice",
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount: 2,
	kcalPerServing: 200,
	carbPerServing_g: 45,
	satFatPerServing_g: 0.2,
	gi: 60,
	...overrides,
});

const meal = (overrides: Partial<Meal> = {}): Meal => ({
	id: "saved-meal-1",
	image: null,
	name: "Synthetic Demo Bowl",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	items: [item()],
	...overrides,
});

describe("getResultCompositionLine", () => {
	it("prefers the canonical backend totals and rounds them", () => {
		expect(getResultCompositionLine(meal({ kcal_total: 700.4, carbs_total: 89.6 }))).toBe("1 item · ≈ 700 kcal · 90 g carbs");
	});

	it("pluralises the item count", () => {
		const twoItems = meal({ kcal_total: 700, carbs_total: 90, items: [item(), item({ id: "item-2" })] });
		expect(getResultCompositionLine(twoItems)).toBe("2 items · ≈ 700 kcal · 90 g carbs");
	});

	it("falls back to item sums when the backend totals are absent", () => {
		// 200 kcal * 2 servings = 400 kcal; 45 g * 2 = 90 g carbs.
		expect(getResultCompositionLine(meal())).toBe("1 item · ≈ 400 kcal · 90 g carbs");
	});

	it("handles a saved meal with no items", () => {
		expect(getResultCompositionLine(meal({ items: [] }))).toBe("0 items · ≈ 0 kcal · 0 g carbs");
	});
});

describe("getResultLoggedLine", () => {
	it("labels the logged moment and carries the year", () => {
		const line = getResultLoggedLine(meal());
		expect(line.startsWith("Logged ")).toBe(true);
		expect(line).toContain(" · ");
		expect(line).toMatch(/\b2026\b/);
	});

	it("tracks the stored timestamp", () => {
		const older = getResultLoggedLine(meal({ timestamp: Date.parse("2024-01-05T08:30:00Z") }));
		expect(older).toMatch(/\b2024\b/);
		expect(older).not.toBe(getResultLoggedLine(meal()));
	});
});

describe("orderItemsByDriver", () => {
	const rice = item({ id: "rice", name: "Steamed rice" });
	const sauce = item({ id: "sauce", name: "Sweet sauce" });
	const salad = item({ id: "salad", name: "Side salad" });

	it("reads driver-matched items first, in the backend's driver order", () => {
		const ordered = orderItemsByDriver([salad, rice, sauce], ["sweet sauce", "steamed rice"]);
		expect(ordered.map((entry) => entry.id)).toEqual(["sauce", "rice", "salad"]);
	});

	it("matches case-insensitively and ignores surrounding whitespace", () => {
		const ordered = orderItemsByDriver([salad, rice], ["  STEAMED RICE  "]);
		expect(ordered.map((entry) => entry.id)).toEqual(["rice", "salad"]);
	});

	it("keeps every item when a driver matches nothing", () => {
		const ordered = orderItemsByDriver([rice, salad], ["ghee", "steamed rice"]);
		expect(ordered.map((entry) => entry.id)).toEqual(["rice", "salad"]);
	});

	it("preserves stored order when there are no drivers", () => {
		expect(orderItemsByDriver([salad, rice, sauce]).map((entry) => entry.id)).toEqual(["salad", "rice", "sauce"]);
	});

	it("never duplicates or drops an item, even when two drivers name the same food", () => {
		const ordered = orderItemsByDriver([rice, salad], ["steamed rice", "steamed rice"]);
		expect(ordered.map((entry) => entry.id)).toEqual(["rice", "salad"]);
		expect(ordered).toHaveLength(2);
	});

	it("claims repeated same-named items one driver at a time", () => {
		const riceAgain = item({ id: "rice-2", name: "Steamed rice" });
		const ordered = orderItemsByDriver([salad, rice, riceAgain], ["steamed rice", "steamed rice"]);
		expect(ordered.map((entry) => entry.id)).toEqual(["rice", "rice-2", "salad"]);
	});
});

describe("getItemCalorieShares", () => {
	it("splits the meal's item calories into shares that total one", () => {
		const shares = getItemCalorieShares([
			item({ id: "a", kcalPerServing: 300, amount: 1 }),
			item({ id: "b", kcalPerServing: 100, amount: 1 }),
		]);

		expect(shares.map((share) => share.kcal)).toEqual([300, 100]);
		expect(shares[0].fraction).toBeCloseTo(0.75, 10);
		expect(shares[1].fraction).toBeCloseTo(0.25, 10);
		expect(shares.reduce((sum, share) => sum + share.fraction, 0)).toBeCloseTo(1, 10);
	});

	it("rounds displayed calories but keeps the share unrounded", () => {
		const shares = getItemCalorieShares([
			item({ id: "a", kcalPerServing: 100.4, amount: 1 }),
			item({ id: "b", kcalPerServing: 100.4, amount: 1 }),
		]);

		expect(shares[0].kcal).toBe(100);
		expect(shares[0].fraction).toBeCloseTo(0.5, 10);
	});

	it("gives a zero-calorie item a zero share without disturbing the others", () => {
		const shares = getItemCalorieShares([
			item({ id: "a", kcalPerServing: 400, amount: 1 }),
			item({ id: "zero", kcalPerServing: 0, amount: 3 }),
		]);

		expect(shares[1].kcal).toBe(0);
		expect(shares[1].fraction).toBe(0);
		expect(shares[0].fraction).toBeCloseTo(1, 10);
	});

	it("returns zero shares — never NaN — when the whole meal has no calories", () => {
		const shares = getItemCalorieShares([item({ id: "a", kcalPerServing: 0 }), item({ id: "b", kcalPerServing: 0 })]);
		expect(shares.every((share) => share.fraction === 0)).toBe(true);
		expect(shares.every((share) => Number.isFinite(share.fraction))).toBe(true);
	});

	it("treats a non-finite or negative item value as no contribution", () => {
		const shares = getItemCalorieShares([
			item({ id: "a", kcalPerServing: 200, amount: 1 }),
			item({ id: "bad", kcalPerServing: Number.NaN, amount: 1 }),
			item({ id: "negative", kcalPerServing: -50, amount: 1 }),
		]);

		expect(shares[1].fraction).toBe(0);
		expect(shares[2].fraction).toBe(0);
		expect(shares[0].fraction).toBeCloseTo(1, 10);
	});

	it("returns nothing for an empty meal", () => {
		expect(getItemCalorieShares([])).toEqual([]);
	});
});

describe("hasCalorieShareBars", () => {
	it("is true when at least one item contributes calories", () => {
		expect(hasCalorieShareBars([item({ kcalPerServing: 0 }), item({ id: "b", kcalPerServing: 120, amount: 1 })])).toBe(true);
	});

	it("is false for a calorie-free or empty meal, so no meaningless bars are drawn", () => {
		expect(hasCalorieShareBars([item({ kcalPerServing: 0 })])).toBe(false);
		expect(hasCalorieShareBars([])).toBe(false);
	});
});

describe("getVisibleDrivers", () => {
	it("trims, drops blanks, and shows at most three", () => {
		expect(getVisibleDrivers([" rice ", "", "   ", "sauce", "ghee", "oil"])).toEqual(["rice", "sauce", "ghee"]);
	});

	it("handles a meal with no driver field", () => {
		expect(getVisibleDrivers(undefined)).toEqual([]);
	});
});
