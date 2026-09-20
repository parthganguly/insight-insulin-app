import { create } from "zustand";

import { buildCreateMealPayload, CreateMealItemPayload, MealPreviewResponse, MealSaveRequestPayload } from "../api/api";
import { Meal } from "../types/Meal";
import type { CatalogBrowse, ReferencePreviewRequest, ReferenceResult } from "../types/experimentalReference";

export type MealEstimatePhase = "idle" | "loading" | "ready" | "failed";

/** Reference transport lifecycle. Scientific availability is a field of the
 * validated result, never another transport phase. */
export type ReferencePreviewPhase = "idle" | "loading" | "ready" | "read_error" | "offline";

/** Catalog load state lives in this same owner; no full catalog is persisted. */
export type ReferenceCatalogPhase = "not_loaded" | "loading" | "ready" | "read_error" | "offline";

export type ReferenceEstimateState = {
	draftId: string | null;
	materialRevision: number | null;
	/** Deeply frozen, ordered request exactly as it was sent. */
	frozenRequest: Readonly<ReferencePreviewRequest> | null;
	result: Readonly<ReferenceResult> | null;
	/** Unsent save UUID reserved for this ready result. */
	saveRequestId: string | null;
	phase: ReferencePreviewPhase;
	errorCode: string | null;
};

export type ReferenceCatalogState = {
	phase: ReferenceCatalogPhase;
	catalog: CatalogBrowse | null;
	errorCode: string | null;
};

type MealEstimateState = {
	/** Which contract owns the currently held preview. */
	contract: "legacy" | "reference";
	draftId: string | null;
	preview: MealPreviewResponse | null;
	frozenItems: readonly CreateMealItemPayload[] | null;
	saveRequestId: string | null;
	previewToken: number;
	phase: MealEstimatePhase;
	error: string | null;
	reference: ReferenceEstimateState;
	catalog: ReferenceCatalogState;
	beginPreview: () => number;
	applyPreview: (token: number, draftId: string, preview: MealPreviewResponse, frozenItems: readonly CreateMealItemPayload[], saveRequestId: string) => boolean;
	failPreview: (token: number, error: string) => boolean;
	clearEstimate: () => void;
	clearEstimateIfOwnedBy: (saveRequestId: string) => void;

	beginReferencePreview: (draftId: string | null, materialRevision: number | null) => number;
	applyReferencePreview: (token: number, applied: {
		draftId: string;
		materialRevision: number;
		request: ReferencePreviewRequest;
		result: ReferenceResult;
		saveRequestId: string;
	}) => boolean;
	failReferencePreview: (token: number, phase: "read_error" | "offline", errorCode: string) => boolean;

	beginCatalogLoad: () => void;
	applyCatalog: (catalog: CatalogBrowse) => void;
	failCatalog: (phase: "read_error" | "offline", errorCode: string) => void;
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

/** Deep freeze so a ready reference request cannot be edited in place later. */
export const freezeReferenceRequest = (request: ReferencePreviewRequest): Readonly<ReferencePreviewRequest> =>
	Object.freeze({
		meal_name: request.meal_name,
		expected_catalog_version: request.expected_catalog_version,
		items: Object.freeze(request.items.map((item) => Object.freeze({ ...item }))) as ReferencePreviewRequest["items"],
	});

const EMPTY_REFERENCE: ReferenceEstimateState = {
	draftId: null,
	materialRevision: null,
	frozenRequest: null,
	result: null,
	saveRequestId: null,
	phase: "idle",
	errorCode: null,
};

const EMPTY_ESTIMATE = {
	contract: "legacy" as const,
	draftId: null,
	preview: null,
	frozenItems: null,
	saveRequestId: null,
	previewToken: 0,
	phase: "idle" as const,
	error: null,
	reference: EMPTY_REFERENCE,
};

// Foreground-only estimate state. Intentionally no persist middleware: a
// reload or deep link cannot manufacture a preview or a saved identity, and
// journal restoration never claims an active draft.
export const useMealEstimateStore = create<MealEstimateState>((set, get) => ({
	...EMPTY_ESTIMATE,
	catalog: { phase: "not_loaded", catalog: null, errorCode: null },

	beginPreview: () => {
		const token = get().previewToken + 1;
		set({ previewToken: token, contract: "legacy", phase: "loading", error: null, reference: EMPTY_REFERENCE });
		return token;
	},
	applyPreview: (token, draftId, preview, frozenItems, saveRequestId) => {
		if (get().previewToken !== token) return false;
		set({
			contract: "legacy",
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
		const state = get();
		const owned = state.contract === "reference"
			? state.reference.saveRequestId === saveRequestId
			: state.saveRequestId === saveRequestId;
		if (!owned) return;
		set({ ...EMPTY_ESTIMATE, previewToken: state.previewToken + 1 });
	},

	beginReferencePreview: (draftId, materialRevision) => {
		const token = get().previewToken + 1;
		// Recalculation makes the old result non-savable immediately: the
		// unsent save UUID and the validated result both go before the
		// request is even dispatched. The requesting draft stays attached so
		// the estimate route can tell a legitimate in-flight recalculation
		// for this draft from a genuine deep-link without estimate state.
		set({
			previewToken: token,
			contract: "reference",
			phase: "loading",
			preview: null,
			frozenItems: null,
			draftId: null,
			saveRequestId: null,
			error: null,
			reference: { ...EMPTY_REFERENCE, phase: "loading", draftId, materialRevision },
		});
		return token;
	},
	applyReferencePreview: (token, applied) => {
		if (get().previewToken !== token) return false;
		set({
			contract: "reference",
			phase: "ready",
			reference: {
				draftId: applied.draftId,
				materialRevision: applied.materialRevision,
				frozenRequest: freezeReferenceRequest(applied.request),
				result: Object.freeze(applied.result),
				saveRequestId: applied.saveRequestId,
				phase: "ready",
				errorCode: null,
			},
		});
		return true;
	},
	failReferencePreview: (token, phase, errorCode) => {
		if (get().previewToken !== token) return false;
		// A failed or superseded response can never restore ready state. The
		// requesting draft stays attached so the estimate route can keep a
		// failed legitimate recalculation (with retry) instead of treating it
		// as an invalid direct entry.
		const { draftId, materialRevision } = get().reference;
		set({ contract: "reference", phase: "failed", reference: { ...EMPTY_REFERENCE, phase, errorCode, draftId, materialRevision } });
		return true;
	},

	beginCatalogLoad: () => set((state) => ({ catalog: { ...state.catalog, phase: "loading", errorCode: null } })),
	applyCatalog: (catalog) => set({ catalog: { phase: "ready", catalog, errorCode: null } }),
	failCatalog: (phase, errorCode) => set((state) => ({
		// A network failure alone is not evidence that a known version changed,
		// so the last decoded catalog stays available for inspection.
		catalog: { phase, catalog: state.catalog.catalog, errorCode },
	})),
}));
