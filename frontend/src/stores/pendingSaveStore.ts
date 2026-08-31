import { create } from "zustand";

import { MealSaveRequestPayload } from "../api/api";

export type PendingSavePhase = "inFlight" | "ambiguous" | "rejected" | "conflicted";

export type PendingSaveIntent = {
	readonly draftId: string;
	readonly request: Readonly<MealSaveRequestPayload>;
	readonly phase: PendingSavePhase;
	readonly lastError: string | null;
};

export type SaveNotice = {
	id: string;
	message: string;
};

type PendingSaveState = {
	intents: Record<string, PendingSaveIntent>;
	notices: SaveNotice[];
	insertIntent: (intent: PendingSaveIntent) => boolean;
	setIntentPhase: (requestId: string, phase: PendingSavePhase, lastError?: string | null) => boolean;
	removeIntent: (requestId: string) => void;
	appendNotice: (message: string) => void;
	dismissNotice: (id: string) => void;
	clearAll: () => void;
};

export const freezeSaveRequest = (request: MealSaveRequestPayload): Readonly<MealSaveRequestPayload> =>
	Object.freeze({
		meal_name: request.meal_name,
		items: Object.freeze(request.items.map((item) => Object.freeze({ ...item }))),
		client_request_id: request.client_request_id,
	});

// Save attempts outlive routes but not the app process. Every mutation is
// keyed, so one request can never replace or clear another request's state.
export const usePendingSaveStore = create<PendingSaveState>((set, get) => ({
	intents: {},
	notices: [],
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
		if (!intent) return false;
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
	clearAll: () => set({ intents: {}, notices: [] }),
}));
