import { beforeEach, describe, expect, it } from "vitest";

import { buildCreateMealPayload } from "../api/api";
import { Meal } from "../types/Meal";
import { Unit } from "../types/MealItem";
import { currentDraftStillMatchesSaveRequest, getMaterialItemsSnapshot, isMaterialSnapshotFresh, useMealEstimateStore } from "./mealEstimateStore";

const meal = (): Meal => ({
	id: "draft-x",
	image: "synthetic-image-a",
	name: "Breakfast label",
	timestamp: 1,
	items: [
		{
			id: "one",
			name: "oats",
			servingSize: 1,
			servingUnit: Unit.Grams,
			amount: 50,
			kcalPerServing: 4,
			carbPerServing_g: 0.6,
			proteinPerServing_g: 0.2,
			fatPerServing_g: 0.1,
			satFatPerServing_g: 0.02,
			gi: 55,
			fii: 40,
		},
		{
			id: "two",
			name: "milk",
			servingSize: 1,
			servingUnit: Unit.Milliliters,
			amount: 100,
			kcalPerServing: 0.6,
			carbPerServing_g: 0.05,
			proteinPerServing_g: 0.03,
			fatPerServing_g: 0.02,
			satFatPerServing_g: 0.01,
			gi: 30,
			fii: 90,
		},
	],
});
describe("B2-2 material estimate freshness", () => {
	it.each([
		["item name", (next: Meal) => { next.items[0].name = "rolled oats"; }],
		["amount", (next: Meal) => { next.items[0].amount = 51; }],
		["unit", (next: Meal) => { next.items[0].servingUnit = Unit.Cups; }],
		["kcal", (next: Meal) => { next.items[0].kcalPerServing = 5; }],
		["carbohydrate", (next: Meal) => { next.items[0].carbPerServing_g = 0.7; }],
		["protein", (next: Meal) => { next.items[0].proteinPerServing_g = 0.3; }],
		["fat", (next: Meal) => { next.items[0].fatPerServing_g = 0.2; }],
		["saturated fat", (next: Meal) => { next.items[0].satFatPerServing_g = 0.03; }],
		["GI", (next: Meal) => { next.items[0].gi = 56; }],
		["FII", (next: Meal) => { next.items[0].fii = 41; }],
		["add", (next: Meal) => { next.items.push({ ...next.items[0], id: "three" }); }],
		["remove", (next: Meal) => { next.items.pop(); }],
		["reorder", (next: Meal) => { next.items.reverse(); }],
	] as Array<[string, (meal: Meal) => void]>) ("stales on %s", (_label, mutate) => {
		const original = meal();
		const frozen = getMaterialItemsSnapshot(original);
		const changed = structuredClone(original);
		mutate(changed);
		expect(isMaterialSnapshotFresh(changed, frozen)).toBe(false);
	});

	it("keeps meal-name-only and image-only edits fresh", () => {
		const original = meal();
		const frozen = getMaterialItemsSnapshot(original);
		expect(isMaterialSnapshotFresh({ ...original, name: "Renamed label" }, frozen)).toBe(true);
		expect(isMaterialSnapshotFresh({ ...original, image: "synthetic-image-b" }, frozen)).toBe(true);
	});

	it("keeps zero distinct from a missing optional material value", () => {
		const original = meal();
		original.items[0].proteinPerServing_g = undefined;
		const frozen = getMaterialItemsSnapshot(original);
		const changed = structuredClone(original);
		changed.items[0].proteinPerServing_g = 0;
		expect(isMaterialSnapshotFresh(changed, frozen)).toBe(false);
	});

	it("matches save ownership by normalized name and material items while excluding image", () => {
		const original = meal();
		const request = { ...buildCreateMealPayload(original), client_request_id: "request-x" };
		expect(currentDraftStillMatchesSaveRequest({ ...original, image: "synthetic-image-b" }, request)).toBe(true);
		expect(currentDraftStillMatchesSaveRequest({ ...original, name: "  Breakfast label  " }, request)).toBe(true);
		expect(currentDraftStillMatchesSaveRequest({ ...original, name: "Renamed" }, request)).toBe(false);
	});
});

describe("N1 reference recalculation keeps its requesting draft", () => {
	beforeEach(() => {
		useMealEstimateStore.getState().clearEstimate();
	});

	it("begin retains the requesting draft identity through loading", () => {
		const token = useMealEstimateStore.getState().beginReferencePreview("draft-1", 3);
		expect(typeof token).toBe("number");
		const reference = useMealEstimateStore.getState().reference;
		expect(reference.phase).toBe("loading");
		expect(reference.draftId).toBe("draft-1");
		expect(reference.materialRevision).toBe(3);
		expect(reference.result).toBeNull();
		expect(reference.saveRequestId).toBeNull();
	});

	it("fail retains the requesting draft identity with its error", () => {
		const token = useMealEstimateStore.getState().beginReferencePreview("draft-1", 3);
		expect(useMealEstimateStore.getState().failReferencePreview(token, "read_error", "reference_unknown_failure")).toBe(true);
		const reference = useMealEstimateStore.getState().reference;
		expect(reference.phase).toBe("read_error");
		expect(reference.errorCode).toBe("reference_unknown_failure");
		expect(reference.draftId).toBe("draft-1");
		expect(reference.materialRevision).toBe(3);
		expect(reference.result).toBeNull();
	});

	it("a stale token failure changes nothing", () => {
		const token = useMealEstimateStore.getState().beginReferencePreview("draft-1", 3);
		const newer = useMealEstimateStore.getState().beginReferencePreview("draft-1", 3);
		expect(newer).not.toBe(token);
		expect(useMealEstimateStore.getState().failReferencePreview(token, "read_error", "reference_unknown_failure")).toBe(false);
		expect(useMealEstimateStore.getState().reference.phase).toBe("loading");
	});

	it("clearEstimate returns to idle with no draft attached", () => {
		const token = useMealEstimateStore.getState().beginReferencePreview("draft-1", 3);
		useMealEstimateStore.getState().failReferencePreview(token, "offline", "reference_network_error");
		useMealEstimateStore.getState().clearEstimate();
		const reference = useMealEstimateStore.getState().reference;
		expect(reference.phase).toBe("idle");
		expect(reference.draftId).toBeNull();
		expect(reference.result).toBeNull();
	});
});
