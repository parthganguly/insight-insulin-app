import { beforeEach, describe, expect, it, vi } from "vitest";

import { MealModelingResponse, MealPreviewResponse, MealSaveHttpError, MealSaveRequestPayload } from "../api/api";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { getMaterialItemsSnapshot, useMealEstimateStore } from "../stores/mealEstimateStore";
import { usePendingSaveStore } from "../stores/pendingSaveStore";
import { usePersistentMealStore } from "../stores/persistentMealStore";
import { Meal } from "../types/Meal";
import { Unit } from "../types/MealItem";
import { handleSaveFailure, handleSaveSuccess, retrySaveIntent, saveCurrentEstimate } from "./mealSaveCoordinator";

const draft = (id: string, name: string, amount = 1, image: string | null = null): Meal => ({
	id,
	image,
	name,
	timestamp: 1,
	items: [{ id: `${id}-item`, name: "oats", servingSize: 1, servingUnit: Unit.Servings, amount, kcalPerServing: 200, carbPerServing_g: 30, satFatPerServing_g: 1, gi: 55 }],
});

const preview = (name: string): MealPreviewResponse => ({
	meal_name: name,
	items: [{ name: "oats", quantity: 1, unit: "serving", kcalPerUnit: 200, carb_g: 30, satFat_g: 1, gi: 55, kcal_item: 200, insulin_load: 20, confidence: 1, fii_source: "exact_fii" }],
	insulin_load_total: 20,
	acute_score: 67,
	kcal_total: 200,
	carbs_total: 30,
	protein_total: 5,
	fat_total: 3,
	estimate_quality: "high",
	estimate_status: "estimated",
	main_insulin_drivers: ["oats"],
	persisted: false,
});

const response = (id: string, name: string): MealModelingResponse => ({
	id,
	created_at: "2026-08-01T10:00:00Z",
	...preview(name),
});

const deferred = <T,>() => {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
	return { promise, resolve, reject };
};

const makeReady = (meal: Meal, requestId: string) => {
	useCurrentMealStore.setState({ meal });
	const store = useMealEstimateStore.getState();
	const token = store.beginPreview();
	store.applyPreview(token, meal.id, preview(meal.name), getMaterialItemsSnapshot(meal), requestId);
};

describe("B2-2 request-bound save coordination", () => {
	beforeEach(() => {
		useMealEstimateStore.getState().clearEstimate();
		usePendingSaveStore.getState().clearAll();
		usePersistentMealStore.setState({ meals: [] });
		useCurrentMealStore.setState({ meal: draft("blank", "Blank") });
	});

	it("freezes material items and the live meal name on first send", async () => {
		makeReady(draft("x", "Breakfast", 1), "request-x");
		const pending = deferred<MealModelingResponse>();
		const postMeal = vi.fn((request: MealSaveRequestPayload) => {
			void request;
			return pending.promise;
		});
		const saving = saveCurrentEstimate({ postMeal });
		const firstRequest = postMeal.mock.calls[0][0];
		useCurrentMealStore.getState().setName("Renamed after send");
		useCurrentMealStore.getState().updateMealItem("x-item", "amount", 9);
		expect(firstRequest).toMatchObject({ meal_name: "Breakfast", client_request_id: "request-x", items: [{ quantity: 1 }] });
		pending.resolve(response("saved-x", "Breakfast"));
		await saving;
	});

	it("retries the exact frozen request and request id after an ambiguous failure", async () => {
		makeReady(draft("x", "Breakfast"), "request-x");
		const postMeal = vi.fn()
			.mockRejectedValueOnce(new TypeError("offline"))
			.mockResolvedValueOnce(response("saved-x", "Breakfast"));
		await saveCurrentEstimate({ postMeal });
		const frozenRequest = postMeal.mock.calls[0][0];
		expect(usePendingSaveStore.getState().intents["request-x"].phase).toBe("ambiguous");
		useCurrentMealStore.getState().setName("Name must not drift");
		await retrySaveIntent("request-x", { postMeal, getPath: () => "/dashboard" });
		expect(postMeal.mock.calls[1][0]).toBe(frozenRequest);
		expect(postMeal.mock.calls[1][0].client_request_id).toBe("request-x");
	});

	it.each(["x-then-y", "y-then-x"])("keeps simultaneous X/Y responses closure-associated when resolving %s", async (order) => {
		const x = deferred<MealModelingResponse>();
		const y = deferred<MealModelingResponse>();
		const postMeal = vi.fn((request: MealSaveRequestPayload) => request.client_request_id === "request-x" ? x.promise : y.promise);
		const navigate = vi.fn();

		makeReady(draft("x", "Breakfast X", 1, "image-x"), "request-x");
		const saveX = saveCurrentEstimate({ postMeal, getPath: () => "/meals/estimate", replaceRoute: navigate });
		makeReady(draft("y", "Lunch Y", 2, "image-y"), "request-y");
		const yBefore = structuredClone(useCurrentMealStore.getState().meal);
		const estimateYBefore = useMealEstimateStore.getState();
		const saveY = saveCurrentEstimate({ postMeal, getPath: () => "/meals/estimate", replaceRoute: navigate });

		if (order === "x-then-y") {
			x.resolve(response("saved-x", "Breakfast X"));
			await saveX;
			expect(useCurrentMealStore.getState().meal).toEqual(yBefore);
			expect(useMealEstimateStore.getState().saveRequestId).toBe(estimateYBefore.saveRequestId);
			y.resolve(response("saved-y", "Lunch Y"));
			await saveY;
		} else {
			y.resolve(response("saved-y", "Lunch Y"));
			await saveY;
			x.resolve(response("saved-x", "Breakfast X"));
			await saveX;
		}

		expect(usePersistentMealStore.getState().meals.map((meal) => meal.id).sort()).toEqual(["saved-x", "saved-y"]);
		expect(usePendingSaveStore.getState().intents).toEqual({});
	});

	it("merges a missing-intent late success imageless without UI cleanup or navigation", () => {
		makeReady(draft("y", "Lunch Y", 1, "image-y"), "request-y");
		const beforeDraft = structuredClone(useCurrentMealStore.getState().meal);
		const beforeEstimate = useMealEstimateStore.getState();
		const navigate = vi.fn();
		handleSaveSuccess("burned-x", response("saved-x", "Breakfast X"), { replaceRoute: navigate });
		expect(usePersistentMealStore.getState().meals[0]).toMatchObject({ id: "saved-x", image: null });
		expect(useCurrentMealStore.getState().meal).toEqual(beforeDraft);
		expect(useMealEstimateStore.getState().saveRequestId).toBe(beforeEstimate.saveRequestId);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("makes a missing-intent late failure a no-op", () => {
		const beforeIntents = structuredClone(usePendingSaveStore.getState().intents);
		const beforeNotices = structuredClone(usePendingSaveStore.getState().notices);
		handleSaveFailure("missing", new TypeError("offline"));
		expect(usePendingSaveStore.getState().intents).toEqual(beforeIntents);
		expect(usePendingSaveStore.getState().notices).toEqual(beforeNotices);
	});

	it("classifies 422 as rejected without Retry language and 409 affects only its own intent", async () => {
		makeReady(draft("x", "Breakfast X"), "request-x");
		await saveCurrentEstimate({ postMeal: vi.fn(async () => { throw new MealSaveHttpError(422, "raw detail"); }) });
		const rejected = usePendingSaveStore.getState().intents["request-x"];
		expect(rejected.phase).toBe("rejected");
		expect(rejected.lastError).toContain("was rejected");
		expect(rejected.lastError).not.toContain("may");

		makeReady(draft("y", "Lunch Y"), "request-y");
		const y = deferred<MealModelingResponse>();
		const saveY = saveCurrentEstimate({ postMeal: () => y.promise });
		handleSaveFailure("request-x", new MealSaveHttpError(409, "raw conflict"));
		expect(usePendingSaveStore.getState().intents["request-x"].phase).toBe("conflicted");
		expect(usePendingSaveStore.getState().intents["request-y"].phase).toBe("inFlight");
		y.resolve(response("saved-y", "Lunch Y"));
		await saveY;
	});

	it("arms the Case-A destination before cleanup and adds exactly one canonical meal", async () => {
		makeReady(draft("x", "Breakfast X", 1, "image-x"), "request-x");
		const armBypass = vi.fn(() => {
			expect(useCurrentMealStore.getState().meal.id).toBe("x");
			expect(useMealEstimateStore.getState().saveRequestId).toBe("request-x");
		});
		const replaceRoute = vi.fn();
		await saveCurrentEstimate({ postMeal: vi.fn(async () => response("saved-x", "Breakfast X")), getPath: () => "/meals/estimate", armBypass, replaceRoute });
		expect(armBypass.mock.invocationCallOrder[0]).toBeLessThan(replaceRoute.mock.invocationCallOrder[0]);
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
		expect(usePersistentMealStore.getState().meals[0]).toMatchObject({ id: "saved-x", image: "image-x" });
		expect(useCurrentMealStore.getState().meal.id).not.toBe("x");
		expect(useMealEstimateStore.getState().preview).toBeNull();
	});

	it("gives Case B merge authority but never bypass or navigation authority", async () => {
		makeReady(draft("x", "Breakfast X"), "request-x");
		const pending = deferred<MealModelingResponse>();
		const armBypass = vi.fn();
		const replaceRoute = vi.fn();
		const saving = saveCurrentEstimate({ postMeal: () => pending.promise, getPath: () => "/dashboard", armBypass, replaceRoute });
		pending.resolve(response("saved-x", "Breakfast X"));
		await saving;
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
		expect(armBypass).not.toHaveBeenCalled();
		expect(replaceRoute).not.toHaveBeenCalled();
	});

	it("does not clear a newer estimate for the same draft when old R_X succeeds", async () => {
		makeReady(draft("x", "Breakfast X"), "request-x");
		const pending = deferred<MealModelingResponse>();
		const saving = saveCurrentEstimate({ postMeal: () => pending.promise });
		makeReady(useCurrentMealStore.getState().meal, "request-x2");
		pending.resolve(response("saved-x", "Breakfast X"));
		await saving;
		expect(useMealEstimateStore.getState().saveRequestId).toBe("request-x2");
	});

	it("rechecks freshness inside the save action", async () => {
		makeReady(draft("x", "Breakfast X"), "request-x");
		useCurrentMealStore.getState().updateMealItem("x-item", "amount", 2);
		const postMeal = vi.fn();
		await expect(saveCurrentEstimate({ postMeal })).resolves.toBe(false);
		expect(postMeal).not.toHaveBeenCalled();
		expect(usePendingSaveStore.getState().intents).toEqual({});
	});
});
