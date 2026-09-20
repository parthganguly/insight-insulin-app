import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { Meal } from "../types/Meal";
import { deleteMealFromAPI, fetchMealsFromAPI, mapMealModelingResponseToMeal } from "../api/api";
import {
	ReferenceApiError,
	deleteReference,
	listReferences,
	readReference,
} from "../api/experimentalReference";
import { ReferenceDecodeError, decodeReferenceResult } from "../api/referenceDecode";
import type { ReferenceAttachment, ReferenceMealResponse, ReferenceRefresh } from "../types/experimentalReference";
import { REFERENCE_PREVIEW_MODE } from "../utils/experimentalPresentationGate";
import { blockingReferenceRecoveryState, usePendingSaveStore } from "./pendingSaveStore";
import { parseBackendTimestampMs } from "../utils/backendTimestamp";

type MealState = {
	meals: Meal[];
	/** Bumped by every confirmed save or delete; an older read is discarded. */
	mutationGeneration: number;
	listReadToken: number;
	detailReadTokens: Record<string, number>;
	listRefresh: ReferenceRefresh;
	/** Codes for list entries that failed to decode — a partial read, never deletion. */
	listPartialFailures: string[];
	referenceRefresh: Record<string, ReferenceRefresh>;
	/** IDs deleted in this session whose cache removal could not be persisted. */
	sessionDeletedIds: string[];
	addMeal: (meal: Meal) => void;
	deleteMeal: (id: string) => void;
	clearMeals: () => void;
	getMealById: (id: string) => Meal | null;
	hydrateFromBackend: (backendMeals: Meal[]) => void;
	beginListRead: () => { generation: number; token: number };
	beginDetailRead: (id: string) => { generation: number; token: number };
	isCurrentListRead: (read: { generation: number; token: number }) => boolean;
	isCurrentDetailRead: (id: string, read: { generation: number; token: number }) => boolean;
	applyReferenceList: (read: { generation: number; token: number }, entries: ReferenceMealResponse[], failures: string[]) => boolean;
	applyReferenceDetail: (id: string, read: { generation: number; token: number }, entry: ReferenceMealResponse) => boolean;
	setListRefresh: (refresh: ReferenceRefresh) => void;
	setReferenceRefresh: (id: string, refresh: ReferenceRefresh) => void;
	noteMutation: () => void;
};

// --------- localStorage photo-quota safety (issue #65) ---------
//
// Full-size base64 camera photos can be hundreds of KB to a few MB each,
// while browser/WebView localStorage quota is only a few MB total. Persisting
// them can make the whole meal store fail to save after a handful of photo
// meals. Policy: meal nutrition/scoring data is always persisted; images are
// kept in memory for the current session but only written to localStorage
// when they are tiny. Nothing is ever sent to or kept on the backend (#49).

const MAX_PERSISTED_IMAGE_CHARS = 24_000; // ~18 KB decoded; camera photos are far larger

export const isPersistableImage = (image: string | null | undefined): boolean => {
	if (!image) return true;
	return image.length <= MAX_PERSISTED_IMAGE_CHARS;
};

const stripUnpersistableImages = (meals: Meal[]): Meal[] => meals.map((meal) => (isPersistableImage(meal.image) ? meal : { ...meal, image: null }));

const stripAllImagesFromPersistedValue = (value: string): string => {
	const parsed = JSON.parse(value) as { state?: { meals?: Meal[] } };
	if (parsed.state?.meals) {
		parsed.state.meals = parsed.state.meals.map((meal) => ({ ...meal, image: null }));
	}
	return JSON.stringify(parsed);
};

// --------- Cache schema and read guard (freeze D6) ---------

export const MEAL_CACHE_VERSION = 2;

type CacheGuard = { readError: boolean; writeFailed: boolean; replacementBackup?: string | null };
const cacheGuard: CacheGuard = { readError: false, writeFailed: false };

/** True when the stored cache could not be read and must not be overwritten. */
export const isMealCacheReadError = (): boolean => cacheGuard.readError;

/** Consumes the "offline copy unavailable" signal from the last write attempt. */
export const takeCacheWriteFailure = (): boolean => {
	const failed = cacheGuard.writeFailed;
	cacheGuard.writeFailed = false;
	return failed;
};

export const resetMealCacheGuardForTests = (): void => {
	delete cacheGuard.replacementBackup;
	cacheGuard.readError = false;
	cacheGuard.writeFailed = false;
};

export const CACHE_REPLACEMENT_EXPLANATION = "This device's saved copy of your history can't be read, so it is being left untouched. Replacing it keeps the meals just refreshed from the server and permanently discards whatever the unreadable copy held.";

/**
 * R07: the explicit, user-authorised recovery from an unreadable cache.
 *
 * The read guard deliberately refuses to overwrite a cache this build could
 * not parse, which is right — silently destroying unreadable user data on
 * startup would be worse than showing an error. But without a way out the
 * device can never write again. This is that way out: it requires a validated
 * server refresh to have happened first, so replacement is never a blind
 * overwrite, and it is only ever called from an explicit user action.
 */
export const replaceUnreadableMealCache = (): { replaced: boolean; reason?: string } => {
	if (!cacheGuard.readError) return { replaced: false, reason: "The saved copy on this device is readable; nothing needed replacing." };
	const state = usePersistentMealStore.getState();
	const refreshedFromServer = state.listRefresh === "fresh"
		|| Object.values(state.referenceRefresh).some((refresh) => refresh === "fresh");
	if (!refreshedFromServer) {
		return { replaced: false, reason: "Refresh from the server before replacing this copy. Replacement can still discard unreadable or local-only history." };
	}
	// Capture original bytes before touching storage. Retain them for a retry
	// even if both readback and rollback fail during this session.
	try {
		if (cacheGuard.replacementBackup === undefined) cacheGuard.replacementBackup = localStorage.getItem("insight-meals");
	} catch {
		return { replaced: false, reason: "This device's saved copy could not be read for replacement. Try Replace again when storage is available." };
	}
	const expected = JSON.stringify({ state: { meals: stripUnpersistableImages(state.meals) }, version: MEAL_CACHE_VERSION });
	cacheGuard.readError = false;
	cacheGuard.writeFailed = false;
	usePersistentMealStore.setState({ meals: [...state.meals] });
	let verified = false;
	if (!takeCacheWriteFailure()) {
		try {
			const stored = localStorage.getItem("insight-meals");
			verified = stored === expected || stored === stripAllImagesFromPersistedValue(expected);
		} catch { /* An unreadable write is not confirmed persistence. */ }
	}
	if (!verified) {
		cacheGuard.readError = true;
		try {
			if (cacheGuard.replacementBackup === null) localStorage.removeItem("insight-meals");
			else localStorage.setItem("insight-meals", cacheGuard.replacementBackup);
		} catch {
			return { replaced: false, reason: "This device's saved copy could not be replaced or restored. Its original bytes are retained for this session; keep the app open and try Replace again when storage is available." };
		}
		return { replaced: false, reason: "This device's saved copy could not be replaced right now. The original copy is preserved; free up device storage and try Replace again." };
	}
	delete cacheGuard.replacementBackup;
	return { replaced: true };
};

// localStorage wrapper: if a write hits the storage quota, retry once with
// every image field stripped so the meal data itself is never lost. If even
// the stripped write fails, keep the meal in memory and warn instead of
// throwing, so saving a meal never crashes the app. The failure is now also
// recorded, because a reference save must be able to say "saved on server;
// offline copy unavailable" instead of implying a complete local save.
//
// Whole malformed JSON or an unknown future schema is a cache-read error: the
// value is left exactly as it is on disk rather than being silently replaced.
const quotaSafeLocalStorage: StateStorage = {
	getItem: (name) => {
		let raw: string | null;
		try {
			raw = localStorage.getItem(name);
		} catch {
			cacheGuard.readError = true;
			return null;
		}
		if (raw === null) return null;
		try {
			const parsed = JSON.parse(raw) as { version?: unknown };
			// R05: only a genuinely unversioned record is legacy version 0. An
			// explicit but unsupported identity such as "future-v9" is a schema
			// we cannot interpret — migrating it as if it were the oldest known
			// format would silently reinterpret unknown data.
			const declared = parsed.version;
			if (declared !== undefined && typeof declared !== "number") {
				cacheGuard.readError = true;
				return null;
			}
			const version = typeof declared === "number" ? declared : 0;
			if (!Number.isInteger(version) || version < 0 || version > MEAL_CACHE_VERSION) {
				cacheGuard.readError = true;
				return null;
			}
		} catch {
			cacheGuard.readError = true;
			return null;
		}
		return raw;
	},
	setItem: (name, value) => {
		if (cacheGuard.readError) {
			// Never overwrite a cache this build could not read.
			cacheGuard.writeFailed = true;
			return;
		}
		try {
			localStorage.setItem(name, value);
		} catch (quotaError) {
			try {
				localStorage.setItem(name, stripAllImagesFromPersistedValue(value));
				console.warn("Meal store hit the browser storage quota; photos were dropped from saved meals to keep meal data.", quotaError);
			} catch (retryError) {
				cacheGuard.writeFailed = true;
				console.warn("Meal store could not be written to localStorage even without photos; meals stay available for this session only.", retryError);
			}
		}
	},
	removeItem: (name) => localStorage.removeItem(name),
};

// --------- Per-entry cache validation ---------

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Validates one cached attachment. A corrupt attachment becomes
 * `invalid_cache` and the surrounding entry keeps its valid identity, so one
 * bad row cannot discard a healthy neighbour or erase its last valid
 * assessment. An absent attachment on a migrated entry is `not_loaded`, never
 * a fabricated `not_evaluated`.
 */
export const validateCachedAttachment = (value: unknown): ReferenceAttachment => {
	if (value === undefined || value === null) return { state: "not_loaded" };
	if (!isObject(value)) return { state: "invalid_cache" };
	// R05: cache validation must hold the SAME state relationships as HTTP.
	// Filtering malformed reasons away would sanitize a damaged record into an
	// apparently supported one, so a bad reason list invalidates the
	// attachment instead of being quietly dropped.
	if (value.state === "not_loaded") return { state: "not_loaded" };
	if (value.state === "invalid_cache") return { state: "invalid_cache" };
	const rawReasons = value.reasons;
	if (!Array.isArray(rawReasons)) return { state: "invalid_cache" };
	const wellFormed = rawReasons.every((reason) => isObject(reason)
		&& typeof reason.code === "string" && reason.code.trim() !== ""
		&& typeof reason.detail === "string");
	if (!wellFormed) return { state: "invalid_cache" };
	const reasons = rawReasons as { code: string; detail: string }[];
	switch (value.state) {
		case "not_loaded":
			return { state: "not_loaded" };
		case "invalid_cache":
			return { state: "invalid_cache" };
		case "not_evaluated":
			// An unevaluated or failed record carries no assessment, exactly as
			// over the wire.
			if (value.assessment !== undefined && value.assessment !== null) return { state: "invalid_cache" };
			return { state: "not_evaluated", reasons };
		case "evidence_error":
			if (value.assessment !== undefined && value.assessment !== null) return { state: "invalid_cache" };
			// A stored-evidence failure must say why, as the server does.
			if (reasons.length === 0) return { state: "invalid_cache" };
			return { state: "evidence_error", reasons };
		case "evaluated":
			try {
				return { state: "evaluated", assessment: Object.freeze(decodeReferenceResult(value.assessment, "cache.assessment")), reasons };
			} catch {
				return { state: "invalid_cache" };
			}
		default:
			return { state: "invalid_cache" };
	}
};

const validateCachedMeal = (value: unknown): Meal | null => {
	if (!isObject(value)) return null;
	if (typeof value.id !== "string" || !value.id) return null;
	if (typeof value.name !== "string") return null;
	if (typeof value.timestamp !== "number" || !Number.isFinite(value.timestamp)) return null;
	if (!Array.isArray(value.items)) return null;
	return { ...(value as unknown as Meal), referenceAttachment: validateCachedAttachment(value.referenceAttachment) };
};

const validateCachedMeals = (value: unknown): Meal[] =>
	(Array.isArray(value) ? value : []).map(validateCachedMeal).filter((meal): meal is Meal => meal !== null);

// --------- Reference response mapping ---------

export const attachmentFromResponse = (response: ReferenceMealResponse): ReferenceAttachment => {
	if (response.assessment_state === "evaluated" && response.assessment) {
		return { state: "evaluated", assessment: Object.freeze(response.assessment), reasons: response.reasons };
	}
	if (response.assessment_state === "evidence_error") return { state: "evidence_error", reasons: response.reasons };
	return { state: "not_evaluated", reasons: response.reasons };
};

/**
 * Copies validated server identity and compatibility identity fields into the
 * existing Meal shell and attaches the decoded reference domain. It never
 * projects reference nutrition into zero-filled legacy items, and the locally
 * cached image is kept because the backend does not retain images.
 */
export const mapReferenceResponseToMeal = (response: ReferenceMealResponse, existing?: Meal | null): Meal => ({
	id: response.legacy_compatibility.id,
	name: response.legacy_compatibility.meal_name,
	timestamp: parseBackendTimestampMs(response.legacy_compatibility.created_at, existing?.timestamp ?? Date.now()),
	backend_created_at: response.legacy_compatibility.created_at,
	image: existing?.image ?? null,
	items: [],
	referenceAttachment: attachmentFromResponse(response),
});

// --------- Zustand Store ---------

export const usePersistentMealStore = create<MealState>()(
	persist(
		(set, get) => ({
			meals: [],
			mutationGeneration: 0,
			listReadToken: 0,
			detailReadTokens: {},
			listRefresh: "idle",
			listPartialFailures: [],
			referenceRefresh: {},
			sessionDeletedIds: [],
			addMeal: (meal: Meal) => {
				// If a meal with the same id exists, replace it. Otherwise prepend the new meal.
				const existingIndex = get().meals.findIndex((m) => m.id === meal.id);
				if (existingIndex !== -1) {
					const updated = [...get().meals];
					// A legacy response carries no evidence about a reference
					// attachment's absence, so an existing attachment survives.
					updated[existingIndex] = meal.referenceAttachment
						? meal
						: { ...meal, referenceAttachment: updated[existingIndex].referenceAttachment };
					set({ meals: updated });
					return;
				}
				set({ meals: [meal, ...get().meals] });
			},
			deleteMeal: (id: string) => set({ meals: get().meals.filter((m) => m.id !== id) }),
			clearMeals: () => set({ meals: [] }),
			getMealById: (id: string) => get().meals.find((meal) => meal.id === id) || null,
			hydrateFromBackend: (backendMeals: Meal[]) => {
				// Merge policy (private-beta hydration, not account sync):
				// backend is canonical for meals it returns, matched by backend meal id;
				// local-only meals (no matching backend id) are preserved;
				// the locally cached image is kept because the backend does not retain images.
				const localMeals = get().meals;
				const localById = new Map(localMeals.map((meal) => [meal.id, meal]));
				const backendIds = new Set(backendMeals.map((meal) => meal.id));

				const canonicalMeals = backendMeals.map((backendMeal) => {
					const localMeal = localById.get(backendMeal.id);
					const merged = localMeal?.image ? { ...backendMeal, image: localMeal.image } : backendMeal;
					return backendMeal.referenceAttachment
						? merged
						: { ...merged, referenceAttachment: localMeal?.referenceAttachment ?? { state: "not_loaded" as const } };
				});
				const localOnlyMeals = localMeals.filter((meal) => !backendIds.has(meal.id));

				set({ meals: [...canonicalMeals, ...localOnlyMeals].sort((a, b) => b.timestamp - a.timestamp) });
			},

			beginListRead: () => {
				const token = get().listReadToken + 1;
				set({ listReadToken: token, listRefresh: "loading", listPartialFailures: [] });
				return { generation: get().mutationGeneration, token };
			},
			beginDetailRead: (id) => {
				const token = (get().detailReadTokens[id] ?? 0) + 1;
				set((state) => ({
					detailReadTokens: { ...state.detailReadTokens, [id]: token },
					referenceRefresh: { ...state.referenceRefresh, [id]: "loading" },
				}));
				return { generation: get().mutationGeneration, token };
			},

			isCurrentListRead: (read) => {
				const state = get();
				return state.mutationGeneration === read.generation && state.listReadToken === read.token;
			},
			isCurrentDetailRead: (id, read) => {
				const state = get();
				return state.mutationGeneration === read.generation && (state.detailReadTokens[id] ?? 0) === read.token;
			},

			applyReferenceList: (read, entries, failures) => {
				const state = get();
				// An old list completing after a newer save or delete must not
				// resurrect a record or overwrite a newer write.
				if (!state.isCurrentListRead(read)) return false;

				const complete = failures.length === 0;
				const localById = new Map(state.meals.map((meal) => [meal.id, meal]));
				const canonical = entries.map((entry) => mapReferenceResponseToMeal(entry, localById.get(entry.legacy_compatibility.id)));
				const canonicalIds = new Set(canonical.map((meal) => meal.id));

				// A complete valid list is authoritative for backend-backed IDs
				// absent from it. A partial or malformed list is never evidence
				// of deletion, and genuine local-only records are preserved.
				const retained = state.meals.filter((meal) => {
					if (canonicalIds.has(meal.id)) return false;
					if (!meal.backend_created_at) return true;
					return !complete;
				});

				set({
					meals: [...canonical, ...retained].sort((a, b) => b.timestamp - a.timestamp),
					listRefresh: complete ? "fresh" : "read_error",
					listPartialFailures: failures,
					referenceRefresh: Object.fromEntries(canonical.map((meal) => [meal.id, "fresh" as ReferenceRefresh])),
				});
				return true;
			},

			applyReferenceDetail: (id, read, entry) => {
				const state = get();
				if (!state.isCurrentDetailRead(id, read)) return false;
				// R03: the server must have answered about the record we asked
				// for. A valid response carrying a different saved ID is a
				// protocol failure, not authority over this entry.
				if (entry.legacy_compatibility.id !== id) return false;
				const existing = state.meals.find((meal) => meal.id === entry.legacy_compatibility.id) ?? null;
				const merged = mapReferenceResponseToMeal(entry, existing);
				const meals = existing
					? state.meals.map((meal) => (meal.id === merged.id ? merged : meal))
					: [merged, ...state.meals].sort((a, b) => b.timestamp - a.timestamp);
				set({ meals, referenceRefresh: { ...state.referenceRefresh, [id]: "fresh" } });
				return true;
			},

			setListRefresh: (refresh) => set({ listRefresh: refresh }),
			setReferenceRefresh: (id, refresh) => set((state) => ({ referenceRefresh: { ...state.referenceRefresh, [id]: refresh } })),
			noteMutation: () => set((state) => ({ mutationGeneration: state.mutationGeneration + 1 })),
		}),
		{
			name: "insight-meals", // localStorage key
			version: MEAL_CACHE_VERSION,
			storage: createJSONStorage(() => quotaSafeLocalStorage),
			// Explicit migration of old valid entries: a pre-R3B meal has no
			// reference evidence either way, so it becomes `not_loaded` rather
			// than a fabricated `not_evaluated`.
			migrate: (persisted) => {
				const state = persisted as { meals?: unknown } | undefined;
				return { meals: validateCachedMeals(state?.meals) };
			},
			// Each entry is validated before merge, so a corrupt neighbour can
			// never discard a valid row.
			merge: (persisted, current) => ({
				...current,
				meals: validateCachedMeals((persisted as { meals?: unknown } | undefined)?.meals),
			}),
			// Persist meal data without full-size photos; in-memory state keeps the
			// photo for the current session so the review screen still shows it.
			// Refresh and read state is ephemeral: a restored valid attachment
			// starts as cached, not refreshed.
			partialize: (state) => ({ meals: stripUnpersistableImages(state.meals) }),
		}
	)
);

export type MealDeletionResult = { deleted: true } | { deleted: false; reason: string; blocked?: boolean };

// The meal a delete action must actually remove (issue #78): drafts opened
// from a saved meal carry source_meal_id, so deleting them targets the
// persisted original; every other meal targets itself. If the original is no
// longer in the store, the draft itself is the (safe, local-only) target.
export const resolveMealDeletionTarget = (meal: Meal): Meal => {
	if (!meal.source_meal_id) return meal;
	return usePersistentMealStore.getState().getMealById(meal.source_meal_id) ?? meal;
};

export const DELETE_BLOCKED_BY_PENDING_SAVE = "Resolve pending saves before deleting a saved meal.";
export const DELETE_UNCONFIRMED = "We couldn't confirm the deletion. The meal is still shown; try Delete again.";
export const DELETE_CACHE_REMOVAL_FAILED = "The meal was deleted on the server, but this device's offline copy could not be updated. It will be re-checked next time the app starts.";

/**
 * Reconciles an ambiguous or 404 DELETE through the reference protocol only.
 * A generic 404, an HTML 404 or an absent router proves nothing about the
 * record and must never erase a cache entry (C3).
 */
const confirmReferenceAbsence = async (mealId: string): Promise<boolean> => {
	try {
		await readReference(mealId);
		return false;
	} catch (error) {
		return error instanceof ReferenceApiError && error.isProtocolAbsence;
	}
};

// Delete a meal honestly (issue #78): a meal that exists on the backend
// (marked by backend_created_at) must be deleted there FIRST, because
// hydration treats the backend as canonical and would resurrect any meal
// that was only removed from the local cache. The local copy is dropped only
// after the backend deletion succeeded. Local-only meals and unsaved drafts
// skip the backend call entirely. On backend failure nothing is removed, so
// the UI never pretends success.
export const deleteMealEverywhere = async (meal: Meal): Promise<MealDeletionResult> => {
	const target = resolveMealDeletionTarget(meal);
	if (target.backend_created_at) {
		// Deleting the row also removes the record replay uses, so an
		// unresolved retry must be reconciled or discarded first.
		//
		// R01: the guard is mode-independent. A legacy DELETE removes the same
		// row a reference replay depends on, so an unresolved reference record
		// must block deletion through EITHER contract. Hydration is forced
		// first (idempotently) so the guard always decides against a real read
		// rather than against a journal nobody has looked at yet.
		if (usePendingSaveStore.getState().journalStatus === "unknown") {
			usePendingSaveStore.getState().hydrateReferenceJournal();
		}
		if (blockingReferenceRecoveryState() !== "none") {
			return { deleted: false, reason: DELETE_BLOCKED_BY_PENDING_SAVE, blocked: true };
		}
		try {
			if (REFERENCE_PREVIEW_MODE) await deleteReference(target.id);
			else await deleteMealFromAPI(target.id);
		} catch (error) {
			if (REFERENCE_PREVIEW_MODE) {
				const absent = await confirmReferenceAbsence(target.id);
				if (!absent) {
					usePersistentMealStore.getState().setReferenceRefresh(target.id, "read_error");
					return { deleted: false, reason: DELETE_UNCONFIRMED };
				}
			} else {
				console.error("DELETE /meals failed:", error);
				return { deleted: false, reason: error instanceof Error ? error.message : "Failed to delete meal" };
			}
		}
	}
	const store = usePersistentMealStore.getState();
	store.noteMutation();
	store.deleteMeal(target.id);
	if (takeCacheWriteFailure()) {
		// The next startup performs a fresh read before presenting this
		// backend-backed entry as current.
		usePersistentMealStore.setState((state) => ({ sessionDeletedIds: [...state.sessionDeletedIds, target.id] }));
		return { deleted: false, reason: DELETE_CACHE_REMOVAL_FAILED };
	}
	return { deleted: true };
};

// Pull backend meals into the local persistent cache so a fresh browser shows
// backend-seeded and backend-saved history. Draft state lives in the current-meal
// store and is never part of hydration. Fails soft: on any backend error the
// existing local cache is left untouched.
export const syncMealsFromBackend = async (): Promise<boolean> => {
	if (REFERENCE_PREVIEW_MODE) return syncReferenceMealsFromBackend();
	try {
		const backendMeals = await fetchMealsFromAPI();
		usePersistentMealStore.getState().hydrateFromBackend(backendMeals.map((backendMeal) => mapMealModelingResponseToMeal(backendMeal)));
		return true;
	} catch (error) {
		console.warn("Skipped meal hydration from backend:", error);
		return false;
	}
};

/** ON mode routes every history read to the reference list. */
export const syncReferenceMealsFromBackend = async (attempt = 0): Promise<boolean> => {
	const store = usePersistentMealStore.getState();
	const read = store.beginListRead();
	try {
		const { entries, failures } = await listReferences();
		const applied = usePersistentMealStore.getState().applyReferenceList(read, entries, failures.map((failure) => failure.code));
		// A discarded response schedules a fresh GET, never a save.
		if (!applied && attempt === 0) return syncReferenceMealsFromBackend(1);
		return applied && failures.length === 0;
	} catch (error) {
		// R03: an older failure must not overwrite a newer read's status.
		if (!usePersistentMealStore.getState().isCurrentListRead(read)) return false;
		const offline = error instanceof ReferenceApiError && error.isTransportFailure;
		usePersistentMealStore.getState().setListRefresh(offline ? "offline" : "read_error");
		return false;
	}
};

/** ON mode routes a saved-meal detail read to the reference detail route. */
export const refreshReferenceMealDetail = async (mealId: string, attempt = 0): Promise<ReferenceRefresh> => {
	const read = usePersistentMealStore.getState().beginDetailRead(mealId);
	try {
		const entry = await readReference(mealId);
		const applied = usePersistentMealStore.getState().applyReferenceDetail(mealId, read, entry);
		if (!applied && attempt === 0) return refreshReferenceMealDetail(mealId, 1);
		return applied ? "fresh" : "idle";
	} catch (error) {
		// R03: an older failure — including a structured absence — must not
		// delete or relabel a record a newer read or write has already settled.
		// Dropping the entry on a stale not_found is the destructive case.
		if (!usePersistentMealStore.getState().isCurrentDetailRead(mealId, read)) return "idle";
		// Only the reference protocol's own absence establishes not_found, and
		// only for this one requested ID.
		const refresh: ReferenceRefresh = error instanceof ReferenceApiError
			? (error.isProtocolAbsence ? "not_found" : error.isTransportFailure ? "offline" : "read_error")
			: error instanceof ReferenceDecodeError ? "read_error" : "read_error";
		usePersistentMealStore.getState().setReferenceRefresh(mealId, refresh);
		if (refresh === "not_found") {
			const store = usePersistentMealStore.getState();
			store.noteMutation();
			store.deleteMeal(mealId);
		}
		return refresh;
	}
};

/** Upserts a confirmed reference save under its canonical server ID. */
export const upsertReferenceSave = (response: ReferenceMealResponse, localImage: string | null): Meal => {
	const store = usePersistentMealStore.getState();
	const existing = store.getMealById(response.legacy_compatibility.id);
	const canonical = mapReferenceResponseToMeal(response, existing ?? (localImage ? ({ image: localImage } as Meal) : null));
	store.noteMutation();
	store.addMeal(canonical);
	return canonical;
};
