import { create } from "zustand";

import { buildCreateMealPayload, CreateMealItemPayload, MealPreviewResponse, MealSaveRequestPayload } from "../api/api";
import { Meal } from "../types/Meal";

export type MealEstimatePhase = "idle" | "loading" | "ready" | "failed";

type MealEstimateState = {
	draftId: string | null;
	preview: MealPreviewResponse | null;
	frozenItems: readonly CreateMealItemPayload[] | null;
	saveRequestId: string | null;
	previewToken: number;
	phase: MealEstimatePhase;
	error: string | null;
	beginPreview: () => number;
	applyPreview: (token: number, draftId: string, preview: MealPreviewResponse, frozenItems: readonly CreateMealItemPayload[], saveRequestId: string) => boolean;
	failPreview: (token: number, error: string) => boolean;
	clearEstimate: () => void;
	clearEstimateIfOwnedBy: (saveRequestId: string) => void;
};

export const freezeMaterialItems = (items: readonly CreateMealItemPayload[]): readonly CreateMealItemPayload[] =>
	Object.freeze(items.map((item) => Object.freeze({ ...item })));

export const getMaterialItemsSnapshot = (meal: Meal): readonly CreateMealItemPayload[] =>
	freezeMaterialItems(buildCreateMealPayload(meal).items);

export const materialItemsJson = (items: readonly CreateMealItemPayload[]): string => JSON.stringify(items);

export const isMaterialSnapshotFresh = (meal: Meal, frozenItems: readonly CreateMealItemPayload[] | null): boolean =>
	frozenItems !== null && materialItemsJson(buildCreateMealPayload(meal).items) === materialItemsJson(frozenItems);

export const currentDraftStillMatchesSaveRequest = (meal: Meal, request: Readonly<MealSaveRequestPayload>): boolean => {
	const currentPayload = buildCreateMealPayload(meal);
	return currentPayload.meal_name === request.meal_name
		&& materialItemsJson(currentPayload.items) === materialItemsJson(request.items);
};

const EMPTY_ESTIMATE = {
	draftId: null,
	preview: null,
	frozenItems: null,
	saveRequestId: null,
	previewToken: 0,
	phase: "idle" as const,
	error: null,
};

// Foreground-only estimate state. Intentionally no persist middleware: a
// reload/deep-link cannot manufacture a preview or saved identity.
export const useMealEstimateStore = create<MealEstimateState>((set, get) => ({
	...EMPTY_ESTIMATE,
	beginPreview: () => {
		const token = get().previewToken + 1;
		set({ previewToken: token, phase: "loading", error: null });
		return token;
	},
	applyPreview: (token, draftId, preview, frozenItems, saveRequestId) => {
		if (get().previewToken !== token) return false;
		set({
			draftId,
			preview,
			frozenItems: freezeMaterialItems(frozenItems),
			saveRequestId,
			phase: "ready",
			error: null,
		});
		return true;
	},
	failPreview: (token, error) => {
		if (get().previewToken !== token) return false;
		set({ phase: "failed", error });
		return true;
	},
	clearEstimate: () => set((state) => ({ ...EMPTY_ESTIMATE, previewToken: state.previewToken + 1 })),
	clearEstimateIfOwnedBy: (saveRequestId) => {
		if (get().saveRequestId !== saveRequestId) return;
		set((state) => ({ ...EMPTY_ESTIMATE, previewToken: state.previewToken + 1 }));
	},
}));
