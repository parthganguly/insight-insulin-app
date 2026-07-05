import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { syncMealsFromBackend, usePersistentMealStore } from "./persistentMealStore";
import { Meal } from "../types/Meal";

// Synthetic demo-shaped backend payloads only. No real user or health data.
const backendMealBody = (overrides: Record<string, unknown> = {}) => ({
	id: "demo-meal-1",
	created_at: "2026-07-01T12:00:00Z",
	meal_name: "Demo: Overnight oats",
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
	...overrides,
});

const seededBackendResponse = [backendMealBody(), backendMealBody({ id: "demo-meal-2", created_at: "2026-07-02T08:00:00Z", meal_name: "Demo: Lentil dal with rice" })];

const stubFetchWithMeals = (body: unknown) => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => ({ ok: true, json: async () => body })),
	);
};

const localMeal = (id: string, name: string, image: string | null = null): Meal => ({
	id,
	image,
	name,
	timestamp: Date.parse("2026-07-03T10:00:00Z"),
	items: [],
});

describe("private-beta meal hydration from backend", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("hydrates an empty local store from backend meals", async () => {
		stubFetchWithMeals(seededBackendResponse);

		const hydrated = await syncMealsFromBackend();

		expect(hydrated).toBe(true);
		const meals = usePersistentMealStore.getState().meals;
		expect(meals).toHaveLength(2);
		expect(meals.map((meal) => meal.id).sort()).toEqual(["demo-meal-1", "demo-meal-2"]);
		expect(meals.map((meal) => meal.name)).toContain("Demo: Overnight oats");
		expect(meals.every((meal) => meal.isAiDraft === false)).toBe(true);
	});

	it("does not duplicate meals when hydrating twice", async () => {
		stubFetchWithMeals(seededBackendResponse);

		await syncMealsFromBackend();
		await syncMealsFromBackend();

		const meals = usePersistentMealStore.getState().meals;
		expect(meals).toHaveLength(2);
		expect(new Set(meals.map((meal) => meal.id)).size).toBe(2);
	});

	it("merges by backend id, preserving local-only meals and the locally cached image", async () => {
		usePersistentMealStore.setState({
			meals: [localMeal("demo-meal-1", "Stale local copy", "data:image/jpeg;base64,synthetic"), localMeal("local-only-1", "Local-only meal")],
		});
		stubFetchWithMeals(seededBackendResponse);

		await syncMealsFromBackend();

		const meals = usePersistentMealStore.getState().meals;
		expect(meals).toHaveLength(3);

		const canonical = meals.find((meal) => meal.id === "demo-meal-1");
		// Backend is canonical for meals it returns, but the local image is kept
		// because the backend does not retain images.
		expect(canonical?.name).toBe("Demo: Overnight oats");
		expect(canonical?.image).toBe("data:image/jpeg;base64,synthetic");

		expect(meals.find((meal) => meal.id === "local-only-1")?.name).toBe("Local-only meal");
	});

	it("leaves the local store intact when the backend request fails", async () => {
		usePersistentMealStore.setState({ meals: [localMeal("local-only-1", "Local-only meal")] });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("backend unreachable");
			}),
		);

		const hydrated = await syncMealsFromBackend();

		expect(hydrated).toBe(false);
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
		expect(usePersistentMealStore.getState().meals[0].name).toBe("Local-only meal");
	});

	it("leaves the local store intact when the backend responds with an error status", async () => {
		usePersistentMealStore.setState({ meals: [localMeal("local-only-1", "Local-only meal")] });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: false, json: async () => ({ detail: "boom" }) })),
		);

		const hydrated = await syncMealsFromBackend();

		expect(hydrated).toBe(false);
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
	});
});
