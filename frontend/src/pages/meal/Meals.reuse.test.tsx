import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { Unit } from "../../types/MealItem";

// Meals tab / History read-only guard (issue #89, updated for Campaign A):
// this file used to guard the "Re-add Previous Meals / tap a meal to reuse
// it" draft-conversion flow that lived directly on the Meals tab. Campaign A
// (docs/product/ux/insight-ux-v1.md §6-7) turned that tab into a purely
// read-only History list and moved explicit reuse behind the Log Meal
// chooser's "Log a previous meal again" option — see
// PreviousMealPicker.test.tsx for the draft-conversion/trust-boundary guard
// that used to live here. This file now guards that History itself stays
// read-only and never creates a draft.
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

describe("Meals tab / History stays read-only (issue #89 guard, updated for Campaign A)", () => {
	beforeEach(() => {
		localStorage.clear();
		stubBackend();
		usePersistentMealStore.setState({ meals: [seededSavedMeal] });
		useCurrentMealStore.getState().resetMeal();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows the read-only History heading, not the old reuse wording", async () => {
		window.history.pushState({}, "", "/meals");
		render(<App />);

		expect(await screen.findByText("Synthetic Demo Bowl")).toBeTruthy();
		expect(screen.queryByText("Re-add Previous Meals")).toBeNull();
		expect(screen.queryByText("tap a meal to reuse it")).toBeNull();
	});

	it("tapping a saved meal opens the read-only result view and creates no draft", async () => {
		window.history.pushState({}, "", "/meals");
		render(<App />);

		fireEvent.click(await screen.findByText("Synthetic Demo Bowl"));

		await waitFor(() => expect(window.location.pathname).toBe("/meals/saved/saved-meal-1"));
		// J5 replaced the saved-result toolbar title with the journal hero, so
		// the landing check uses the page's own sealed saved-status pill.
		expect(await screen.findByText("Saved to history")).toBeTruthy();
		expect(useCurrentMealStore.getState().meal.source_meal_id).toBeUndefined();
		expect(useCurrentMealStore.getState().meal.name).toBe("New Meal");
		expect(useCurrentMealStore.getState().meal.items).toHaveLength(0);
	});
});
