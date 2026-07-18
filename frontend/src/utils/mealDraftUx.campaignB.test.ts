import { describe, expect, it } from "vitest";

import { validateMealBeforeSave } from "./mealDraftUx";
import { Meal } from "../types/Meal";
import { MealItem, Unit } from "../types/MealItem";

const item = (id: string, name: string, needsReview = false): MealItem => ({
	id,
	name,
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount: 1,
	kcalPerServing: 200,
	carbPerServing_g: 30,
	satFatPerServing_g: 1,
	gi: 50,
	...(needsReview ? { needsReview: { previousName: `old ${name}` } } : {}),
});

const meal = (items: MealItem[]): Meal => ({ id: "meal-1", image: null, name: "Synthetic meal", timestamp: 1, items });

describe("Campaign B calculate-and-save review validation", () => {
	it("blocks one unresolved component with its current name and an explicit resolution path", () => {
		const message = validateMealBeforeSave(meal([item("1", "vegetable biryani", true)]));
		expect(message).toContain("vegetable biryani");
		expect(message).toContain("Edit a nutrition value");
		expect(message).toContain("These still fit");
	});

	it("coherently identifies every unresolved component", () => {
		const message = validateMealBeforeSave(meal([item("1", "vegetable biryani", true), item("2", "lentil curry", true)]));
		expect(message).toContain("vegetable biryani");
		expect(message).toContain("lentil curry");
	});

	it("continues to block unresolved review after amount and meal-name changes", () => {
		const unresolved = item("1", "vegetable biryani", true);
		unresolved.amount = 0;
		const message = validateMealBeforeSave({ ...meal([unresolved]), name: "Renamed meal label" });
		expect(message).toMatch(/Review the carried nutrition/);
	});

	it("allows the existing valid flow after review state is cleared", () => {
		expect(validateMealBeforeSave(meal([item("1", "vegetable biryani")]))).toBeNull();
	});
});
