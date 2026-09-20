import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { useCurrentMealStore, getLegacyCurrentMeal } from "../../stores/currentMealStore";
import { getMaterialItemsSnapshot, useMealEstimateStore } from "../../stores/mealEstimateStore";
import { usePendingSaveStore } from "../../stores/pendingSaveStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { Unit } from "../../types/MealItem";
import { AMBIGUOUS_SAVE_MESSAGE, CONFLICTED_SAVE_MESSAGE, REJECTED_SAVE_MESSAGE } from "../../utils/mealSaveCoordinator";
import {
	RECALCULATING_ESTIMATE_MESSAGE,
	RECALCULATION_FAILURE_MESSAGE,
	STALE_ESTIMATE_MESSAGE,
} from "./MealEstimate";

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

	it("presents a complete fresh result with one persistence action and contextual adjustment", async () => {
		prepareEstimate();
		const { baseElement } = renderAtEstimate();
		expect(await screen.findByText("Relative score: 67")).toBeVisible();
		expect(screen.queryByText(/Estimate only|Not saved|Not in History|Unsaved|Temporary/i)).toBeNull();
		expect(screen.getByText("Relative score: 67")).toBeVisible();
		expect(screen.queryByText(/^Logged /)).toBeNull();
		expect(screen.getAllByText("Save to History")).toHaveLength(1);
		expect(screen.getByText("Adjust meal").closest("main")).toBe(baseElement.querySelector("main"));
		expect(baseElement.querySelector("ion-footer")).not.toHaveTextContent("Adjust meal");
		expect(screen.queryByText("Discard")).toBeNull();
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
		const { baseElement } = renderAtEstimate();
		expect(await screen.findByText(STALE_ESTIMATE_MESSAGE)).toBeVisible();
		expect(screen.getByText(STALE_ESTIMATE_MESSAGE).closest("[role='status']")).toHaveAttribute("aria-live", "polite");
		expect(screen.getByText("Relative score: 67")).toBeVisible();
		expect(screen.getByText("Recalculate")).toBeVisible();
		expect(screen.queryByText("Save to History")).toBeNull();
		expect(baseElement.querySelector(".result-score")).not.toHaveClass("result-evidence-muted");

		act(() => {
			useCurrentMealStore.getState().updateMealItem("oats", "amount", 1);
			useCurrentMealStore.getState().setName("Renamed label");
			useCurrentMealStore.getState().setImage("synthetic-image");
		});
		await waitFor(() => expect(screen.getByText("Save to History")).toBeVisible());
	});

	it("keeps the previous result visible and announces inline recalculation activity", async () => {
		prepareEstimate();
		useCurrentMealStore.getState().updateMealItem("oats", "amount", 2);
		let resolvePreview: ((response: unknown) => void) | undefined;
		vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolvePreview = resolve; })));
		const { baseElement } = renderAtEstimate();

		fireEvent.click((await screen.findByText("Recalculate")).closest("ion-button")!);

		expect(await screen.findByText(RECALCULATING_ESTIMATE_MESSAGE)).toBeVisible();
		expect(screen.getByText("Relative score: 67")).toBeVisible();
		expect((screen.getByText("Recalculate").closest("ion-button") as HTMLIonButtonElement).disabled).toBe(true);
		expect(baseElement.querySelector("ion-loading")).toBeNull();

		resolvePreview?.({ ok: true, status: 200, json: async () => preview() });
		await waitFor(() => expect(screen.getByText("Save to History")).toBeVisible());
	});

	it("keeps the older result stale and retryable after recalculation failure", async () => {
		prepareEstimate();
		useCurrentMealStore.getState().updateMealItem("oats", "amount", 2);
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("synthetic offline"); }));
		renderAtEstimate();

		fireEvent.click((await screen.findByText("Recalculate")).closest("ion-button")!);

		expect(await screen.findByText(RECALCULATION_FAILURE_MESSAGE)).toBeVisible();
		expect(screen.getByText(STALE_ESTIMATE_MESSAGE)).toBeVisible();
		expect(screen.getByText("Relative score: 67")).toBeVisible();
		expect(screen.getByText("Recalculate")).toBeVisible();
		expect(screen.queryByText("Save to History")).toBeNull();
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

	it("keeps the result unchanged while persistence activity stays in the footer", async () => {
		prepareEstimate();
		let resolveSave: ((response: unknown) => void) | undefined;
		vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolveSave = resolve; })));
		const { baseElement } = renderAtEstimate();

		fireEvent.click((await screen.findByText("Save to History")).closest("ion-button")!);

		expect(await screen.findByText("Saving to History…")).toBeVisible();
		expect(screen.getByText("Relative score: 67")).toBeVisible();
		expect(screen.queryByText(RECALCULATING_ESTIMATE_MESSAGE)).toBeNull();
		expect(baseElement.querySelector("ion-loading")).toBeNull();
		expect(screen.queryByLabelText("Meal save status")).toBeNull();

		resolveSave?.({ ok: true, status: 200, json: async () => ({ id: "saved-later", created_at: "2026-08-01T10:00:00Z", ...preview() }) });
		await waitFor(() => expect(window.location.pathname).toBe("/meals/saved/saved-later"));
	});

	it("owns ambiguous persistence in the footer and retries the same idempotent request", async () => {
		prepareEstimate();
		usePendingSaveStore.getState().insertIntent({
			draftId: "draft-x",
			request: {
				meal_name: "Synthetic oats",
				items: getMaterialItemsSnapshot(getLegacyCurrentMeal()),
				client_request_id: "00000000-0000-4000-8000-000000000001",
			},
			phase: "ambiguous",
			lastError: AMBIGUOUS_SAVE_MESSAGE,
		});
		const fetchMock = vi.fn(async (...args: [unknown, RequestInit?]) => {
			void args;
			return {
				ok: true,
				status: 200,
				json: async () => ({ id: "saved-retry", created_at: "2026-08-01T10:00:00Z", ...preview() }),
			};
		});
		vi.stubGlobal("fetch", fetchMock);
		renderAtEstimate();

		expect(await screen.findByText(AMBIGUOUS_SAVE_MESSAGE)).toBeVisible();
		expect(screen.getAllByText(AMBIGUOUS_SAVE_MESSAGE)).toHaveLength(1);
		expect(screen.queryByLabelText("Meal save status")).toBeNull();
		fireEvent.click(screen.getByText("Retry this save").closest("ion-button")!);

		await waitFor(() => expect(window.location.pathname).toBe("/meals/saved/saved-retry"));
		const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
		expect(request.client_request_id).toBe("00000000-0000-4000-8000-000000000001");
	});

	it("moves an ambiguous save to the global surface after a title-only rename", async () => {
		prepareEstimate();
		usePendingSaveStore.getState().insertIntent({
			draftId: "draft-x",
			request: {
				meal_name: "Synthetic oats",
				items: getMaterialItemsSnapshot(getLegacyCurrentMeal()),
				client_request_id: "00000000-0000-4000-8000-000000000001",
			},
			phase: "ambiguous",
			lastError: AMBIGUOUS_SAVE_MESSAGE,
		});
		useCurrentMealStore.getState().setName("Renamed synthetic oats");
		renderAtEstimate();

		expect(await screen.findByLabelText("Meal save status")).toBeVisible();
		expect(screen.getAllByText(AMBIGUOUS_SAVE_MESSAGE)).toHaveLength(1);
		expect(screen.getAllByText("Retry this save")).toHaveLength(1);
		expect((screen.getByText("Save attempt pending").closest("ion-button") as HTMLIonButtonElement).disabled).toBe(true);
		expect(screen.queryByText("Save to History")).toBeNull();
	});

	it.each([
		["rejected", REJECTED_SAVE_MESSAGE, "Save was not completed", "Edit meal"],
		["conflicted", CONFLICTED_SAVE_MESSAGE, "Save needs review", "Open History"],
	] as const)("keeps %s recovery in the global save-status surface without offering a normal save", async (phase, message, footerLabel, recoveryAction) => {
		prepareEstimate();
		usePendingSaveStore.getState().insertIntent({
			draftId: "draft-x",
			request: {
				meal_name: "Synthetic oats",
				items: getMaterialItemsSnapshot(getLegacyCurrentMeal()),
				client_request_id: "00000000-0000-4000-8000-000000000001",
			},
			phase,
			lastError: message,
		});
		renderAtEstimate();

		expect(await screen.findByText(message)).toBeVisible();
		expect((screen.getByText(footerLabel).closest("ion-button") as HTMLIonButtonElement).disabled).toBe(true);
		expect(screen.getByText(recoveryAction)).toBeVisible();
		expect(screen.getByText("Discard this save attempt")).toBeVisible();
		expect(screen.queryByLabelText("Save to History")).toBeNull();
	});
});
