import { beforeEach, describe, expect, it } from "vitest";

import { buildCreateMealPayload, mapDraftMealItemToCreatePayload, normalizeAiExtractedItem } from "./api";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";
import { updateMealItemFii } from "../utils/fiiTrustBoundary";

const aiInput = {
	name: "synthetic yogurt bowl",
	quantity: 1,
	unit: "serving",
	kcalPerUnit: 210,
	carb_g: 28,
	protein_g: 12,
	fat_g: 6,
	satFat_g: 2,
	gi: 38,
	fii: 91,
};

const mealWith = (component: MealItem): Meal => ({
	id: "draft-1",
	image: null,
	name: "Synthetic meal",
	timestamp: 1,
	items: [component],
});

describe("Campaign B provenance and create-payload trust boundary", () => {
	beforeEach(() => useCurrentMealStore.setState({ meal: mealWith(normalizeAiExtractedItem(aiInput)) }));

	it("stamps normalized AI components as AI-proposed without overloading canonical source or accepting AI FII", () => {
		const normalized = normalizeAiExtractedItem(aiInput);
		expect(normalized.draftProvenance).toBe("ai_proposed");
		expect(normalized).not.toHaveProperty("source");
		expect(normalized).not.toHaveProperty("fii");
	});

	it("omits draft provenance and needs-review state from an item payload", () => {
		const component = { ...normalizeAiExtractedItem(aiInput), needsReview: { previousName: "old yogurt" } };
		const payload = mapDraftMealItemToCreatePayload(component);
		expect(payload).not.toHaveProperty("draftProvenance");
		expect(payload).not.toHaveProperty("needsReview");
	});

	it("omits all draft-only fields from the complete create-meal payload without changing its shape", () => {
		const component = { ...normalizeAiExtractedItem(aiInput), needsReview: { previousName: "old yogurt" } };
		expect(buildCreateMealPayload(mealWith(component))).toEqual({
			meal_name: "Synthetic meal",
			items: [{ name: "synthetic yogurt bowl", quantity: 1, unit: "serving", kcalPerUnit: 210, carb_g: 28, protein_g: 12, fat_g: 6, satFat_g: 2, gi: 38 }],
		});
	});

	it("never promotes or restores discarded AI FII after rename and nutrition confirmation", () => {
		const store = useCurrentMealStore.getState();
		store.updateMealItem(store.meal.items[0].id, "name", "synthetic oat bowl");
		useCurrentMealStore.getState().updateMealItem(store.meal.items[0].id, "kcalPerServing", 220);
		const reviewed = useCurrentMealStore.getState().meal.items[0];
		expect(reviewed.draftProvenance).toBe("user_reviewed");
		expect(reviewed).not.toHaveProperty("fii");
		expect(mapDraftMealItemToCreatePayload(reviewed)).not.toHaveProperty("fii");
	});

	it("continues to send only a finite positive FII explicitly typed through the existing trust path", () => {
		const userEnteredFii = updateMealItemFii(normalizeAiExtractedItem(aiInput), "47");
		expect(mapDraftMealItemToCreatePayload(userEnteredFii)).toMatchObject({ fii: 47 });
	});
});
