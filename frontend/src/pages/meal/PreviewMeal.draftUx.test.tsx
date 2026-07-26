import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The ion-toast overlay cannot run its enter animation under jsdom and throws
// an unhandled rejection. The toast is supplementary feedback by design
// (issue #75) — these tests assert the inline banner — so it is stubbed out.
vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return { ...actual, IonToast: () => null };
});

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { MealItem, Unit } from "../../types/MealItem";
import { DRAFT_ITEM_ROW_HINT, DRAFT_REVIEW_KICKER, ITEM_LIST_EDIT_HELPER, MEAL_SAVE_FAILURE, SAVED_MEAL_STATUS } from "../../utils/mealDraftUx";

// Manual meal draft/save UX (issue #75): the review screen must present an
// unsaved manual meal as an editable draft, reject empty/zero saves with
// feedback that stays visible (not only a toast), and confirm successful
// saves inline. Synthetic demo-shaped data only. No real user or health data.

const draftItem = (overrides: Partial<MealItem> = {}): MealItem => ({
	id: "item-1",
	name: "New Item",
	servingSize: 0,
	servingUnit: Unit.Grams,
	amount: 0,
	kcalPerServing: 0,
	carbPerServing_g: 0,
	satFatPerServing_g: 0,
	gi: 0,
	...overrides,
});

const currentMeal = (items: MealItem[]): Meal => ({
	id: "draft-meal-1",
	image: null,
	name: "New Meal",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	items,
	isAiDraft: false,
});

const savedMealResponseBody = {
	id: "saved-meal-1",
	created_at: "2026-07-01T12:05:00Z",
	meal_name: "Steamed rice",
	items: [
		{
			name: "Steamed rice",
			quantity: 1,
			unit: "serving",
			kcalPerUnit: 200,
			carb_g: 45,
			protein_g: 4,
			fat_g: 0.5,
			satFat_g: 0.2,
			gi: 60,
			kcal_item: 200,
			insulin_load: 60,
			confidence: 0.8,
			fii_source: "fii_table",
			why: "matched FII table entry",
		},
	],
	insulin_load_total: 60,
	acute_score: 42,
	kcal_total: 200,
	carbs_total: 45,
	protein_total: 4,
	fat_total: 0.5,
	estimate_quality: "high",
	main_insulin_drivers: ["steamed rice"],
};

const renderPreviewMeal = () => {
	window.history.pushState({}, "", "/meals/new");
	return render(<App />);
};

describe("PreviewMeal manual draft/save UX (issue #75)", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
		useCurrentMealStore.setState({ meal: currentMeal([draftItem()]) });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("presents an unsaved manual meal as an editable draft, not a broken saved meal", async () => {
		renderPreviewMeal();

		expect(await screen.findByText(DRAFT_REVIEW_KICKER)).toBeTruthy();
		expect(screen.getByText(DRAFT_ITEM_ROW_HINT)).toBeTruthy();
		expect(screen.getByRole("region", { name: "Meal components" })).toBeTruthy();
		expect(screen.queryByText(ITEM_LIST_EDIT_HELPER)).toBeNull();
		expect(screen.queryByText(SAVED_MEAL_STATUS)).toBeNull();
	});

	it("shows the empty-draft explainer instead of the item helper when there are no items", async () => {
		useCurrentMealStore.setState({ meal: currentMeal([]) });
		renderPreviewMeal();

		expect(await screen.findByText("This meal is an editable draft")).toBeTruthy();
		expect(screen.queryByText(ITEM_LIST_EDIT_HELPER)).toBeNull();
	});

	it("rejects a zero-quantity save with a visible inline message and does not persist anything", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const { baseElement } = renderPreviewMeal();

		fireEvent.click(await screen.findByLabelText("Save meal"));

		await waitFor(() => {
			const banner = baseElement.querySelector(".save-feedback-banner.save-feedback-error");
			expect(banner?.textContent).toContain("greater than 0");
		});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});

	it("clears the inline validation error once the draft becomes valid", async () => {
		vi.stubGlobal("fetch", vi.fn());
		const { baseElement } = renderPreviewMeal();

		fireEvent.click(await screen.findByLabelText("Save meal"));
		await waitFor(() => {
			expect(baseElement.querySelector(".save-feedback-error")).toBeTruthy();
		});

		// The user fixes the item; the stale rejection must not linger.
		useCurrentMealStore.setState({ meal: currentMeal([draftItem({ name: "Steamed rice", amount: 1, kcalPerServing: 200 })]) });
		await waitFor(() => {
			expect(baseElement.querySelector(".save-feedback-error")).toBeNull();
		});
	});

	it("makes the review sheet inert and swaps the primary label while submitting", async () => {
		let resolveSave: ((value: { ok: boolean; status: number; json: () => Promise<typeof savedMealResponseBody> }) => void) | undefined;
		const fetchMock = vi.fn(() => new Promise<{ ok: boolean; status: number; json: () => Promise<typeof savedMealResponseBody> }>((resolve) => {
			resolveSave = resolve;
		}));
		vi.stubGlobal("fetch", fetchMock);
		useCurrentMealStore.setState({ meal: currentMeal([draftItem({ name: "Steamed rice", amount: 1, kcalPerServing: 200 })]) });
		const { baseElement } = renderPreviewMeal();

		fireEvent.click(await screen.findByLabelText("Save meal"));

		expect(await screen.findByText("Estimating insulin demand…")).toBeTruthy();
		expect(baseElement.querySelector(".confirmation-sheet")).toHaveAttribute("aria-busy", "true");
		expect(baseElement.querySelector(".confirmation-sheet")).toHaveAttribute("inert");
		expect(baseElement.querySelector('ion-input[label="Meal name"]')).toHaveAttribute("disabled");
		expect(screen.getByText("Discard draft").closest("ion-button")).toHaveAttribute("disabled");
		expect(baseElement.querySelector("ion-loading")).toBeNull();

		resolveSave?.({ ok: true, status: 200, json: async () => savedMealResponseBody });
		await waitFor(() => expect(window.location.pathname).toBe("/meals/saved/saved-meal-1"));
	});

	it("shows curated failure copy, preserves the draft, and keeps raw errors in console only", async () => {
		const rawBackendMessage = "sensitive synthetic backend diagnostic";
		vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ detail: rawBackendMessage }) })));
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const validDraft = currentMeal([draftItem({ name: "Steamed rice", amount: 1, kcalPerServing: 200 })]);
		useCurrentMealStore.setState({ meal: validDraft });
		const { baseElement } = renderPreviewMeal();

		fireEvent.click(await screen.findByLabelText("Save meal"));

		await waitFor(() => expect(baseElement.querySelector(".save-feedback-error")).toHaveTextContent(MEAL_SAVE_FAILURE));
		expect(baseElement).not.toHaveTextContent(rawBackendMessage);
		expect(useCurrentMealStore.getState().meal).toEqual(validDraft);
		expect(window.location.pathname).toBe("/meals/new");
		expect(consoleErrorSpy).toHaveBeenCalledWith("POST /meals failed:", expect.anything());
	});

	it("saves a dirty valid manual meal without a leave warning or private response logging", async () => {
		const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => savedMealResponseBody }));
		vi.stubGlobal("fetch", fetchMock);
		const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const { baseElement } = renderPreviewMeal();
		await screen.findByText(DRAFT_REVIEW_KICKER);
		act(() => useCurrentMealStore.setState({ meal: currentMeal([draftItem({ name: "Steamed rice", amount: 1, kcalPerServing: 200, carbPerServing_g: 45, satFatPerServing_g: 0.2 })]) }));

		fireEvent.click(await screen.findByLabelText("Save meal"));

		await waitFor(() => {
			const banner = baseElement.querySelector(".save-feedback-banner.save-feedback-success");
			expect(banner?.textContent).toContain("Meal saved to your history");
		});
		expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/meals$/), expect.objectContaining({ method: "POST" }));
		expect(await screen.findByText(SAVED_MEAL_STATUS)).toBeTruthy();

		const savedMeals = usePersistentMealStore.getState().meals;
		expect(savedMeals).toHaveLength(1);
		expect(savedMeals[0].id).toBe("saved-meal-1");
		expect(savedMeals[0].backend_created_at).toBe("2026-07-01T12:05:00Z");
		expect(consoleLogSpy).not.toHaveBeenCalledWith("POST /meals response:", expect.anything());
		await waitFor(() => {
			expect(window.location.pathname).toBe("/meals/saved/saved-meal-1");
		});
		expect(screen.queryByText("Discard this draft?")).toBeNull();
		// J5 replaced the saved-result toolbar title and the circular score
		// meter with the journal hero and the sealed score/reference line, so
		// the canonical score is checked through that sealed wording instead.
		expect(await screen.findByText("Score: 42 · internal reference: 100")).toBeTruthy();
		expect(baseElement.querySelector('[role="img"][aria-label*="score 42"]')).toBeNull();
	});
});
