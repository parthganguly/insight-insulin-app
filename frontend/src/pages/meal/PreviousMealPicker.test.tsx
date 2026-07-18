import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { Unit } from "../../types/MealItem";

// Previous-meal picker reuse guard (issue #89, relocated for Campaign A): the
// explicit "Log a previous meal again" flow must KEEP converting a saved meal
// into a fresh editable draft through buildDraftFromSavedMeal — new id,
// source_meal_id back-link, and every backend-derived scoring field cleared.
// This behavior lived in the Meals tab before Campaign A moved it behind the
// Log Meal chooser's explicit "previous meal" option (History is read-only).
// Synthetic demo-shaped data only. No real user or health data.

const seededSavedMeal: Meal = {
	id: "saved-meal-1",
	image: null,
	name: "Synthetic Demo Bowl",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	backend_created_at: "2026-07-01T12:00:00Z",
	acute_score: 360,
	insulin_load_total: 900,
	kcal_total: 700,
	carbs_total: 90,
	estimate_quality: "high",
	main_insulin_drivers: ["steamed rice"],
	items: [
		{
			id: "item-1",
			name: "Steamed rice",
			servingSize: 1,
			servingUnit: Unit.Servings,
			amount: 2,
			kcalPerServing: 200,
			carbPerServing_g: 45,
			satFatPerServing_g: 0.2,
			gi: 60,
			fii: 62,
			source: "exact_fii",
			why: "matched FII table entry",
		},
	],
};

const stubBackend = () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: unknown) => {
			const url = String(input);
			if (url.includes("/meals")) {
				return { ok: true, json: async () => [] };
			}
			return { ok: false, json: async () => ({}) };
		}),
	);
};

describe("Previous-meal picker reuse flow stays a draft conversion (issue #89 guard)", () => {
	beforeEach(() => {
		localStorage.clear();
		stubBackend();
		usePersistentMealStore.setState({ meals: [seededSavedMeal] });
		useCurrentMealStore.getState().resetMeal();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("keeps the explicit reuse wording", async () => {
		window.history.pushState({}, "", "/meals/previous");
		render(<App />);

		expect(await screen.findByText("Choose a previous meal")).toBeTruthy();
		expect(screen.getByText("choose one to edit and log again")).toBeTruthy();
	});

	it("tapping a saved meal still creates a fresh editable draft with derived scoring cleared", async () => {
		window.history.pushState({}, "", "/meals/previous");
		render(<App />);
		const originalSavedRecord = JSON.stringify(usePersistentMealStore.getState().meals[0]);

		fireEvent.click(await screen.findByText("Synthetic Demo Bowl"));

		await waitFor(() => {
			expect(useCurrentMealStore.getState().meal.source_meal_id).toBe("saved-meal-1");
		});
		expect(window.location.pathname).toBe("/meals/new");
		expect(JSON.stringify(usePersistentMealStore.getState().meals[0])).toBe(originalSavedRecord);

		const draft = useCurrentMealStore.getState().meal;
		// New identity, unsaved, back-link to the original (issue #78 delete path).
		expect(draft.id).not.toBe("saved-meal-1");
		expect(draft.backend_created_at).toBeUndefined();

		// The trust boundary still strips every backend-derived scoring field.
		expect(draft.acute_score).toBeUndefined();
		expect(draft.insulin_load_total).toBeUndefined();
		expect(draft.kcal_total).toBeUndefined();
		expect(draft.carbs_total).toBeUndefined();
		expect(draft.estimate_quality).toBeUndefined();
		expect(draft.main_insulin_drivers).toBeUndefined();

		expect(draft.items).toHaveLength(1);
		expect(draft.items[0].id).not.toBe("item-1");
		expect(draft.items[0].fii).toBeUndefined();
		expect(draft.items[0].source).toBeUndefined();
		expect(draft.items[0].why).toBeUndefined();
		expect(draft.items[0].draftProvenance).toBe("user_entered");
	});
});
