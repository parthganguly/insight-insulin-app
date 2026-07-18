import { describe, expect, it } from "vitest";

import { ADVANCED_DETAILS_LABEL, MEAL_NAME_HELPER, isDraftMealItem, validateMealBeforeSave } from "./mealDraftUx";
import { Meal } from "../types/Meal";
import { MealItem, Unit } from "../types/MealItem";

// Manual meal draft/save UX (issue #75). The rejection CONDITIONS here are
// the pre-existing ones from the review screen — empty meal, unnamed item,
// non-positive quantity — only the wording changed. Synthetic data only.

const mealItem = (overrides: Partial<MealItem> = {}): MealItem => ({
	id: "item-1",
	name: "Steamed rice",
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount: 1,
	kcalPerServing: 200,
	carbPerServing_g: 45,
	satFatPerServing_g: 0.2,
	gi: 60,
	...overrides,
});

const draftMeal = (items: MealItem[]): Meal => ({
	id: "meal-1",
	image: null,
	name: "New Meal",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	items,
});

describe("validateMealBeforeSave (issue #75 — same rejections, friendlier copy)", () => {
	it("rejects a meal with no items", () => {
		const message = validateMealBeforeSave(draftMeal([]));
		expect(message).toMatch(/still empty/i);
	});

	it("rejects an item without a name", () => {
		const message = validateMealBeforeSave(draftMeal([mealItem({ name: "   " })]));
		expect(message).toMatch(/needs a name/i);
	});

	it("rejects a zero-quantity draft item and names it in the message", () => {
		const message = validateMealBeforeSave(draftMeal([mealItem({ name: "New Item", amount: 0 })]));
		expect(message).toContain("New Item");
		expect(message).toMatch(/greater than 0/i);
	});

	it("rejects negative and non-finite quantities", () => {
		expect(validateMealBeforeSave(draftMeal([mealItem({ amount: -1 })]))).toMatch(/greater than 0/i);
		expect(validateMealBeforeSave(draftMeal([mealItem({ amount: Number.NaN })]))).toMatch(/greater than 0/i);
	});

	it("accepts a named item with a positive quantity", () => {
		expect(validateMealBeforeSave(draftMeal([mealItem()]))).toBeNull();
	});

	it("reports the first invalid item when several items exist", () => {
		const message = validateMealBeforeSave(draftMeal([mealItem(), mealItem({ id: "item-2", name: "", amount: 0 })]));
		expect(message).toMatch(/Item 2/);
	});
});

describe("isDraftMealItem (issue #75 — untouched drafts read as drafts)", () => {
	it("treats a freshly added empty item as a draft", () => {
		const untouched = mealItem({ name: "New Item", amount: 0, kcalPerServing: 0, carbPerServing_g: 0, satFatPerServing_g: 0 });
		expect(isDraftMealItem(untouched)).toBe(true);
	});

	it("stops treating an item as a draft once nutrition is filled in", () => {
		expect(isDraftMealItem(mealItem())).toBe(false);
	});

	it("still treats zero-amount items as drafts even with per-serving values", () => {
		// amount 0 zeroes every displayed total, which is exactly the state that
		// used to read as a broken "0 kcal" meal.
		expect(isDraftMealItem(mealItem({ amount: 0 }))).toBe(true);
	});
});

describe("Campaign A disclosure copy", () => {
	it("uses the explicit advanced-details label", () => {
		expect(ADVANCED_DETAILS_LABEL).toBe("Advanced details");
	});

	it("states that the meal name is descriptive while items drive the estimate", () => {
		expect(MEAL_NAME_HELPER).toBe("The name is a label. The items below are what the estimate uses.");
	});
});
