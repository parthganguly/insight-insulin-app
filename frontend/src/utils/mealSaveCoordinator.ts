import {
	MealModelingResponse,
	MealSaveHttpError,
	MealSaveRequestPayload,
	mapMealModelingResponseToMeal,
	postMealToAPI,
} from "../api/api";
import {
	ReferenceApiError,
	postReferenceSaveJson,
	referenceSaveEndpoint,
	referenceWireBody,
} from "../api/experimentalReference";
import {
	ReferenceDecodeError,
	parseWireSaveRequest,
	savedResponseConfirmsWireRequest,
} from "../api/referenceDecode";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { currentDraftStillMatchesSaveRequest, isMaterialSnapshotFresh, useMealEstimateStore } from "../stores/mealEstimateStore";
import {
	PendingSaveIntent,
	ReferenceSaveIntent,
	ReferenceSavePhase,
	isReferenceIntent,
	removeJournalEntry,
	usePendingSaveStore,
} from "../stores/pendingSaveStore";
import { takeCacheWriteFailure, upsertReferenceSave, usePersistentMealStore } from "../stores/persistentMealStore";
import { armMealFlowBypass, isInternalMealFlowPath } from "./mealFlowGuard";
import { buildReferenceSaveRequest, isReferenceDraft } from "./referenceDraft";

export const AMBIGUOUS_SAVE_MESSAGE = "The save may still have reached History. Retry this same attempt to check safely.";
export const REJECTED_SAVE_MESSAGE = "This save request was rejected and was not saved. Adjust the meal, then calculate a new estimate.";
export const CONFLICTED_SAVE_MESSAGE = "This save attempt can't be retried. Open History to check saved meals, or discard this attempt.";

export const REFERENCE_STALE_CATALOG_MESSAGE = "The published references changed before this meal was saved, so nothing was written. Review your selections, then calculate again.";
export const REFERENCE_ENDPOINT_MISMATCH_MESSAGE = "This saved attempt was made against a different server address, so it was not sent. Restore that address to retry it safely.";
export const REFERENCE_JOURNAL_WRITE_FAILED_MESSAGE = "This device couldn't record the save attempt, so nothing was sent. Your draft and estimate are still here.";
export const REFERENCE_CACHE_UNAVAILABLE_MESSAGE = "Saved on server; offline copy unavailable on this device.";
export const REFERENCE_CLEANUP_REQUIRED_MESSAGE = "Saved on server. This device still has to clear the retry record before you can save or delete again.";
export const REFERENCE_DISCARD_WARNING = "Discarding only clears this device's retry record. The server may already hold this meal — check History.";
export const REFERENCE_JOURNAL_UNREADABLE_MESSAGE = "This device can't read its saved retry records, so nothing was sent. Resolve that first to save again.";
export const REFERENCE_RECOVERY_ERROR_BLOCKS_MESSAGE = "An unreadable retry record is still on this device, so nothing was sent. Remove it explicitly, then save again.";
export const REFERENCE_UNRESOLVED_SAVE_BLOCKS_MESSAGE = "This meal already has an unresolved save attempt, so nothing was sent. Retry or discard that attempt first.";

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

	if (!intent || isReferenceIntent(intent)) {
		usePersistentMealStore.getState().addMeal(mapMealModelingResponseToMeal(response, null));
		usePendingSaveStore.getState().appendNotice("A background meal save completed and was added to History.");
		return;
	}

	const currentMeal = useCurrentMealStore.getState().meal;
	if (isReferenceDraft(currentMeal)) {
		usePersistentMealStore.getState().addMeal(mapMealModelingResponseToMeal(response, null));
		usePendingSaveStore.getState().removeIntent(requestId);
		usePendingSaveStore.getState().appendNotice("A background meal save completed and was added to History.");
		return;
	}

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
	const intent = usePendingSaveStore.getState().intents[requestId];
	if (!intent || isReferenceIntent(intent)) return;
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
	if (!intent || isReferenceIntent(intent)) return false;
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
	if (isReferenceDraft(currentMeal)) return false;
	if (
		estimate.contract !== "legacy" ||
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
	if (!intent || isReferenceIntent(intent)) return retryReferenceSaveIntent(requestId, dependencies);
	if (intent.phase !== "ambiguous") return false;
	if (!usePendingSaveStore.getState().setIntentPhase(requestId, "inFlight", null)) return false;
	return performSaveIntent(requestId, dependencies);
};

// ---------------- Reference branch ----------------

export const referenceSaveCopy: Record<ReferenceSavePhase, string> = {
	inFlight: "Saving this meal in the background…",
	ambiguous: AMBIGUOUS_SAVE_MESSAGE,
	rejected: REJECTED_SAVE_MESSAGE,
	stale_catalog: REFERENCE_STALE_CATALOG_MESSAGE,
	conflicted: CONFLICTED_SAVE_MESSAGE,
};

// One fetch per request ID at a time, with an in-memory attempt token so a
// callback can only apply to the live intent and attempt it belongs to. A
// callback arriving after an explicit discard, a completed cleanup or a
// deletion cannot reach the no-intent insertion fallback.
const attemptTokens = new Map<string, number>();
const inFlightRequests = new Set<string>();

export const isReferenceSaveInFlight = (requestId: string): boolean => inFlightRequests.has(requestId);

export const resetReferenceSaveAttemptsForTests = (): void => {
	attemptTokens.clear();
	inFlightRequests.clear();
};

export const classifyReferenceSaveFailure = (error: unknown): { phase: ReferenceSavePhase; code: string } => {
	if (error instanceof ReferenceDecodeError) {
		// A malformed 2xx is ambiguous, never a rejection: the row may exist.
		return { phase: "ambiguous", code: error.code };
	}
	if (!(error instanceof ReferenceApiError)) return { phase: "ambiguous", code: "reference_unknown_failure" };
	if (error.isTransportFailure) return { phase: "ambiguous", code: error.code };
	if (error.status === 409 && error.code === "stale_catalog_version") return { phase: "stale_catalog", code: error.code };
	if (error.status === 409) return { phase: "conflicted", code: error.code };
	if (error.status === 408 || error.status === 429 || error.status >= 500) return { phase: "ambiguous", code: error.code };
	if (error.status >= 400 && error.status < 500) return { phase: "rejected", code: error.code };
	return { phase: "ambiguous", code: error.code };
};

const finishReferenceSuccess = (
	intent: ReferenceSaveIntent,
	response: Awaited<ReturnType<typeof postReferenceSaveJson>>,
	dependencies: SaveCoordinatorDependencies,
): void => {
	const deps = dependenciesWithDefaults(dependencies);
	const store = useCurrentMealStore.getState();
	const draft = store.meal;
	const estimate = useMealEstimateStore.getState();
	const savedId = response.legacy_compatibility.id;
	const destination = `/meals/saved/${encodeURIComponent(savedId)}`;

	const draftBelongs = draft.id === intent.draftId;
	// Photo and title edits during the POST are still edits, so foreground
	// ownership requires the same draft, edit revision, owning estimate
	// request and an active meal-flow route.
	const ownsForeground = draftBelongs
		&& store.editRevision === intent.editRevision
		&& estimate.reference.saveRequestId === intent.requestId
		&& isInternalMealFlowPath(deps.getPath());

	if (ownsForeground) deps.armBypass(destination);

	const canonical = upsertReferenceSave(response, draftBelongs ? draft.image : null);
	const cacheUnavailable = takeCacheWriteFailure();

	// Durable journal removal is attempted before the pending UI is cleared.
	if (!removeJournalEntry(intent.requestId)) {
		usePendingSaveStore.getState().markCleanupRequired({ requestId: intent.requestId, savedMealId: savedId });
		usePendingSaveStore.getState().appendNotice(REFERENCE_CLEANUP_REQUIRED_MESSAGE);
		return;
	}
	usePendingSaveStore.getState().removeIntent(intent.requestId);

	if (cacheUnavailable) usePendingSaveStore.getState().appendNotice(REFERENCE_CACHE_UNAVAILABLE_MESSAGE);

	if (ownsForeground) {
		useMealEstimateStore.getState().clearEstimateIfOwnedBy(intent.requestId);
		useCurrentMealStore.getState().resetMealAs("reference");
		deps.replaceRoute(destination);
		return;
	}
	usePendingSaveStore.getState().appendNotice(`${canonical.name} finished saving and was added to History.`);
};

const performReferenceSave = async (requestId: string, dependencies: SaveCoordinatorDependencies): Promise<boolean> => {
	const intent = usePendingSaveStore.getState().intents[requestId];
	if (!intent || !isReferenceIntent(intent)) return false;
	if (inFlightRequests.has(requestId)) return false;

	// The intent tag chooses the endpoint and serialization, never today's UI
	// mode. A different configured base must not receive these private inputs.
	if (intent.endpoint !== referenceSaveEndpoint) {
		// R07: keep the guard AND explain it. Generic "retry may have saved"
		// copy hid the real reason, which is that this attempt belongs to a
		// different server address. The destination is never rewritten.
		usePendingSaveStore.getState().setReferenceIntentPhase(requestId, "ambiguous", "endpoint_mismatch");
		usePendingSaveStore.getState().appendNotice(REFERENCE_ENDPOINT_MISMATCH_MESSAGE);
		return false;
	}

	const attempt = (attemptTokens.get(requestId) ?? 0) + 1;
	attemptTokens.set(requestId, attempt);
	inFlightRequests.add(requestId);
	usePendingSaveStore.getState().setReferenceIntentPhase(requestId, "inFlight", null);

	try {
		const response = await postReferenceSaveJson(intent.endpoint, intent.wireJson);
		if (attemptTokens.get(requestId) !== attempt) return false;
		const live = usePendingSaveStore.getState().intents[requestId];
		if (!live || !isReferenceIntent(live) || live.requestId !== intent.requestId) return false;

		const wire = parseWireSaveRequest(intent.wireJson);
		if (!wire || !savedResponseConfirmsWireRequest(wire, response)) {
			usePendingSaveStore.getState().setReferenceIntentPhase(requestId, "ambiguous", "unconfirmed_save_response");
			return false;
		}
		finishReferenceSuccess(intent, response, dependencies);
		return true;
	} catch (error) {
		if (attemptTokens.get(requestId) !== attempt) return false;
		const { phase, code } = classifyReferenceSaveFailure(error);
		usePendingSaveStore.getState().setReferenceIntentPhase(requestId, phase, code);
		return false;
	} finally {
		inFlightRequests.delete(requestId);
	}
};

/**
 * R07: why a new reference save could not even be recorded. Each cause has a
 * different user action, so they are not collapsed into one message.
 */
export const describeBlockedReferenceSave = (): string => {
	const state = usePendingSaveStore.getState();
	if (state.journalStatus === "read_error") return REFERENCE_JOURNAL_UNREADABLE_MESSAGE;
	if (Object.keys(state.cleanupRequired).length > 0) return REFERENCE_CLEANUP_REQUIRED_MESSAGE;
	if (state.recoveryErrors.length > 0) return REFERENCE_RECOVERY_ERROR_BLOCKS_MESSAGE;
	if (Object.values(state.intents).some(isReferenceIntent)) return REFERENCE_UNRESOLVED_SAVE_BLOCKS_MESSAGE;
	return REFERENCE_JOURNAL_WRITE_FAILED_MESSAGE;
};

/**
 * First Save. Requires a fresh ready result, even an unavailable one. The
 * wire JSON, UUID, optional explicit created_at and endpoint are frozen, and
 * a successful checked journal write is a precondition for the POST: a local
 * failure retains the draft and estimate and dispatches nothing.
 */
export const saveCurrentReferenceEstimate = async (dependencies: SaveCoordinatorDependencies = {}): Promise<boolean> => {
	const draft = useCurrentMealStore.getState().meal;
	if (!isReferenceDraft(draft)) return false;
	const estimate = useMealEstimateStore.getState();
	const reference = estimate.reference;
	if (estimate.contract !== "reference" || reference.phase !== "ready") return false;
	if (!reference.frozenRequest || !reference.result || !reference.saveRequestId) return false;
	if (reference.draftId !== draft.id) return false;
	if (reference.materialRevision !== useCurrentMealStore.getState().materialRevision) return false;

	const saveRequest = buildReferenceSaveRequest(reference.frozenRequest, {
		// The first save freezes the latest title and time; the server's
		// first-accepted values then win.
		mealName: draft.name,
		clientRequestId: reference.saveRequestId,
		createdAt: new Date(draft.timestamp).toISOString(),
	});
	const intent: ReferenceSaveIntent = {
		contract: "reference",
		draftId: draft.id,
		editRevision: useCurrentMealStore.getState().editRevision,
		endpoint: referenceSaveEndpoint,
		requestId: reference.saveRequestId,
		wireJson: JSON.stringify(referenceWireBody(saveRequest)),
		phase: "inFlight",
		errorCode: null,
	};
	// R07: a blocked save must say WHY. Returning false silently left a Save
	// button that simply did nothing, with a still-ready preview and no clue
	// that the device could not record the attempt.
	if (!usePendingSaveStore.getState().insertReferenceIntent(intent)) {
		usePendingSaveStore.getState().appendNotice(describeBlockedReferenceSave());
		return false;
	}
	return performReferenceSave(intent.requestId, dependencies);
};

/**
 * Explicit same-request retry. It sends `wireJson` unchanged: no catalog
 * fetch, no new mapper, no new request ID and no new timestamp precedes it,
 * and it stays available while the current catalog is unavailable.
 */
export const retryReferenceSaveIntent = async (requestId: string, dependencies: SaveCoordinatorDependencies = {}): Promise<boolean> => {
	const state = usePendingSaveStore.getState();
	const intent = state.intents[requestId];
	if (!intent || !isReferenceIntent(intent) || intent.phase !== "ambiguous") return false;
	// Retry and deletion stay disabled while any cleanup is outstanding.
	if (Object.keys(state.cleanupRequired).length > 0) return false;
	return performReferenceSave(requestId, dependencies);
};

/** Clears a confirmed-in-memory save whose journal entry could not be removed. */
export const resolveReferenceCleanup = (requestId: string): boolean => usePendingSaveStore.getState().resolveCleanup(requestId);
