import { buildCreateMealPayload, MealPreviewResponse, postMealPreviewToAPI } from "../api/api";
import { ReferenceApiError, browseReferences, previewReference } from "../api/experimentalReference";
import { ReferenceDecodeError } from "../api/referenceDecode";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { freezeMaterialItems, isMaterialSnapshotFresh, useMealEstimateStore } from "../stores/mealEstimateStore";
import type { EditableMeal } from "../types/Meal";
import { buildReferencePreviewRequest, getReferenceMaterialSnapshot, isReferenceDraft } from "./referenceDraft";

export const PREVIEW_FAILURE_MESSAGE = "We couldn't estimate this meal right now. Your draft is still here — please try again.";
export const PREVIEW_CHANGED_MESSAGE = "The meal changed while we were calculating. Calculate again to update the estimate.";

export const REFERENCE_PREVIEW_OFFLINE_MESSAGE = "We couldn't reach the reference service. Your draft is still here — no estimate was calculated.";
export const REFERENCE_PREVIEW_FAILURE_MESSAGE = "The reference service didn't answer in a usable way. Your draft is still here — no estimate was calculated.";
export const REFERENCE_CATALOG_CHANGED_MESSAGE = "The published references have changed. Review each selected reference again before calculating.";
export const REFERENCE_CATALOG_UNAVAILABLE_MESSAGE = "The published reference catalog isn't available right now, so no new estimate can be calculated.";

export type CalculateEstimateResult = "ready" | "failed" | "changed" | "superseded";

type CalculateEstimateDependencies = {
	postPreview?: typeof postMealPreviewToAPI;
	onReady?: () => void;
};
export const calculateCurrentMealEstimate = async ({
	postPreview = postMealPreviewToAPI,
	onReady,
}: CalculateEstimateDependencies = {}): Promise<CalculateEstimateResult> => {
	const draft = useCurrentMealStore.getState().meal;
	if (isReferenceDraft(draft)) return "failed";
	const payload = buildCreateMealPayload(draft);
	const frozenItems = freezeMaterialItems(payload.items);
	const token = useMealEstimateStore.getState().beginPreview();

	try {
		const preview: MealPreviewResponse = await postPreview({
			meal_name: payload.meal_name,
			items: frozenItems,
		});
		const estimateState = useMealEstimateStore.getState();
		if (estimateState.previewToken !== token) return "superseded";

		const currentDraft = useCurrentMealStore.getState().meal;
		if (isReferenceDraft(currentDraft) || currentDraft.id !== draft.id || !isMaterialSnapshotFresh(currentDraft, frozenItems)) {
			estimateState.failPreview(token, PREVIEW_CHANGED_MESSAGE);
			return "changed";
		}

		const applied = estimateState.applyPreview(token, draft.id, preview, frozenItems, crypto.randomUUID());
		if (!applied) return "superseded";
		onReady?.();
		return "ready";
	} catch (error) {
		console.error("POST /meals/preview failed:", error);
		const applied = useMealEstimateStore.getState().failPreview(token, PREVIEW_FAILURE_MESSAGE);
		return applied ? "failed" : "superseded";
	}
};

// ---------------- Reference branch ----------------

export type ReferenceCalculateResult =
	| { outcome: "ready" }
	| { outcome: "invalid"; errors: string[] }
	| { outcome: "changed" }
	| { outcome: "superseded" }
	| { outcome: "stale_catalog" }
	| { outcome: "failed"; message: string };

export type ReferenceCatalogResult = "ready" | "read_error" | "offline" | "stale";

/**
 * Loads the decoded catalog for inspection. A detected version change marks
 * every previous selection for explicit re-review; merely finding the same
 * source ID later cannot restore a selection, and network failure alone is
 * never evidence that a known version changed.
 */
export const loadReferenceCatalog = async ({ browse = browseReferences } = {}): Promise<ReferenceCatalogResult> => {
	const store = useMealEstimateStore.getState();
	store.beginCatalogLoad();
	try {
		const catalog = await browse();
		useMealEstimateStore.getState().applyCatalog(catalog);
		const draft = useCurrentMealStore.getState().meal;
		if (isReferenceDraft(draft) && draft.reviewedCatalogVersion !== null && draft.reviewedCatalogVersion !== catalog.catalog_version) {
			useCurrentMealStore.getState().markReferenceSelectionsNeedingReview();
			return "stale";
		}
		return "ready";
	} catch (error) {
		const offline = error instanceof ReferenceApiError && error.isTransportFailure;
		const code = error instanceof ReferenceApiError ? error.code : "reference_catalog_decode_failed";
		useMealEstimateStore.getState().failCatalog(offline ? "offline" : "read_error", code);
		return offline ? "offline" : "read_error";
	}
};

const describeReferenceFailure = (error: unknown): string => {
	if (error instanceof ReferenceApiError) {
		if (error.isTransportFailure) return REFERENCE_PREVIEW_OFFLINE_MESSAGE;
		if (error.code === "catalog_unavailable") return REFERENCE_CATALOG_UNAVAILABLE_MESSAGE;
	}
	return REFERENCE_PREVIEW_FAILURE_MESSAGE;
};

/**
 * N1: user-facing copy for a stored recalculation failure. The estimate route
 * keeps a failed legitimate recalculation (with retry) instead of treating it
 * as an invalid direct entry, so the persisted error code needs the same words
 * the live failure path uses. No new claims: the draft is intact and nothing
 * was calculated.
 */
export const describeReferenceErrorCode = (errorCode: string | null, phase: string): string => {
	if (phase === "offline" || errorCode === "reference_network_error") return REFERENCE_PREVIEW_OFFLINE_MESSAGE;
	if (errorCode === "catalog_unavailable") return REFERENCE_CATALOG_UNAVAILABLE_MESSAGE;
	if (errorCode === "stale_catalog_version") return REFERENCE_CATALOG_CHANGED_MESSAGE;
	if (errorCode === "draft_changed") return PREVIEW_CHANGED_MESSAGE;
	return REFERENCE_PREVIEW_FAILURE_MESSAGE;
};

/**
 * Captures token, draft ID, material revision, the ordered material snapshot
 * and catalog identity, sends the preview, and applies the result only if all
 * of them still match. A superseded or failed response can never restore a
 * savable state.
 */
export const calculateCurrentReferenceEstimate = async ({
	preview = previewReference,
	onReady,
}: { preview?: typeof previewReference; onReady?: () => void } = {}): Promise<ReferenceCalculateResult> => {
	const draft = useCurrentMealStore.getState().meal;
	if (!isReferenceDraft(draft)) return { outcome: "invalid", errors: ["This draft is not a reference draft."] };

	const mapped = buildReferencePreviewRequest(draft);
	if (!mapped.ok) return { outcome: "invalid", errors: mapped.errors };

	const draftId = draft.id;
	const materialRevision = useCurrentMealStore.getState().materialRevision;
	const snapshot = getReferenceMaterialSnapshot(draft);
	const token = useMealEstimateStore.getState().beginReferencePreview(draftId, materialRevision);

	const stillCurrent = (current: EditableMeal): boolean =>
		isReferenceDraft(current)
		&& current.id === draftId
		&& useCurrentMealStore.getState().materialRevision === materialRevision
		&& getReferenceMaterialSnapshot(current) === snapshot;

	try {
		const response = await preview(mapped.request);
		if (useMealEstimateStore.getState().previewToken !== token) return { outcome: "superseded" };
		if (!stillCurrent(useCurrentMealStore.getState().meal)) {
			useMealEstimateStore.getState().failReferencePreview(token, "read_error", "draft_changed");
			return { outcome: "changed" };
		}
		const applied = useMealEstimateStore.getState().applyReferencePreview(token, {
			draftId,
			materialRevision,
			request: mapped.request,
			result: response.assessment,
			// Unsent save UUID reserved for this ready result.
			saveRequestId: crypto.randomUUID(),
		});
		if (!applied) return { outcome: "superseded" };
		onReady?.();
		return { outcome: "ready" };
	} catch (error) {
		// R03: a failure is an outcome of THIS request and carries the same
		// ownership obligation as a success. A response that lost its race must
		// not mutate whatever draft happens to be current now.
		const stillOwnsDraft = useMealEstimateStore.getState().previewToken === token
			&& stillCurrent(useCurrentMealStore.getState().meal);
		if (error instanceof ReferenceApiError && error.status === 409 && error.code === "stale_catalog_version") {
			// The client never adopts the pin the server named; every previous
			// selection needs explicit re-review instead — but only for the draft
			// that actually made this request.
			if (!stillOwnsDraft) return { outcome: "superseded" };
			useCurrentMealStore.getState().markReferenceSelectionsNeedingReview();
			useMealEstimateStore.getState().failReferencePreview(token, "read_error", error.code);
			return { outcome: "stale_catalog" };
		}
		const offline = error instanceof ReferenceApiError && error.isTransportFailure;
		const code = error instanceof ReferenceApiError
			? error.code
			: error instanceof ReferenceDecodeError ? "reference_decode_failed" : "reference_unknown_failure";
		useMealEstimateStore.getState().failReferencePreview(token, offline ? "offline" : "read_error", code);
		return { outcome: "failed", message: describeReferenceFailure(error) };
	}
};
