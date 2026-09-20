import { EditableMeal } from "../types/Meal";
import { AnySaveIntent, isReferenceIntent } from "../stores/pendingSaveStore";
import { currentDraftStillMatchesSaveRequest } from "../stores/mealEstimateStore";
import { isReferenceDraft } from "./referenceDraft";

export const MEAL_FLOW_PATHS = ["/meals/new", "/meals/new/ai", "/meals/estimate"] as const;

export const isInternalMealFlowPath = (pathname: string): boolean =>
	MEAL_FLOW_PATHS.some((path) => pathname === path);

export type MealFlowNavigationDecision = "allow" | "prompt-draft" | "prompt-estimate";

export const doesPendingSaveCoverCurrentDraft = ({
	meal,
	estimateDraftId,
	saveRequestId,
	intent,
	editRevision,
}: {
	meal: EditableMeal;
	estimateDraftId: string | null;
	saveRequestId: string | null;
	intent?: AnySaveIntent;
	/** The current draft's edit revision, from the current-meal store. */
	editRevision?: number;
}): boolean => {
	if (!intent) return false;
	if (isReferenceIntent(intent)) {
		// R02: matching IDs are NOT coverage. An in-flight request contains the
		// draft as it was when the request was frozen, so any edit since then —
		// amount, source, nutrition, title or photo — is work the pending save
		// does not carry. The intent records the edit revision it froze; if the
		// draft has moved on, leaving would discard that newer work silently.
		return saveRequestId === intent.requestId
			&& estimateDraftId === meal.id
			&& intent.draftId === meal.id
			&& editRevision === intent.editRevision;
	}
	if (isReferenceDraft(meal)) return false;
	return saveRequestId === intent.request.client_request_id
		&& estimateDraftId === meal.id
		&& intent.draftId === meal.id
		&& currentDraftStillMatchesSaveRequest(meal, intent.request);
};

export const decideMealFlowNavigation = ({
	fromPath,
	toPath,
	isDirtyDraft,
	hasUnsavedEstimate,
	pendingSaveCoversCurrentDraft = false,
}: {
	fromPath: string;
	toPath: string;
	isDirtyDraft: boolean;
	hasUnsavedEstimate: boolean;
	pendingSaveCoversCurrentDraft?: boolean;
}): MealFlowNavigationDecision => {
	if (isInternalMealFlowPath(fromPath) && isInternalMealFlowPath(toPath)) return "allow";
	if (!isInternalMealFlowPath(fromPath)) return "allow";
	if (pendingSaveCoversCurrentDraft) return "allow";
	if (hasUnsavedEstimate) return "prompt-estimate";
	if (isDirtyDraft) return "prompt-draft";
	return "allow";
};

// Covers both contracts: a reference draft additionally carries its reviewed
// catalog identity, which is part of what "unsaved work" means for it.
export const getDraftFingerprint = (meal: EditableMeal): string => JSON.stringify({
	image: meal.image,
	name: meal.name,
	items: meal.items,
	isAiDraft: meal.isAiDraft,
	estimate: isReferenceDraft(meal) ? undefined : meal.estimate,
	calorieSource: isReferenceDraft(meal) ? undefined : meal.calorie_source,
	reviewedCatalogVersion: isReferenceDraft(meal) ? meal.reviewedCatalogVersion : undefined,
});

export type MealFlowBaseline = { mealId: string; fingerprint: string };
let activeBaseline: MealFlowBaseline | null = null;
let recoveredBaseline: MealFlowBaseline | null = null;
export const rememberMealFlowBaseline = (baseline: MealFlowBaseline): void => { activeBaseline = baseline; };
export const getMealFlowBaseline = (mealId: string): MealFlowBaseline | null => activeBaseline?.mealId === mealId ? activeBaseline : null;
export const restoreMealFlowBaseline = (baseline: MealFlowBaseline | null): void => { recoveredBaseline = baseline; };
export const takeRecoveredMealFlowBaseline = (): MealFlowBaseline | null => {
	const baseline = recoveredBaseline;
	recoveredBaseline = null;
	return baseline;
};

let expectedBypassDestination: string | null = null;

export const armMealFlowBypass = (destination: string): void => {
	expectedBypassDestination = destination;
};

export const consumeMealFlowBypass = (destination: string): boolean => {
	if (expectedBypassDestination !== destination) return false;
	expectedBypassDestination = null;
	return true;
};

export const clearMealFlowBypassForTests = (): void => {
	expectedBypassDestination = null;
};
