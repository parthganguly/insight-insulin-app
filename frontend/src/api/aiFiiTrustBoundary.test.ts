import { describe, expect, it } from "vitest";

import { mapDraftMealItemToCreatePayload, normalizeAiExtractedItem } from "./api";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";
import { buildDraftFromSavedMeal, normalizeExplicitFii, updateMealItemFii } from "../utils/fiiTrustBoundary";

const aiItem = {
	name: "plain yogurt",
	quantity: 1,
	unit: "serving",
	kcalPerUnit: 180,
	carb_g: 16,
	protein_g: 8,
	fat_g: 4,
	satFat_g: 2,
	gi: 35,
};

describe("AI FII trust boundary", () => {
	it("keeps missing AI FII absent instead of defaulting it to zero", () => {
		const normalized = normalizeAiExtractedItem(aiItem);

		expect(normalized).not.toHaveProperty("fii");
		expect(mapDraftMealItemToCreatePayload(normalized)).not.toHaveProperty("fii");
	});

	it("discards legacy AI-guessed FII values", () => {
		const normalized = normalizeAiExtractedItem({ ...aiItem, fii: 87 });

		expect(normalized).not.toHaveProperty("fii");
		expect(mapDraftMealItemToCreatePayload(normalized)).not.toHaveProperty("fii");
	});

	it("sends FII after an explicit user edit adds the field", () => {
		const normalized = normalizeAiExtractedItem(aiItem);
		const userEdited = { ...normalized, fii: 50 };

		expect(mapDraftMealItemToCreatePayload(userEdited)).toMatchObject({ fii: 50 });
	});

	it.each([undefined, null, "", "   ", 0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("omits invalid FII payload value %s", (fii) => {
		const normalized = normalizeAiExtractedItem(aiItem);
		const itemWithInvalidFii = { ...normalized, fii } as unknown as MealItem;

		expect(normalizeExplicitFii(fii)).toBeUndefined();
		expect(mapDraftMealItemToCreatePayload(itemWithInvalidFii)).not.toHaveProperty("fii");
	});

	it.each([50, "50"])("includes finite positive manual FII %s", (fii) => {
		const normalized = normalizeAiExtractedItem(aiItem);
		const userEdited = { ...normalized, fii } as unknown as MealItem;

		expect(mapDraftMealItemToCreatePayload(userEdited)).toMatchObject({ fii: 50 });
	});

	it("creates manual empty items without FII", () => {
		useCurrentMealStore.getState().resetMeal();
		useCurrentMealStore.getState().addEmptyMealItem();

		expect(useCurrentMealStore.getState().meal.items[0]).not.toHaveProperty("fii");
	});

	it("removes FII when the edit field is cleared", () => {
		const item = { ...normalizeAiExtractedItem(aiItem), fii: 50 };

		expect(updateMealItemFii(item, "")).not.toHaveProperty("fii");
		expect(updateMealItemFii(item, 0)).not.toHaveProperty("fii");
	});

	it("drops saved FII and provenance when rebuilding a re-log draft", () => {
		const savedMeal: Meal = {
			id: "saved-meal",
			image: null,
			name: "Saved meal",
			timestamp: 1,
			items: [{ ...normalizeAiExtractedItem(aiItem), fii: 87, source: "user_confirmed", why: "stale" }],
		};

		const draft = buildDraftFromSavedMeal(savedMeal);

		expect(draft.items[0]).not.toHaveProperty("fii");
		expect(draft.items[0]).not.toHaveProperty("source");
		expect(draft.items[0]).not.toHaveProperty("why");
		expect(mapDraftMealItemToCreatePayload(draft.items[0])).not.toHaveProperty("fii");
	});
});
