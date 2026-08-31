import { beforeEach, describe, expect, it, vi } from "vitest";

import { MealPreviewResponse } from "../api/api";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { useMealEstimateStore } from "../stores/mealEstimateStore";
import { usePersistentMealStore } from "../stores/persistentMealStore";
import { Meal } from "../types/Meal";
import { Unit } from "../types/MealItem";
import { calculateCurrentMealEstimate } from "./mealEstimateWorkflow";

const draft = (): Meal => ({
	id: "draft-x",
	image: null,
	name: "Synthetic oats",
	timestamp: 1,
	items: [{ id: "oats", name: "oats", servingSize: 1, servingUnit: Unit.Grams, amount: 50, kcalPerServing: 4, carbPerServing_g: 0.6, satFatPerServing_g: 0.02, gi: 55 }],
});

const preview = (name: string): MealPreviewResponse => ({
	meal_name: name,
	items: [],
	insulin_load_total: 10,
	acute_score: 33,
	kcal_total: 200,
	carbs_total: 30,
	protein_total: 8,
	fat_total: 4,
	estimate_quality: "high",
	estimate_status: "estimated",
	main_insulin_drivers: [],
	persisted: false,
});

const deferred = <T,>() => {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
	return { promise, resolve, reject };
};

describe("B2-2 preview authority workflow", () => {
	beforeEach(() => {
		useCurrentMealStore.setState({ meal: draft() });
		useMealEstimateStore.getState().clearEstimate();
		usePersistentMealStore.setState({ meals: [] });
	});

	it("mints one save UUID only after a successful preview and never persists preview", async () => {
		const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
		const onReady = vi.fn();
		await expect(calculateCurrentMealEstimate({ postPreview: vi.fn(async () => preview("X")), onReady })).resolves.toBe("ready");
		expect(uuid).toHaveBeenCalledTimes(1);
		expect(useMealEstimateStore.getState()).toMatchObject({ draftId: "draft-x", saveRequestId: "00000000-0000-4000-8000-000000000001", phase: "ready" });
		expect(usePersistentMealStore.getState().meals).toEqual([]);
		expect(onReady).toHaveBeenCalledTimes(1);
		uuid.mockRestore();
	});

	it("drops a preview response after material drift", async () => {
		const pending = deferred<MealPreviewResponse>();
		const calculation = calculateCurrentMealEstimate({ postPreview: () => pending.promise });
		useCurrentMealStore.getState().updateMealItem("oats", "amount", 60);
		pending.resolve(preview("stale"));
		expect(await calculation).toBe("changed");
		expect(useMealEstimateStore.getState()).toMatchObject({ preview: null, phase: "failed" });
	});

	it("drops an older response after a newer Calculate owns authority", async () => {
		const older = deferred<MealPreviewResponse>();
		const newer = deferred<MealPreviewResponse>();
		const first = calculateCurrentMealEstimate({ postPreview: () => older.promise });
		const second = calculateCurrentMealEstimate({ postPreview: () => newer.promise });
		newer.resolve(preview("newer"));
		expect(await second).toBe("ready");
		older.resolve(preview("older"));
		expect(await first).toBe("superseded");
		expect(useMealEstimateStore.getState().preview?.meal_name).toBe("newer");
	});

	it("retains an older stale estimate when recalculation fails", async () => {
		await calculateCurrentMealEstimate({ postPreview: vi.fn(async () => preview("original")) });
		const original = useMealEstimateStore.getState();
		useCurrentMealStore.getState().updateMealItem("oats", "amount", 60);
		await expect(calculateCurrentMealEstimate({ postPreview: vi.fn(async () => { throw new TypeError("offline"); }) })).resolves.toBe("failed");
		const failed = useMealEstimateStore.getState();
		expect(failed.preview).toBe(original.preview);
		expect(failed.saveRequestId).toBe(original.saveRequestId);
		expect(failed.phase).toBe("failed");
	});
});
