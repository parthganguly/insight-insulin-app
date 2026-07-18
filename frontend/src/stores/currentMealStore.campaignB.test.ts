import { beforeEach, describe, expect, it } from "vitest";

import { REVIEW_RESOLVING_NUTRITION_FIELDS, useCurrentMealStore } from "./currentMealStore";
import { Meal } from "../types/Meal";
import { MealItem, Unit } from "../types/MealItem";

const item = (overrides: Partial<MealItem> = {}): MealItem => ({
	id: "component-1",
	name: "chicken biryani",
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount: 1.5,
	kcalPerServing: 420,
	carbPerServing_g: 58,
	proteinPerServing_g: 24,
	fatPerServing_g: 12,
	satFatPerServing_g: 3,
	gi: 62,
	fii: 79,
	source: "exact_fii",
	why: "Synthetic old-identity evidence",
	draftProvenance: "ai_proposed",
	...overrides,
});

const meal = (items: MealItem[] = [item()]): Meal => ({
	id: "draft-1",
	image: null,
	name: "Synthetic dinner",
	timestamp: Date.parse("2026-07-18T12:00:00Z"),
	isAiDraft: true,
	items,
});

const currentItem = () => useCurrentMealStore.getState().meal.items[0];

describe("Campaign B draft-state transitions", () => {
	beforeEach(() => useCurrentMealStore.setState({ meal: meal() }));

	it("stamps a newly added manual component as user-entered", () => {
		useCurrentMealStore.getState().resetMeal();
		useCurrentMealStore.getState().addEmptyMealItem();
		expect(currentItem().draftProvenance).toBe("user_entered");
	});

	it("renames one component, clears only its evidence, preserves every numeric value, and records the old name", () => {
		const untouched = item({ id: "component-2", name: "side salad" });
		useCurrentMealStore.setState({ meal: meal([item(), untouched]) });
		useCurrentMealStore.getState().updateMealItem("component-1", "name", "vegetable biryani");

		expect(currentItem()).toMatchObject({
			name: "vegetable biryani",
			servingSize: 1,
			amount: 1.5,
			kcalPerServing: 420,
			carbPerServing_g: 58,
			proteinPerServing_g: 24,
			fatPerServing_g: 12,
			satFatPerServing_g: 3,
			gi: 62,
			needsReview: { previousName: "chicken biryani" },
		});
		expect(currentItem()).not.toHaveProperty("fii");
		expect(currentItem()).not.toHaveProperty("source");
		expect(currentItem()).not.toHaveProperty("why");
		expect(useCurrentMealStore.getState().meal.items[1]).toEqual(untouched);
	});

	it("transitions an AI proposal to user-reviewed when its identity is edited", () => {
		useCurrentMealStore.getState().updateMealItem("component-1", "name", "vegetable biryani");
		expect(currentItem().draftProvenance).toBe("user_reviewed");
	});

	it("keeps user-entered provenance user-entered after a rename", () => {
		useCurrentMealStore.setState({ meal: meal([item({ draftProvenance: "user_entered" })]) });
		useCurrentMealStore.getState().updateMealItem("component-1", "name", "vegetable biryani");
		expect(currentItem().draftProvenance).toBe("user_entered");
	});

	it("retains the original previous name while the user continues typing the rename", () => {
		useCurrentMealStore.getState().updateMealItem("component-1", "name", "vegetable");
		useCurrentMealStore.getState().updateMealItem("component-1", "name", "vegetable biryani");
		expect(currentItem().needsReview).toEqual({ previousName: "chicken biryani" });
	});

	it("does not invalidate evidence for a no-op component-name update", () => {
		const original = currentItem();
		useCurrentMealStore.getState().updateMealItem("component-1", "name", "chicken biryani");
		expect(currentItem()).toBe(original);
	});

	it("amount-only edits neither create nor resolve identity review", () => {
		useCurrentMealStore.setState({ meal: meal([item({ needsReview: { previousName: "old dish" } })]) });
		useCurrentMealStore.getState().updateMealItem("component-1", "amount", 2);
		expect(currentItem()).toMatchObject({ amount: 2, needsReview: { previousName: "old dish" } });
	});

	it("unit-only edits neither create nor resolve identity review", () => {
		useCurrentMealStore.setState({ meal: meal([item({ needsReview: { previousName: "old dish" } })]) });
		useCurrentMealStore.getState().updateMealItem("component-1", "servingUnit", Unit.Cups);
		expect(currentItem()).toMatchObject({ servingUnit: Unit.Cups, needsReview: { previousName: "old dish" } });
	});

	it("resolves review only for the sealed kcal, macro, saturated-fat, and GI nutrition fields", () => {
		expect(REVIEW_RESOLVING_NUTRITION_FIELDS).toEqual(["kcalPerServing", "carbPerServing_g", "proteinPerServing_g", "fatPerServing_g", "satFatPerServing_g", "gi"]);
		for (const field of REVIEW_RESOLVING_NUTRITION_FIELDS) {
			useCurrentMealStore.setState({ meal: meal([item({ needsReview: { previousName: "old dish" } })]) });
			const currentValue = Number(currentItem()[field]);
			useCurrentMealStore.getState().updateMealItem("component-1", field, currentValue + 1);
			expect(currentItem().needsReview, field).toBeUndefined();
		}
	});

	it("explicit confirmation clears review, transitions AI provenance, and never restores stale evidence", () => {
		const pendingReview = item({ needsReview: { previousName: "old dish" } });
		delete pendingReview.fii;
		delete pendingReview.source;
		delete pendingReview.why;
		useCurrentMealStore.setState({ meal: meal([pendingReview]) });
		useCurrentMealStore.getState().confirmMealItemReview("component-1");
		expect(currentItem().needsReview).toBeUndefined();
		expect(currentItem().draftProvenance).toBe("user_reviewed");
		expect(currentItem()).not.toHaveProperty("fii");
		expect(currentItem()).not.toHaveProperty("source");
		expect(currentItem()).not.toHaveProperty("why");
	});

	it("meal-name edits leave component evidence, provenance, and review state untouched", () => {
		const originalItems = structuredClone(useCurrentMealStore.getState().meal.items);
		useCurrentMealStore.getState().setName("A more descriptive dinner label");
		expect(useCurrentMealStore.getState().meal.items).toEqual(originalItems);
	});
});
