import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom cannot run Ionic overlay enter animations (same reason the PreviewMeal
// tests stub IonToast). The confirm alert is captured through a mocked
// useIonAlert so the destructive handler can be invoked deterministically.
const { presentAlertMock } = vi.hoisted(() => ({ presentAlertMock: vi.fn() }));

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return {
		...actual,
		IonToast: () => null,
		IonLoading: () => null,
		useIonAlert: () => [presentAlertMock, vi.fn()] as const,
	};
});

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { Unit } from "../../types/MealItem";
import { DRAFT_MEAL_STATUS, ITEM_LIST_EDIT_HELPER, SAVED_MEAL_STATUS } from "../../utils/mealDraftUx";
import { ACUTE_SCORE_SCALE_EXPLAINER } from "../../utils/acuteScoreDisplay";
import { APP_DISCLAIMER, MEAL_SCORE_DISCLAIMER } from "../../utils/safetyCopy";

// Read-only saved-meal detail view (issue #89): opening a saved meal from
// Dashboard Recents must show the canonical saved record — real acute_score,
// estimate_quality, drivers, and per-item explanations — with no editing or
// duplicate-save controls, while deletion keeps its backend-first integrity.
// Synthetic demo-shaped data only. No real user or health data.

const savedMeal = (overrides: Partial<Meal> = {}): Meal => ({
	id: "saved-meal-1",
	image: null,
	name: "Synthetic Demo Bowl",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	backend_created_at: "2026-07-01T12:00:00Z",
	acute_score: 360,
	insulin_load_total: 900,
	kcal_total: 700,
	carbs_total: 90,
	protein_total: 25,
	fat_total: 20,
	estimate_quality: "high",
	main_insulin_drivers: ["steamed rice", "sweet sauce"],
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
	...overrides,
});

const stubBackend = ({ deleteOk = true }: { deleteOk?: boolean } = {}) => {
	const fetchMock = vi.fn(async (input: unknown, init?: { method?: string }) => {
		const url = String(input);
		if (init?.method === "DELETE") {
			if (!deleteOk) return { ok: false, status: 500, json: async () => ({ detail: "backend delete failed" }) };
			return { ok: true, status: 200, json: async () => ({}) };
		}
		if (url.includes("/metrics/chronic")) {
			return { ok: true, json: async () => ({ days: 30, series: [], current_rolling_7d_dii: 0.4 }) };
		}
		if (url.includes("/meals")) {
			// Empty backend list: hydration keeps locally seeded meals untouched.
			return { ok: true, json: async () => [] };
		}
		return { ok: false, json: async () => ({}) };
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
};

const renderSavedMealDetail = (mealId = "saved-meal-1") => {
	window.history.pushState({}, "", `/meals/saved/${encodeURIComponent(mealId)}`);
	return render(<App />);
};

describe("SavedMealDetail read-only view (issue #89)", () => {
	beforeEach(() => {
		localStorage.clear();
		presentAlertMock.mockReset();
		usePersistentMealStore.setState({ meals: [savedMeal()] });
		useCurrentMealStore.getState().resetMeal();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows the canonical saved state: status, real score, quality, drivers, and item explanations", async () => {
		stubBackend();
		renderSavedMealDetail();

		expect(await screen.findByText(SAVED_MEAL_STATUS)).toBeTruthy();
		expect(screen.queryByText(DRAFT_MEAL_STATUS)).toBeNull();

		// Canonical score with above-reference semantics intact, not the
		// "Hard to estimate" fallback the draft conversion used to force.
		expect(screen.getByText("Higher relative insulin demand")).toBeTruthy();
		expect(screen.queryByText("Hard to estimate from this meal")).toBeNull();
		expect(screen.getByText("Score: 360 · above reference meal (100)")).toBeTruthy();
		expect(screen.getByText(ACUTE_SCORE_SCALE_EXPLAINER)).toBeTruthy();

		expect(screen.getByText("Data quality: High")).toBeTruthy();
		expect(screen.getByText("steamed rice")).toBeTruthy();
		expect(screen.getByText("sweet sauce")).toBeTruthy();
		expect(screen.getByText("matched FII table entry")).toBeTruthy();
		expect(screen.getByText("Source: Direct FII match")).toBeTruthy();

		expect(screen.getByText(MEAL_SCORE_DISCLAIMER)).toBeTruthy();
		expect(screen.getByText(APP_DISCLAIMER)).toBeTruthy();
	});

	it("offers no editing or save controls and never touches the current-meal draft store", async () => {
		stubBackend();
		renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		expect(screen.queryAllByRole("textbox")).toHaveLength(0);
		expect(screen.queryByLabelText("Save meal")).toBeNull();
		expect(screen.queryByLabelText("Add meal item")).toBeNull();
		expect(screen.queryByText(ITEM_LIST_EDIT_HELPER)).toBeNull();
		expect(screen.queryByText("Edit")).toBeNull();

		// Viewing a saved meal must not build a draft (the old Recents bug).
		const currentMeal = useCurrentMealStore.getState().meal;
		expect(currentMeal.name).toBe("New Meal");
		expect(currentMeal.source_meal_id).toBeUndefined();
		expect(currentMeal.items).toHaveLength(0);
	});

	it("keeps the 'Hard to estimate' presentation and hides score details for low-quality saved meals", async () => {
		stubBackend();
		usePersistentMealStore.setState({ meals: [savedMeal({ estimate_quality: "low" })] });
		renderSavedMealDetail();

		expect(await screen.findByText("Hard to estimate from this meal")).toBeTruthy();
		expect(screen.queryByText(/Score: 360/)).toBeNull();
		expect(screen.getByText("Data quality: Low")).toBeTruthy();
	});

	it("requires confirmation, then deletes backend-first and removes the meal locally", async () => {
		const fetchMock = stubBackend();
		renderSavedMealDetail();

		fireEvent.click(await screen.findByText("Delete Saved Meal"));

		expect(presentAlertMock).toHaveBeenCalledTimes(1);
		const alertOptions = presentAlertMock.mock.calls[0][0] as { header: string; buttons: Array<{ role?: string; handler?: () => void }> };
		expect(alertOptions.header).toBe("Delete saved meal?");

		const destructiveButton = alertOptions.buttons.find((button) => button.role === "destructive");
		expect(destructiveButton?.handler).toBeTruthy();
		destructiveButton!.handler!();

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/meals\/saved-meal-1$/), expect.objectContaining({ method: "DELETE" }));
		});
		await waitFor(() => {
			expect(usePersistentMealStore.getState().meals).toHaveLength(0);
		});
	});

	it("keeps the meal when the backend deletion fails", async () => {
		const fetchMock = stubBackend({ deleteOk: false });
		renderSavedMealDetail();

		fireEvent.click(await screen.findByText("Delete Saved Meal"));
		const alertOptions = presentAlertMock.mock.calls[0][0] as { buttons: Array<{ role?: string; handler?: () => void }> };
		alertOptions.buttons.find((button) => button.role === "destructive")!.handler!();

		// Wait until the backend DELETE actually ran, then confirm nothing was
		// removed locally — the UI must never pretend a failed delete succeeded.
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/meals\/saved-meal-1$/), expect.objectContaining({ method: "DELETE" }));
		});
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
		expect(usePersistentMealStore.getState().meals[0].id).toBe("saved-meal-1");
	});

	it("shows a safe not-found state for an unknown meal id", async () => {
		stubBackend();
		renderSavedMealDetail("no-such-meal");

		expect(await screen.findByText("Meal Not Found")).toBeTruthy();
		expect(screen.queryByText(SAVED_MEAL_STATUS)).toBeNull();
		expect(screen.queryByText("Delete Saved Meal")).toBeNull();
	});
});
