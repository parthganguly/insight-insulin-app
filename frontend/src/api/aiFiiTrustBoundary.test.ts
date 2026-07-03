import { afterEach, describe, expect, it, vi } from "vitest";

import { mapDraftMealItemToCreatePayload, normalizeAiExtractedItem, postMealToAPI } from "./api";
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

describe("backend echo round-trip FII trust boundary", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const stubMealsEcho = (echoedItemFields: Record<string, unknown>) => {
		const responseBody = {
			id: "meal-echo-1",
			created_at: "2026-01-01T12:00:00Z",
			meal_name: "synthetic echo meal",
			items: [
				{
					name: "echo item",
					quantity: 1,
					unit: "serving",
					kcalPerUnit: 220,
					carb_g: 30,
					protein_g: 10,
					fat_g: 5,
					satFat_g: 1.5,
					gi: 55,
					kcal_item: 220,
					insulin_load: 110,
					confidence: 1,
					fii_source: "user_confirmed",
					...echoedItemFields,
				},
			],
			insulin_load_total: 110,
			acute_score: 40,
			kcal_total: 220,
			carbs_total: 30,
			protein_total: 10,
			fat_total: 5,
			estimate_quality: "high",
			main_insulin_drivers: ["echo item"],
		};
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: true, json: async () => responseBody })),
		);
	};

	const postEchoedItem = async (echoedItemFields: Record<string, unknown>) => {
		stubMealsEcho(echoedItemFields);
		const meal = await postMealToAPI({ meal_name: "synthetic echo meal", items: [] });
		return meal.items[0];
	};

	it.each([0, null, "", "junk"])("does not turn echoed fii %j into a provided FII", async (fii) => {
		const item = await postEchoedItem({ fii });

		expect(item.fii).toBeUndefined();
		expect(item.fii_value).toBeUndefined();
		expect(item.fii_value ?? item.fii).toBeUndefined();
	});

	it.each([0, null, "", "junk"])("does not turn echoed fii_value %j into a provided FII", async (fiiValue) => {
		const item = await postEchoedItem({ fii_value: fiiValue });

		expect(item.fii).toBeUndefined();
		expect(item.fii_value).toBeUndefined();
		expect(item.fii_value ?? item.fii).toBeUndefined();
	});

	it("keeps an echoed positive fii after normalization", async () => {
		const item = await postEchoedItem({ fii: 50 });

		expect(item.fii).toBe(50);
	});

	it("keeps an echoed positive fii_value after normalization", async () => {
		const item = await postEchoedItem({ fii_value: 50 });

		expect(item.fii_value).toBe(50);
	});

	it("resolves fii_value before fii, matching backend precedence", async () => {
		const item = await postEchoedItem({ fii_value: 30, fii: 50 });

		expect(item.fii_value ?? item.fii).toBe(30);
	});

	it("falls back to positive fii when echoed fii_value is zero, matching backend precedence", async () => {
		const item = await postEchoedItem({ fii_value: 0, fii: 50 });

		expect(item.fii_value).toBeUndefined();
		expect(item.fii_value ?? item.fii).toBe(50);
	});
});
