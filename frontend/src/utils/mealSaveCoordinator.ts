import {
	MealModelingResponse,
	MealSaveHttpError,
	MealSaveRequestPayload,
	mapMealModelingResponseToMeal,
	postMealToAPI,
} from "../api/api";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { currentDraftStillMatchesSaveRequest, isMaterialSnapshotFresh, useMealEstimateStore } from "../stores/mealEstimateStore";
import { PendingSaveIntent, usePendingSaveStore } from "../stores/pendingSaveStore";
import { usePersistentMealStore } from "../stores/persistentMealStore";
import { armMealFlowBypass, isInternalMealFlowPath } from "./mealFlowGuard";

export const AMBIGUOUS_SAVE_MESSAGE = "The save may still have reached History. Retry this same attempt to check safely.";
export const REJECTED_SAVE_MESSAGE = "This save request was rejected and was not saved. Adjust the meal, then calculate a new estimate.";
export const CONFLICTED_SAVE_MESSAGE = "This save attempt can't be retried. Open History to check saved meals, or discard this attempt.";

export type SaveCoordinatorDependencies = {
	postMeal?: typeof postMealToAPI;
	getPath?: () => string;
	armBypass?: (destination: string) => void;
	replaceRoute?: (destination: string) => void;
};
const dependenciesWithDefaults = (dependencies: SaveCoordinatorDependencies) => ({
	postMeal: dependencies.postMeal ?? postMealToAPI,
	getPath: dependencies.getPath ?? (() => window.location.pathname),
	armBypass: dependencies.armBypass ?? armMealFlowBypass,
	replaceRoute: dependencies.replaceRoute ?? ((destination: string) => window.history.replaceState({}, "", destination)),
});

export const classifySaveFailure = (error: unknown): "ambiguous" | "rejected" | "conflicted" => {
	if (!(error instanceof MealSaveHttpError)) return "ambiguous";
	if (error.status === 409) return "conflicted";
	if (error.status === 408 || error.status === 429 || error.status >= 500) return "ambiguous";
	if (error.status >= 400 && error.status < 500) return "rejected";
	return "ambiguous";
};

export const handleSaveSuccess = (
	requestId: string,
	response: MealModelingResponse,
	dependencies: SaveCoordinatorDependencies = {},
): void => {
	const deps = dependenciesWithDefaults(dependencies);
	const intent = usePendingSaveStore.getState().intents[requestId];

	if (!intent) {
		usePersistentMealStore.getState().addMeal(mapMealModelingResponseToMeal(response, null));
		usePendingSaveStore.getState().appendNotice("A background meal save completed and was added to History.");
		return;
	}

	const currentMeal = useCurrentMealStore.getState().meal;
	const estimate = useMealEstimateStore.getState();
	const draftBelongs = currentMeal.id === intent.draftId;
	const estimateBelongs = estimate.saveRequestId === requestId;
	const currentDraftStillMatchesIntent = currentDraftStillMatchesSaveRequest(currentMeal, intent.request);
	const ownsForeground = draftBelongs
		&& estimateBelongs
		&& currentDraftStillMatchesIntent
		&& isInternalMealFlowPath(deps.getPath());
	const destination = `/meals/saved/${encodeURIComponent(response.id)}`;

	// Case A must be decided and the destination-bound bypass armed before any
	// store cleanup can re-render the app-level guard.
	if (ownsForeground) deps.armBypass(destination);

	const canonicalMeal = mapMealModelingResponseToMeal(response, draftBelongs ? currentMeal.image : null);
	usePersistentMealStore.getState().addMeal(canonicalMeal);
	usePendingSaveStore.getState().removeIntent(requestId);

	if (ownsForeground) {
		useMealEstimateStore.getState().clearEstimateIfOwnedBy(requestId);
		useCurrentMealStore.getState().resetMeal();
		deps.replaceRoute(destination);
		return;
	}

	usePendingSaveStore.getState().appendNotice(`${canonicalMeal.name} finished saving and was added to History.`);
};

export const handleSaveFailure = (requestId: string, error: unknown): void => {
	if (!usePendingSaveStore.getState().intents[requestId]) return;
	const classification = classifySaveFailure(error);
	const message = classification === "ambiguous"
		? AMBIGUOUS_SAVE_MESSAGE
		: classification === "rejected"
			? REJECTED_SAVE_MESSAGE
			: CONFLICTED_SAVE_MESSAGE;
	usePendingSaveStore.getState().setIntentPhase(requestId, classification, message);
};

const performSaveIntent = async (requestId: string, dependencies: SaveCoordinatorDependencies): Promise<boolean> => {
	const intent = usePendingSaveStore.getState().intents[requestId];
	if (!intent) return false;
	const deps = dependenciesWithDefaults(dependencies);
	try {
		const response = await deps.postMeal(intent.request);
		handleSaveSuccess(requestId, response, dependencies);
		return true;
	} catch (error) {
		console.error("POST /meals failed:", error);
		handleSaveFailure(requestId, error);
		return false;
	}
};

export const saveCurrentEstimate = async (dependencies: SaveCoordinatorDependencies = {}): Promise<boolean> => {
	const estimate = useMealEstimateStore.getState();
	const currentMeal = useCurrentMealStore.getState().meal;
	if (
		estimate.phase !== "ready" ||
		!estimate.preview ||
		!estimate.frozenItems ||
		!estimate.saveRequestId ||
		estimate.draftId !== currentMeal.id ||
		!isMaterialSnapshotFresh(currentMeal, estimate.frozenItems)
	) return false;

	const existing = usePendingSaveStore.getState().intents[estimate.saveRequestId];
	if (existing) return false;

	const request: MealSaveRequestPayload = {
		meal_name: currentMeal.name.trim() || "Untitled meal",
		items: estimate.frozenItems,
		client_request_id: estimate.saveRequestId,
	};
	const intent: PendingSaveIntent = {
		draftId: currentMeal.id,
		request,
		phase: "inFlight",
		lastError: null,
	};
	if (!usePendingSaveStore.getState().insertIntent(intent)) return false;
	return performSaveIntent(estimate.saveRequestId, dependencies);
};

export const retrySaveIntent = async (requestId: string, dependencies: SaveCoordinatorDependencies = {}): Promise<boolean> => {
	const intent = usePendingSaveStore.getState().intents[requestId];
	if (!intent || intent.phase !== "ambiguous") return false;
	if (!usePendingSaveStore.getState().setIntentPhase(requestId, "inFlight", null)) return false;
	return performSaveIntent(requestId, dependencies);
};
