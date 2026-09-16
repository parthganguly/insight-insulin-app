import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { syncMealsFromBackend, usePersistentMealStore } from "./persistentMealStore";
import { Meal } from "../types/Meal";
import { buildCreateMealPayload, mapMealModelingResponseToMeal, postMealToAPI } from "../api/api";
import { buildDraftFromSavedMeal } from "../utils/fiiTrustBoundary";

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
	estimate_status: "estimated",
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
		expect(meals.every((meal) => meal.estimate_status === "estimated")).toBe(true);
	});

	it("preserves server versions through save, hydration and local reload with unknown history intact", async () => {
		const versions = { formula_version: "current_backend_v2", dataset_version: "fii_foods_csv_fnv1a64_250e9dfc91988b6b" };
		stubFetchWithMeals(backendMealBody(versions));
		const saved = await postMealToAPI({ meal_name: "Synthetic", items: [], client_request_id: "synthetic-request" });
		usePersistentMealStore.getState().addMeal(mapMealModelingResponseToMeal(saved));
		expect(usePersistentMealStore.getState().meals[0]).toMatchObject(versions);
		usePersistentMealStore.getState().addMeal(localMeal("local-only", "Synthetic legacy local"));
		stubFetchWithMeals([
			backendMealBody(versions),
			backendMealBody({ id: "legacy-missing" }),
			backendMealBody({ id: "legacy-null", formula_version: null, dataset_version: null }),
			backendMealBody({ id: "different", formula_version: "synthetic_future", dataset_version: "synthetic_future_data" }),
		]);
		await syncMealsFromBackend();
		await usePersistentMealStore.persist.rehydrate();
		const meals = usePersistentMealStore.getState().meals;
		expect(meals).toHaveLength(5);
		expect(meals.find((meal) => meal.id === "demo-meal-1")).toMatchObject(versions);
		for (const id of ["legacy-missing", "legacy-null"]) {
			expect(meals.find((meal) => meal.id === id)).toMatchObject({ formula_version: null, dataset_version: null, acute_score: 38 });
		}
		expect(meals.find((meal) => meal.id === "local-only")?.formula_version).toBeUndefined();
		expect(meals.find((meal) => meal.id === "different")?.formula_version).toBe("synthetic_future");

		const draft = buildDraftFromSavedMeal(meals.find((meal) => meal.id === "demo-meal-1")!);
		expect(draft.formula_version).toBeUndefined();
		expect(draft.dataset_version).toBeUndefined();
		expect(buildCreateMealPayload({ ...draft, ...versions })).not.toHaveProperty("formula_version");
		expect(buildCreateMealPayload({ ...draft, ...versions })).not.toHaveProperty("dataset_version");
	});

	it("an old backend response cannot inherit cached current versions", async () => {
		usePersistentMealStore.getState().addMeal({ ...localMeal("demo-meal-1", "Stale"), formula_version: "stale", dataset_version: "stale" });
		stubFetchWithMeals([backendMealBody()]);
		await syncMealsFromBackend();
		expect(usePersistentMealStore.getState().meals[0]).toMatchObject({ formula_version: null, dataset_version: null });
	});

	it("preserves an insufficient-data status from canonical backend hydration", async () => {
		stubFetchWithMeals([
			backendMealBody({
				acute_score: 0,
				estimate_quality: "high",
				estimate_status: "insufficient_data",
			}),
		]);

		await syncMealsFromBackend();

		expect(usePersistentMealStore.getState().meals[0].estimate_status).toBe("insufficient_data");
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
