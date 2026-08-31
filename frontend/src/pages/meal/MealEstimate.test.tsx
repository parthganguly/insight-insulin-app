import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return {
		...actual,
		IonAlert: ({ isOpen, header, message, buttons = [] }: {
			isOpen: boolean;
			header: string;
			message?: string;
			buttons?: Array<{ text: string; handler?: () => void }>;
		}) => isOpen ? (
			<div role='alertdialog'>
				<span>{header}</span>
				<span>{message}</span>
				{buttons.map((button) => <button key={button.text} onClick={button.handler}>{button.text}</button>)}
			</div>
		) : null,
		IonLoading: () => null,
		IonToast: () => null,
	};
});

import App from "../../App";
import { MealPreviewResponse } from "../../api/api";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { getMaterialItemsSnapshot, useMealEstimateStore } from "../../stores/mealEstimateStore";
import { usePendingSaveStore } from "../../stores/pendingSaveStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { Unit } from "../../types/MealItem";
import { STALE_ESTIMATE_MESSAGE, UNSAVED_ESTIMATE_STATUS } from "./MealEstimate";

const draft = (): Meal => ({
	id: "draft-x",
	image: null,
	name: "Synthetic oats",
	timestamp: Date.parse("2026-08-01T08:00:00Z"),
	items: [{ id: "oats", name: "oats", servingSize: 1, servingUnit: Unit.Servings, amount: 1, kcalPerServing: 200, carbPerServing_g: 30, satFatPerServing_g: 1, gi: 55 }],
});

const preview = (status: "estimated" | "insufficient_data" = "estimated"): MealPreviewResponse => ({
	meal_name: "Synthetic oats",
	items: [{ name: "oats", quantity: 1, unit: "serving", kcalPerUnit: 200, carb_g: 30, satFat_g: 1, gi: 55, kcal_item: 200, insulin_load: 20, confidence: 1, fii_source: status === "estimated" ? "exact_fii" : "unknown" }],
	insulin_load_total: 20,
	acute_score: 67,
	kcal_total: 200,
	carbs_total: 30,
	protein_total: 5,
	fat_total: 3,
	estimate_quality: status === "estimated" ? "high" : "low",
	estimate_status: status,
	main_insulin_drivers: ["oats"],
	persisted: false,
});

const prepareEstimate = (status: "estimated" | "insufficient_data" = "estimated") => {
	const meal = draft();
	useCurrentMealStore.setState({ meal });
	const store = useMealEstimateStore.getState();
	const token = store.beginPreview();
	store.applyPreview(token, meal.id, preview(status), getMaterialItemsSnapshot(meal), "00000000-0000-4000-8000-000000000001");
};

const renderAtEstimate = () => {
	window.history.replaceState({}, "", "/meals/estimate");
	return render(<App />);
};

describe("B2-2 unsaved estimate route", () => {
	beforeEach(() => {
		localStorage.clear();
		useMealEstimateStore.getState().clearEstimate();
		usePendingSaveStore.getState().clearAll();
		usePersistentMealStore.setState({ meals: [] });
		useCurrentMealStore.setState({ meal: draft() });
	});

	afterEach(() => { vi.unstubAllGlobals(); });

	it("renders a clearly unsaved result with no logged timestamp or canonical id", async () => {
		prepareEstimate();
		const { baseElement } = renderAtEstimate();
		expect(await screen.findByText(UNSAVED_ESTIMATE_STATUS)).toBeVisible();
		expect(screen.getByText("Relative score: 67")).toBeVisible();
		expect(screen.queryByText(/^Logged /)).toBeNull();
		expect(screen.getByText("Save to History")).toBeVisible();
		expect(baseElement.querySelector('ion-tab-button[tab="logMeal"]')).toHaveClass("journey-tab-selected");
		expect(usePersistentMealStore.getState().meals).toEqual([]);
	});

	it("renders insufficient_data as Hard to estimate while keeping partial output disclosure-only", async () => {
		prepareEstimate("insufficient_data");
		const { baseElement } = renderAtEstimate();
		expect(await screen.findByText("Hard to estimate from this meal")).toBeVisible();
		expect(baseElement.querySelector(".result-score")).toBeNull();
		expect(baseElement.querySelector(".result-partial-output")).not.toBeVisible();
		expect(screen.getByText("Save to History")).toBeVisible();
	});

	it("marks material drift stale but keeps meal-name and image edits saveable", async () => {
		prepareEstimate();
		useCurrentMealStore.getState().updateMealItem("oats", "amount", 2);
		renderAtEstimate();
		expect(await screen.findByText(STALE_ESTIMATE_MESSAGE)).toBeVisible();
		expect(screen.getByText("Recalculate")).toBeVisible();

		useCurrentMealStore.getState().updateMealItem("oats", "amount", 1);
		useCurrentMealStore.getState().setName("Renamed label");
		useCurrentMealStore.getState().setImage("synthetic-image");
		await waitFor(() => expect(screen.getByText("Save to History")).toBeVisible());
	});

	it("redirects a direct estimate route without in-memory state", async () => {
		useMealEstimateStore.getState().clearEstimate();
		renderAtEstimate();
		await waitFor(() => expect(window.location.pathname).toBe("/meals/new"));
		expect((await screen.findAllByText("Did we get your meal right?")).length).toBeGreaterThan(0);
	});

	it("saves the frozen estimate and replaces it with the canonical saved route", async () => {
		prepareEstimate();
		useCurrentMealStore.getState().setName("Renamed meal label");
		const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
			if (String(input).endsWith("/meals") && init?.method === "POST") {
				return {
					ok: true,
					status: 200,
					json: async () => ({ id: "saved-x", created_at: "2026-08-01T10:00:00Z", ...preview(), meal_name: "Renamed meal label" }),
				};
			}
			return { ok: true, status: 200, json: async () => [] };
		});
		vi.stubGlobal("fetch", fetchMock);
		renderAtEstimate();
		fireEvent.click((await screen.findByText("Save to History")).closest("ion-button")!);

		await waitFor(() => expect(window.location.pathname).toBe("/meals/saved/saved-x"));
		const saveCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/meals") && init?.method === "POST");
		const request = JSON.parse(String(saveCall?.[1]?.body));
		expect(request).toMatchObject({
			meal_name: "Renamed meal label",
			client_request_id: "00000000-0000-4000-8000-000000000001",
			items: [{ quantity: 1 }],
		});
		expect(usePersistentMealStore.getState().meals.map((meal) => meal.id)).toEqual(["saved-x"]);
		expect(useCurrentMealStore.getState().meal.id).not.toBe("draft-x");
	});

	it.each(["inFlight", "ambiguous"] as const)("warns that discard does not cancel an existing %s save attempt", async (phase) => {
		prepareEstimate();
		usePendingSaveStore.getState().insertIntent({
			draftId: "draft-x",
			request: {
				meal_name: "Synthetic oats",
				items: getMaterialItemsSnapshot(useCurrentMealStore.getState().meal),
				client_request_id: "00000000-0000-4000-8000-000000000001",
			},
			phase,
			lastError: null,
		});
		renderAtEstimate();
		fireEvent.click((await screen.findByText("Discard")).closest("ion-button")!);

		expect(await screen.findByText(/Discarding this draft and estimate does not cancel it/)).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Discard" }));
		expect(usePendingSaveStore.getState().intents["00000000-0000-4000-8000-000000000001"]).toBeDefined();
	});
});
