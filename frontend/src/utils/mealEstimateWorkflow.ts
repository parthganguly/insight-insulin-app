import { buildCreateMealPayload, MealPreviewResponse, postMealPreviewToAPI } from "../api/api";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { freezeMaterialItems, isMaterialSnapshotFresh, useMealEstimateStore } from "../stores/mealEstimateStore";

export const PREVIEW_FAILURE_MESSAGE = "We couldn't estimate this meal right now. Your draft is still here — please try again.";
export const PREVIEW_CHANGED_MESSAGE = "The meal changed while we were calculating. Calculate again to update the estimate.";

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
		if (currentDraft.id !== draft.id || !isMaterialSnapshotFresh(currentDraft, frozenItems)) {
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
