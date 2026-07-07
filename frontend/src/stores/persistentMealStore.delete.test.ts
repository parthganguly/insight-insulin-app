import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteMealEverywhere, resolveMealDeletionTarget, syncMealsFromBackend, usePersistentMealStore } from "./persistentMealStore";
import { buildDraftFromSavedMeal } from "../utils/fiiTrustBoundary";
import { Meal } from "../types/Meal";

// Persistent meal delete integrity (issue #78): a backend-persisted meal is
// deleted on the backend first, and the local copy is only removed once the
// backend deletion succeeded, so hydration can never resurrect it. Drafts
// opened from a saved meal carry source_meal_id and delete the original.
// Synthetic demo-shaped data only. No real user or health data.

const backendMealBody = (id: string, name: string, createdAt: string) => ({
	id,
	created_at: createdAt,
	meal_name: name,
	items: [
		{
			name: "rolled oats",
			quantity: 1,
			unit: "serving",
			kcalPerUnit: 250,
			carb_g: 40,
			protein_g: 8,
			fat_g: 5,
			satFat_g: 1,
			gi: 55,
			kcal_item: 250,
			insulin_load: 90,
			confidence: 0.8,
			fii_source: "fii_table",
			why: "matched FII table entry",
		},
	],
	insulin_load_total: 90,
	acute_score: 38,
	kcal_total: 250,
	carbs_total: 40,
	protein_total: 8,
	fat_total: 5,
	estimate_quality: "high",
	main_insulin_drivers: ["rolled oats"],
});

const persistedMeal = (id: string, name: string): Meal => ({
	id,
	image: null,
	name,
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	items: [],
	backend_created_at: "2026-07-01T12:00:00Z",
});

const localOnlyMeal = (id: string, name: string): Meal => ({
	id,
	image: null,
	name,
	timestamp: Date.parse("2026-07-03T10:00:00Z"),
	items: [],
});

describe("deleteMealEverywhere (issue #78 delete integrity)", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("deletes a backend-persisted meal on the backend before removing it locally", async () => {
		const meal = persistedMeal("demo-meal-1", "Demo: Overnight oats");
		usePersistentMealStore.setState({ meals: [meal] });
		const fetchMock = vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) }));
		vi.stubGlobal("fetch", fetchMock);

		const result = await deleteMealEverywhere(meal);

		expect(result.deleted).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/meals\/demo-meal-1$/), { method: "DELETE" });
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});

	it("keeps the meal and reports failure when the backend delete fails", async () => {
		const meal = persistedMeal("demo-meal-1", "Demo: Overnight oats");
		usePersistentMealStore.setState({ meals: [meal] });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ detail: "boom" }) })),
		);

		const result = await deleteMealEverywhere(meal);

		expect(result.deleted).toBe(false);
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
		expect(usePersistentMealStore.getState().meals[0].id).toBe("demo-meal-1");
	});

	it("keeps the meal and reports failure when the backend is unreachable", async () => {
		const meal = persistedMeal("demo-meal-1", "Demo: Overnight oats");
		usePersistentMealStore.setState({ meals: [meal] });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("backend unreachable");
			}),
		);

		const result = await deleteMealEverywhere(meal);

		expect(result.deleted).toBe(false);
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
	});

	it("treats a backend 404 as already deleted and removes the local copy", async () => {
		const meal = persistedMeal("demo-meal-1", "Demo: Overnight oats");
		usePersistentMealStore.setState({ meals: [meal] });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ detail: "Meal not found" }) })),
		);

		const result = await deleteMealEverywhere(meal);

		expect(result.deleted).toBe(true);
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});

	it("deletes a local-only meal without calling the backend", async () => {
		const meal = localOnlyMeal("local-only-1", "Local-only meal");
		usePersistentMealStore.setState({ meals: [meal] });
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = await deleteMealEverywhere(meal);

		expect(result.deleted).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});

	it("deletes the persisted original when given a draft opened from a saved meal", async () => {
		const saved = persistedMeal("demo-meal-1", "Demo: Overnight oats");
		usePersistentMealStore.setState({ meals: [saved] });
		const draft = buildDraftFromSavedMeal(saved);
		expect(resolveMealDeletionTarget(draft)).toBe(saved);

		const fetchMock = vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) }));
		vi.stubGlobal("fetch", fetchMock);

		const result = await deleteMealEverywhere(draft);

		expect(result.deleted).toBe(true);
		// The backend delete targets the ORIGINAL saved meal id, not the draft id.
		expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/meals\/demo-meal-1$/), { method: "DELETE" });
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});

	it("falls back to a safe local no-op when the draft's source meal is gone", async () => {
		const saved = persistedMeal("demo-meal-1", "Demo: Overnight oats");
		const draft = buildDraftFromSavedMeal(saved);
		usePersistentMealStore.setState({ meals: [] }); // original already deleted
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = await deleteMealEverywhere(draft);

		expect(result.deleted).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});

	it("does not resurrect a deleted meal on the next hydration", async () => {
		const deleted = persistedMeal("demo-meal-1", "Demo: Overnight oats");
		const kept = persistedMeal("demo-meal-2", "Demo: Lentil dal with rice");
		usePersistentMealStore.setState({ meals: [deleted, kept] });

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) })),
		);
		const result = await deleteMealEverywhere(deleted);
		expect(result.deleted).toBe(true);

		// After a successful backend delete, GET /meals no longer returns the meal.
		vi.unstubAllGlobals();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: true, json: async () => [backendMealBody("demo-meal-2", "Demo: Lentil dal with rice", "2026-07-02T08:00:00Z")] })),
		);

		const hydrated = await syncMealsFromBackend();

		expect(hydrated).toBe(true);
		const meals = usePersistentMealStore.getState().meals;
		expect(meals.map((meal) => meal.id)).toEqual(["demo-meal-2"]);
	});
});
