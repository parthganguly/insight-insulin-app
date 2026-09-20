import { create } from "zustand";

import { MealSaveRequestPayload } from "../api/api";
import { isUuid, parseWireSaveRequest } from "../api/referenceDecode";

export type PendingSavePhase = "inFlight" | "ambiguous" | "rejected" | "conflicted";

export type PendingSaveIntent = {
	readonly contract?: "legacy";
	readonly draftId: string;
	readonly request: Readonly<MealSaveRequestPayload>;
	readonly phase: PendingSavePhase;
	readonly lastError: string | null;
};

/** A reference save phase adds the explicit stale-catalog rejection. */
export type ReferenceSavePhase = PendingSavePhase | "stale_catalog";

export type ReferenceSaveIntent = {
	readonly contract: "reference";
	readonly draftId: string;
	readonly editRevision: number;
	/** Frozen full base URL plus /reference-meals, chosen when the save began. */
	readonly endpoint: string;
	readonly requestId: string;
	/** Exact narrow serialized ReferenceSaveRequest. Never rewritten. */
	readonly wireJson: string;
	readonly phase: ReferenceSavePhase;
	/** Curated code, never raw server text. */
	readonly errorCode: string | null;
};

export type AnySaveIntent = PendingSaveIntent | ReferenceSaveIntent;

export const isReferenceIntent = (intent: AnySaveIntent): intent is ReferenceSaveIntent => intent.contract === "reference";

export type SaveNotice = {
	id: string;
	message: string;
};

/** A malformed or unsupported journal entry retained on disk for explicit removal. */
export type JournalRecoveryError = { requestId: string; storageKey: string; code: string };

/**
 * A save the server confirmed in memory whose journal entry could not be
 * removed. Retry and backend deletion stay disabled until cleanup succeeds;
 * on restart the old disk entry is ambiguous again and replay stays safe
 * while the server row exists.
 */
export type CleanupRequiredRecord = { requestId: string; savedMealId: string };

// ---------------- Purpose-limited retry journal ----------------
//
// Per-request localStorage keys under one prefix. This reuses the existing
// storage family but NOT the quota-swallowing cache writer: a journal write
// that silently failed would dispatch a supposedly journaled POST with no
// journal behind it. Entries hold only what an unresolved retry needs — no
// photos, no catalog snapshot, no source snapshot, no provider secret — and
// there is no age-based purge and no forensic durability guarantee.

export const JOURNAL_PREFIX = "insight-reference-pending:v1:";
export const JOURNAL_VERSION = 1;

export type ReferenceJournalEntry = { version: 1; intent: ReferenceSaveIntent };

export const journalKey = (requestId: string): string => `${JOURNAL_PREFIX}${requestId}`;

const PHASES: readonly ReferenceSavePhase[] = ["inFlight", "ambiguous", "rejected", "stale_catalog", "conflicted"];

/**
 * Checked write. Reads the value back, so a quota rejection or an eviction
 * cannot look like success. Returns false instead of throwing; the caller
 * must then dispatch nothing.
 */
export const writeJournalEntry = (intent: ReferenceSaveIntent): boolean => {
	const key = journalKey(intent.requestId);
	const payload = JSON.stringify({ version: JOURNAL_VERSION, intent } satisfies ReferenceJournalEntry);
	try {
		localStorage.setItem(key, payload);
		return localStorage.getItem(key) === payload;
	} catch {
		return false;
	}
};

export const removeJournalEntry = (requestId: string): boolean => {
	const key = journalKey(requestId);
	try {
		localStorage.removeItem(key);
		return localStorage.getItem(key) === null;
	} catch {
		return false;
	}
};

export type JournalReadResult =
	| { status: "read_error" }
	| { status: "ok"; intents: ReferenceSaveIntent[]; errors: JournalRecoveryError[] };

const validateEntry = (storageKey: string, raw: string): { intent: ReferenceSaveIntent } | { code: string } => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { code: "unreadable_journal_entry" };
	}
	if (!parsed || typeof parsed !== "object") return { code: "unreadable_journal_entry" };
	const entry = parsed as Record<string, unknown>;
	if (entry.version !== JOURNAL_VERSION) return { code: "unsupported_journal_version" };
	const intent = entry.intent as Partial<ReferenceSaveIntent> | undefined;
	if (!intent || typeof intent !== "object" || intent.contract !== "reference") return { code: "unreadable_journal_entry" };

	const keyRequestId = storageKey.slice(JOURNAL_PREFIX.length);
	if (!isUuid(keyRequestId) || intent.requestId !== keyRequestId) return { code: "journal_identity_mismatch" };
	if (typeof intent.wireJson !== "string") return { code: "unreadable_journal_entry" };

	// Validate the strict wire request without reserializing it.
	const wire = parseWireSaveRequest(intent.wireJson);
	if (wire === null) return { code: "invalid_journal_request" };
	if (wire.client_request_id !== keyRequestId) return { code: "journal_identity_mismatch" };

	const editRevision = intent.editRevision;
	if (typeof intent.endpoint !== "string" || !intent.endpoint) return { code: "unreadable_journal_entry" };
	if (typeof intent.draftId !== "string" || !intent.draftId) return { code: "unreadable_journal_entry" };
	if (typeof editRevision !== "number" || !Number.isSafeInteger(editRevision)) return { code: "unreadable_journal_entry" };
	if (!PHASES.includes(intent.phase as ReferenceSavePhase)) return { code: "unreadable_journal_entry" };
	if (intent.errorCode !== null && intent.errorCode !== undefined && typeof intent.errorCode !== "string") return { code: "unreadable_journal_entry" };

	return {
		intent: {
			contract: "reference",
			draftId: intent.draftId,
			editRevision,
			endpoint: intent.endpoint,
			requestId: keyRequestId,
			wireJson: intent.wireJson,
			// An in-flight attempt from a previous process is ambiguous again;
			// every other known phase keeps its meaning.
			phase: intent.phase === "inFlight" ? "ambiguous" : intent.phase as ReferenceSavePhase,
			errorCode: intent.errorCode ?? null,
		},
	};
};

export const readJournal = (): JournalReadResult => {
	const keys: string[] = [];
	try {
		for (let index = 0; index < localStorage.length; index += 1) {
			const key = localStorage.key(index);
			if (key && key.startsWith(JOURNAL_PREFIX)) keys.push(key);
		}
	} catch {
		// A storage read failure also blocks new reference dispatch: an
		// invisible entry must never be silently overwritten by a new save.
		return { status: "read_error" };
	}

	const intents: ReferenceSaveIntent[] = [];
	const errors: JournalRecoveryError[] = [];
	for (const key of keys) {
		let raw: string | null;
		try {
			raw = localStorage.getItem(key);
		} catch {
			return { status: "read_error" };
		}
		if (raw === null) continue;
		const result = validateEntry(key, raw);
		if ("intent" in result) intents.push(result.intent);
		else errors.push({ requestId: key.slice(JOURNAL_PREFIX.length), storageKey: key, code: result.code });
	}
	return { status: "ok", intents, errors };
};

// ---------------- Store ----------------

export type JournalStatus = "unknown" | "ready" | "read_error";

type PendingSaveState = {
	intents: Record<string, AnySaveIntent>;
	notices: SaveNotice[];
	journalStatus: JournalStatus;
	recoveryErrors: JournalRecoveryError[];
	cleanupRequired: Record<string, CleanupRequiredRecord>;
	insertIntent: (intent: PendingSaveIntent) => boolean;
	setIntentPhase: (requestId: string, phase: PendingSavePhase, lastError?: string | null) => boolean;
	removeIntent: (requestId: string) => void;
	appendNotice: (message: string) => void;
	dismissNotice: (id: string) => void;
	clearAll: () => void;

	/** Idempotent startup hydration. Never claims an active draft. */
	hydrateReferenceJournal: () => void;
	insertReferenceIntent: (intent: ReferenceSaveIntent) => boolean;
	setReferenceIntentPhase: (requestId: string, phase: ReferenceSavePhase, errorCode?: string | null) => boolean;
	markCleanupRequired: (record: CleanupRequiredRecord) => void;
	resolveCleanup: (requestId: string) => boolean;
	discardReferenceIntent: (requestId: string) => boolean;
	dismissRecoveryError: (requestId: string) => boolean;
};

export const freezeSaveRequest = (request: MealSaveRequestPayload): Readonly<MealSaveRequestPayload> =>
	Object.freeze({
		meal_name: request.meal_name,
		items: Object.freeze(request.items.map((item) => Object.freeze({ ...item }))),
		client_request_id: request.client_request_id,
	});

// Legacy save attempts outlive routes but not the app process; reference
// attempts additionally outlive the process through the checked journal above.
// Every mutation is keyed, so one request can never replace or clear another
// request's state.
export const usePendingSaveStore = create<PendingSaveState>((set, get) => ({
	intents: {},
	notices: [],
	journalStatus: "unknown",
	recoveryErrors: [],
	cleanupRequired: {},

	insertIntent: (intent) => {
		const requestId = intent.request.client_request_id;
		if (get().intents[requestId]) return false;
		set((state) => ({
			intents: {
				...state.intents,
				[requestId]: { ...intent, request: freezeSaveRequest(intent.request) },
			},
		}));
		return true;
	},
	setIntentPhase: (requestId, phase, lastError = null) => {
		const intent = get().intents[requestId];
		if (!intent || isReferenceIntent(intent)) return false;
		set((state) => ({
			intents: {
				...state.intents,
				[requestId]: { ...intent, phase, lastError },
			},
		}));
		return true;
	},
	removeIntent: (requestId) => set((state) => {
		if (!state.intents[requestId]) return state;
		const intents = { ...state.intents };
		delete intents[requestId];
		return { intents };
	}),
	appendNotice: (message) => set((state) => ({ notices: [...state.notices, { id: crypto.randomUUID(), message }] })),
	dismissNotice: (id) => set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) })),
	clearAll: () => set({ intents: {}, notices: [], journalStatus: "unknown", recoveryErrors: [], cleanupRequired: {} }),

	hydrateReferenceJournal: () => {
		const result = readJournal();
		if (result.status === "read_error") {
			set({ journalStatus: "read_error", recoveryErrors: [] });
			return;
		}
		set((state) => {
			const intents = { ...state.intents };
			for (const intent of result.intents) {
				// Hydration never displaces a live in-memory attempt.
				if (!intents[intent.requestId]) intents[intent.requestId] = intent;
			}
			return { intents, journalStatus: "ready", recoveryErrors: result.errors };
		});
	},

	insertReferenceIntent: (intent) => {
		const state = get();
		// An unreadable journal, a retained malformed entry or an unresolved
		// attempt for the same draft all block a new dispatch.
		if (state.journalStatus !== "ready") return false;
		if (state.recoveryErrors.length > 0) return false;
		if (state.intents[intent.requestId]) return false;
		if (Object.keys(state.cleanupRequired).length > 0) return false;
		if (Object.values(state.intents).some((existing) => isReferenceIntent(existing) && existing.draftId === intent.draftId)) return false;
		// The checked journal write is a precondition for the POST.
		if (!writeJournalEntry(intent)) return false;
		set((current) => ({ intents: { ...current.intents, [intent.requestId]: intent } }));
		return true;
	},

	setReferenceIntentPhase: (requestId, phase, errorCode = null) => {
		const intent = get().intents[requestId];
		if (!intent || !isReferenceIntent(intent)) return false;
		const next: ReferenceSaveIntent = { ...intent, phase, errorCode };
		// A phase change that cannot be journaled is still reflected in memory,
		// but the entry on disk stays the older, still-replayable attempt.
		writeJournalEntry(next);
		set((state) => ({ intents: { ...state.intents, [requestId]: next } }));
		return true;
	},

	markCleanupRequired: (record) => set((state) => ({
		cleanupRequired: { ...state.cleanupRequired, [record.requestId]: record },
	})),

	resolveCleanup: (requestId) => {
		if (!removeJournalEntry(requestId)) return false;
		set((state) => {
			const cleanupRequired = { ...state.cleanupRequired };
			delete cleanupRequired[requestId];
			const intents = { ...state.intents };
			delete intents[requestId];
			return { cleanupRequired, intents };
		});
		return true;
	},

	/** Explicit local discard. The server may already hold the meal. */
	discardReferenceIntent: (requestId) => {
		if (!removeJournalEntry(requestId)) return false;
		set((state) => {
			const intents = { ...state.intents };
			delete intents[requestId];
			const cleanupRequired = { ...state.cleanupRequired };
			delete cleanupRequired[requestId];
			return { intents, cleanupRequired };
		});
		return true;
	},

	dismissRecoveryError: (requestId) => {
		if (!removeJournalEntry(requestId)) return false;
		set((state) => ({ recoveryErrors: state.recoveryErrors.filter((error) => error.requestId !== requestId) }));
		return true;
	},
}));

/** True when a new reference save may be dispatched from this draft. */
export const canDispatchReferenceSave = (draftId: string): boolean => {
	const state = usePendingSaveStore.getState();
	return state.journalStatus === "ready"
		&& state.recoveryErrors.length === 0
		&& Object.keys(state.cleanupRequired).length === 0
		&& !Object.values(state.intents).some((intent) => isReferenceIntent(intent) && intent.draftId === draftId);
};

/**
 * Backend deletion is blocked while any unresolved or malformed reference
 * journal entry, or any cleanup-required state, remains. Current responses
 * expose no client request ID with which to safely associate every history
 * row, so this conservative guard stands in for a server tombstone or
 * correlation API — neither of which is introduced here. It never blocks
 * draft editing or discarding.
 */
export type ReferenceRecoveryBlock = "none" | "unresolved_save" | "recovery_error" | "cleanup_required" | "journal_unreadable";

export const blockingReferenceRecoveryStateFrom = (state: {
	journalStatus: JournalStatus;
	cleanupRequired: Record<string, CleanupRequiredRecord>;
	recoveryErrors: JournalRecoveryError[];
	intents: Record<string, AnySaveIntent>;
}): ReferenceRecoveryBlock => {
	// "unknown" means hydration has not run yet, so deletion and new saves
	// stay blocked rather than proceeding past an unread journal.
	if (state.journalStatus !== "ready") return "journal_unreadable";
	if (Object.keys(state.cleanupRequired).length > 0) return "cleanup_required";
	if (state.recoveryErrors.length > 0) return "recovery_error";
	if (Object.values(state.intents).some(isReferenceIntent)) return "unresolved_save";
	return "none";
};

export const blockingReferenceRecoveryState = (): ReferenceRecoveryBlock =>
	blockingReferenceRecoveryStateFrom(usePendingSaveStore.getState());
