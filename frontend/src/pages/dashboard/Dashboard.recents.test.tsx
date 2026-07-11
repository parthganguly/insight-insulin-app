import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { DRAFT_MEAL_STATUS, SAVED_MEAL_STATUS } from "../../utils/mealDraftUx";

// Dashboard Recents navigation (issue #89): tapping a saved meal must open its
// read-only detail view with the canonical saved score intact — it must NOT
// convert the meal into a fresh editable draft (the pre-#89 behavior that
// discarded acute_score, estimate_quality, and explanations on every tap).
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
	items: [],
};

const stubBackend = () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: unknown) => {
			const url = String(input);
			if (url.includes("/metrics/chronic")) {
				return { ok: true, json: async () => ({ days: 30, series: [], current_rolling_7d_dii: 0.4 }) };
			}
			if (url.includes("/meals")) {
				// Empty backend list: hydration keeps locally seeded meals untouched.
				return { ok: true, json: async () => [] };
			}
			return { ok: false, json: async () => ({}) };
		}),
	);
};

describe("Dashboard Recents opens the saved meal read-only (issue #89)", () => {
	beforeEach(() => {
		localStorage.clear();
		stubBackend();
		usePersistentMealStore.setState({ meals: [seededSavedMeal] });
		useCurrentMealStore.getState().resetMeal();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("navigates to the saved-meal detail route and never builds a draft from the tapped meal", async () => {
		window.history.pushState({}, "", "/dashboard");
		render(<App />);

		fireEvent.click(await screen.findByText("Synthetic Demo Bowl"));

		await waitFor(() => {
			expect(window.location.pathname).toBe("/meals/saved/saved-meal-1");
		});

		// The canonical saved record is shown, not a stripped draft.
		expect(await screen.findByText(SAVED_MEAL_STATUS)).toBeTruthy();
		expect(screen.getByText("Score: 360 · above reference meal (100)")).toBeTruthy();
		expect(screen.queryByText(DRAFT_MEAL_STATUS)).toBeNull();
		expect(screen.queryByText("Hard to estimate from this meal")).toBeNull();

		// The current-meal draft store stays untouched: no silent draft conversion.
		const currentMeal = useCurrentMealStore.getState().meal;
		expect(currentMeal.name).toBe("New Meal");
		expect(currentMeal.source_meal_id).toBeUndefined();
		expect(currentMeal.items).toHaveLength(0);
	});
});
