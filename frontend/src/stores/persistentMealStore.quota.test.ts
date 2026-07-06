import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isPersistableImage, usePersistentMealStore } from "./persistentMealStore";
import { Meal } from "../types/Meal";

// Synthetic data only. A ~200k-char data URI stands in for a real camera photo.
const LARGE_IMAGE = `data:image/jpeg;base64,${"A".repeat(200_000)}`;
const TINY_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg";

const mealWith = (id: string, image: string | null): Meal => ({
	id,
	image,
	name: `Synthetic meal ${id}`,
	timestamp: Date.parse("2026-07-04T12:00:00Z"),
	items: [],
	acute_score: 42,
	kcal_total: 500,
});

const readPersisted = (): { state: { meals: Meal[] } } | null => {
	const raw = localStorage.getItem("insight-meals");
	return raw ? (JSON.parse(raw) as { state: { meals: Meal[] } }) : null;
};

describe("localStorage photo-quota safety", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("saving a meal with a large base64 photo does not crash and keeps meal data persisted", () => {
		expect(() => usePersistentMealStore.getState().addMeal(mealWith("photo-1", LARGE_IMAGE))).not.toThrow();

		const persisted = readPersisted();
		expect(persisted?.state.meals).toHaveLength(1);
		expect(persisted?.state.meals[0].name).toBe("Synthetic meal photo-1");
		expect(persisted?.state.meals[0].acute_score).toBe(42);
	});

	it("does not persist the full-size base64 photo, but keeps it in memory for the session", () => {
		usePersistentMealStore.getState().addMeal(mealWith("photo-1", LARGE_IMAGE));

		expect(readPersisted()?.state.meals[0].image).toBeNull();
		// In-memory state still has the photo so the review screen can show it.
		expect(usePersistentMealStore.getState().meals[0].image).toBe(LARGE_IMAGE);
	});

	it("still persists tiny images under the cap", () => {
		usePersistentMealStore.getState().addMeal(mealWith("tiny-1", TINY_IMAGE));

		expect(readPersisted()?.state.meals[0].image).toBe(TINY_IMAGE);
		expect(isPersistableImage(TINY_IMAGE)).toBe(true);
		expect(isPersistableImage(LARGE_IMAGE)).toBe(false);
	});

	it("retries a quota-failed write once with image fields stripped and keeps the meal", () => {
		// Seed a persisted tiny image so the retry has something to strip.
		usePersistentMealStore.getState().addMeal(mealWith("tiny-1", TINY_IMAGE));

		const realSetItem = Storage.prototype.setItem;
		let calls = 0;
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
			calls += 1;
			if (calls === 1) {
				throw new DOMException("QuotaExceededError", "QuotaExceededError");
			}
			realSetItem.call(this, key, value);
		});

		expect(() => usePersistentMealStore.getState().addMeal(mealWith("quota-1", null))).not.toThrow();

		expect(calls).toBe(2); // failed write + one stripped retry
		const persisted = readPersisted();
		expect(persisted?.state.meals.map((meal) => meal.id).sort()).toEqual(["quota-1", "tiny-1"]);
		// The retry stripped every image field to fit.
		expect(persisted?.state.meals.every((meal) => meal.image === null)).toBe(true);
	});

	it("keeps meals in memory and does not throw when even the stripped retry fails", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("QuotaExceededError", "QuotaExceededError");
		});

		expect(() => usePersistentMealStore.getState().addMeal(mealWith("mem-1", LARGE_IMAGE))).not.toThrow();

		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
		expect(usePersistentMealStore.getState().meals[0].id).toBe("mem-1");
		expect(warnSpy).toHaveBeenCalled();
	});

	it("keeps #58 hydration merge behavior intact while stripping large images from the persisted copy", () => {
		usePersistentMealStore.setState({
			meals: [mealWith("backend-1", LARGE_IMAGE), mealWith("local-only-1", null)],
		});

		usePersistentMealStore.getState().hydrateFromBackend([{ ...mealWith("backend-1", null), name: "Canonical from backend" }]);

		const meals = usePersistentMealStore.getState().meals;
		expect(meals).toHaveLength(2);
		// Backend canonical by id, local image preserved in memory, local-only kept.
		expect(meals.find((meal) => meal.id === "backend-1")?.name).toBe("Canonical from backend");
		expect(meals.find((meal) => meal.id === "backend-1")?.image).toBe(LARGE_IMAGE);
		expect(meals.find((meal) => meal.id === "local-only-1")).toBeTruthy();
		// Persisted copy still refuses the full-size photo.
		expect(readPersisted()?.state.meals.find((meal) => meal.id === "backend-1")?.image).toBeNull();
	});
});
