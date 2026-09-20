import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import { useCurrentMealStore, getLegacyCurrentMeal } from "../../stores/currentMealStore";
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

	// J6 (issue #123) replaced the section label with the folio explainer and the
	// per-entry action line. The wording moved; the meaning did not — selection
	// must still read as starting a new editable draft, never as logging the
	// meal again or reopening the original.
	it("keeps the explicit reuse wording", async () => {
		window.history.pushState({}, "", "/meals/previous");
		render(<App />);

		expect(await screen.findByText("Choose a previous meal")).toBeTruthy();
		expect(screen.getByRole("heading", { level: 1, name: "Log a previous meal again" })).toBeTruthy();
		expect(screen.getByText("Pick a meal to start a new draft you can review and edit. The original stays unchanged in History.")).toBeTruthy();
		expect(screen.getByText("Use as new draft")).toBeTruthy();
	});

	it("offers an explicit way back to the Log Meal chooser", async () => {
		window.history.pushState({}, "", "/meals/previous");
		const { container } = render(<App />);

		await screen.findByText("Synthetic Demo Bowl");
		const backButton = container.querySelector("ion-back-button");
		expect(backButton).toHaveAttribute("default-href", "/log-meal");
		// Once Ionic hydrates the control it moves the host's aria-label onto the
		// inner native button, so the accessible name is read from whichever of
		// the two currently carries it.
		const accessibleName = backButton?.shadowRoot?.querySelector("button")?.getAttribute("aria-label") ?? backButton?.getAttribute("aria-label");
		expect(accessibleName).toBe("Back");
	});

	it("shows the sealed empty state without the explainer or the action line", async () => {
		usePersistentMealStore.setState({ meals: [] });
		window.history.pushState({}, "", "/meals/previous");
		render(<App />);

		expect(await screen.findByRole("heading", { level: 2, name: "No previous meals yet" })).toBeTruthy();
		expect(screen.getByText("Meals you save will appear here for quick reuse.")).toBeTruthy();
		expect(screen.queryByText("Pick a meal to start a new draft you can review and edit. The original stays unchanged in History.")).toBeNull();
		expect(screen.queryByText("Use as new draft")).toBeNull();
	});

	it("never re-presents the saved estimate or links back to the saved result", async () => {
		window.history.pushState({}, "", "/meals/previous");
		const { baseElement } = render(<App />);

		await screen.findByText("Synthetic Demo Bowl");
		const pickerPage = baseElement.querySelector(".journal-folio-content");
		const pickerText = pickerPage?.textContent ?? "";

		expect(pickerText).not.toContain("estimate 360");
		expect(pickerText).not.toContain("Data quality");
		expect(pickerText).not.toContain("above ref");
		expect(pickerPage?.querySelector(".CircularProgressbar")).toBeNull();
		expect(pickerPage?.querySelector("svg")).toBeNull();
		expect(pickerPage?.querySelector("[router-link^='/meals/saved/']")).toBeNull();
	});

	it("makes no backend write when a saved meal is selected", async () => {
		window.history.pushState({}, "", "/meals/previous");
		render(<App />);

		fireEvent.click(await screen.findByText("Synthetic Demo Bowl"));

		await waitFor(() => expect(useCurrentMealStore.getState().meal.source_meal_id).toBe("saved-meal-1"));
		const writeCalls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(([, init]) => {
			const method = (init as RequestInit | undefined)?.method?.toUpperCase();
			return method !== undefined && method !== "GET";
		});
		expect(writeCalls).toHaveLength(0);
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

		const draft = getLegacyCurrentMeal();
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
