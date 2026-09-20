import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	ReferenceApiError,
	REFERENCE_HTTP_DEADLINE_MS,
	previewReference,
} from "../api/experimentalReference";
import {
	parseWireSaveRequest,
	savedResponseConfirmsRequest,
	savedResponseConfirmsWireRequest,
	decodeReferenceResult,
} from "../api/referenceDecode";
import {
	syntheticItemInput,
	syntheticItemResult,
	syntheticMealResponse,
	syntheticResult,
	syntheticSourceEvidence,
} from "../api/referenceFixtures";
import { usePendingSaveStore, journalKey } from "../stores/pendingSaveStore";
import {
	deleteMealEverywhere,
	refreshReferenceMealDetail,
	usePersistentMealStore,
	validateCachedAttachment,
} from "../stores/persistentMealStore";
import { doesPendingSaveCoverCurrentDraft } from "./mealFlowGuard";
import { createEmptyReferenceItem, updateReferenceDraftItem } from "./referenceDraft";
import { parseCameraRecovery } from "./cameraRecovery";
import { REFERENCE_CATALOG_PIN, type ReferencePreviewRequest } from "../types/experimentalReference";
import type { Meal } from "../types/Meal";
import { Unit } from "../types/MealItem";

// Regressions for the independently reviewed findings R01-R06. Each test fails
// against the pre-correction behaviour the reviewer reproduced.

const SAVED_ID = "11111111-2222-4333-8444-555555555555";
const REQUEST_ID = "22222222-3333-4444-8555-666666666666";

const referenceIntent = (overrides: Record<string, unknown> = {}) => ({
	contract: "reference" as const,
	draftId: "draft-1",
	editRevision: 7,
	endpoint: "http://127.0.0.1:8099/reference-meals",
	requestId: REQUEST_ID,
	wireJson: JSON.stringify({
		meal_name: "Synthetic meal",
		expected_catalog_version: REFERENCE_CATALOG_PIN,
		client_request_id: REQUEST_ID,
		created_at: null,
		items: [{ name: "Food", quantity: 1, unit: "g" }],
	}),
	phase: "ambiguous" as const,
	errorCode: null,
	...overrides,
});

const resetStores = () => {
	usePendingSaveStore.setState({
		intents: {}, notices: [], journalStatus: "unknown", recoveryErrors: [], cleanupRequired: {},
	});
	usePersistentMealStore.setState({ meals: [] });
	localStorage.clear();
};

beforeEach(resetStores);
afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe("R01 — recovery does not depend on the presentation mode", () => {
	it("hydrates a reference retry record written by an enabled build", () => {
		// The flag is OFF in this test build; the record must still be read.
		localStorage.setItem(journalKey(REQUEST_ID), JSON.stringify({ version: 1, intent: referenceIntent() }));
		usePendingSaveStore.getState().hydrateReferenceJournal();
		expect(usePendingSaveStore.getState().journalStatus).toBe("ready");
		expect(usePendingSaveStore.getState().intents[REQUEST_ID]).toBeTruthy();
	});

	it("blocks a LEGACY delete while a reference retry record is unresolved", async () => {
		localStorage.setItem(journalKey(REQUEST_ID), JSON.stringify({ version: 1, intent: referenceIntent() }));
		const meal: Meal = { id: SAVED_ID, image: null, name: "Saved", timestamp: 1, items: [], backend_created_at: "2026-09-19T12:00:00Z" };
		usePersistentMealStore.setState({ meals: [meal] });

		// A legacy DELETE removes the very row a reference replay depends on.
		const result = await deleteMealEverywhere(meal);
		expect(result.deleted).toBe(false);
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
	});

	it("allows an ordinary legacy delete when no reference record exists", async () => {
		const meal: Meal = { id: SAVED_ID, image: null, name: "Saved", timestamp: 1, items: [] };
		usePersistentMealStore.setState({ meals: [meal] });
		// Local-only meal: no backend call, and nothing should block it.
		await expect(deleteMealEverywhere(meal)).resolves.toMatchObject({ deleted: true });
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});
});

describe("R02 — an older pending save does not cover newer draft edits", () => {
	const draft = { contract: "reference" as const, id: "draft-1", image: null, name: "M", timestamp: 1, items: [], reviewedCatalogVersion: null };

	it("covers the draft only while its edit revision is unchanged", () => {
		const intent = referenceIntent();
		expect(doesPendingSaveCoverCurrentDraft({
			meal: draft, estimateDraftId: "draft-1", saveRequestId: REQUEST_ID, intent, editRevision: 7,
		})).toBe(true);
	});

	it("stops covering the draft once any edit lands during the save", () => {
		const intent = referenceIntent();
		expect(doesPendingSaveCoverCurrentDraft({
			meal: draft, estimateDraftId: "draft-1", saveRequestId: REQUEST_ID, intent, editRevision: 8,
		})).toBe(false);
	});
});

describe("R03 — asynchronous ownership on failure paths", () => {
	it("ignores a stale detail read that lost its race", () => {
		const store = usePersistentMealStore.getState();
		const stale = store.beginDetailRead(SAVED_ID);
		store.beginDetailRead(SAVED_ID); // a newer read supersedes it
		expect(usePersistentMealStore.getState().isCurrentDetailRead(SAVED_ID, stale)).toBe(false);
	});

	it("ignores a list read superseded by a newer mutation", () => {
		const store = usePersistentMealStore.getState();
		const read = store.beginListRead();
		usePersistentMealStore.getState().noteMutation();
		expect(usePersistentMealStore.getState().isCurrentListRead(read)).toBe(false);
	});

	it("rejects a detail response whose saved ID is not the one requested", () => {
		const read = usePersistentMealStore.getState().beginDetailRead(SAVED_ID);
		const other = syntheticMealResponse();
		other.legacy_compatibility.id = "99999999-8888-4777-8666-555555555555";
		expect(usePersistentMealStore.getState().applyReferenceDetail(SAVED_ID, read, other)).toBe(false);
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});
});

describe("N3 — a detail response for another ID is a protocol read_error", () => {
	const seedValidCache = () => {
		const store = usePersistentMealStore.getState();
		const read = store.beginDetailRead(SAVED_ID);
		expect(store.applyReferenceDetail(SAVED_ID, read, syntheticMealResponse())).toBe(true);
	};
	const mismatchedFetch = () => {
		const other = syntheticMealResponse();
		other.legacy_compatibility.id = "99999999-8888-4777-8666-555555555555";
		return vi.spyOn(globalThis, "fetch")
			.mockResolvedValue({ ok: true, status: 200, json: async () => other } as unknown as Response);
	};

	it("settles read_error on a valid cache without retry, insert or erase", async () => {
		seedValidCache();
		const fetchMock = mismatchedFetch();
		const outcome = await refreshReferenceMealDetail(SAVED_ID);
		expect(outcome).toBe("read_error");
		// A wrong-ID answer is not a generation race: exactly one request.
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(usePersistentMealStore.getState().referenceRefresh[SAVED_ID]).toBe("read_error");
		// The valid cached row survives untouched; the wrong row is not inserted.
		expect(usePersistentMealStore.getState().meals.map((meal) => meal.id)).toEqual([SAVED_ID]);
	});

	it("settles read_error on a cold read without inserting the wrong row", async () => {
		const fetchMock = mismatchedFetch();
		const outcome = await refreshReferenceMealDetail(SAVED_ID);
		expect(outcome).toBe("read_error");
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(usePersistentMealStore.getState().referenceRefresh[SAVED_ID]).toBe("read_error");
		expect(usePersistentMealStore.getState().meals).toHaveLength(0);
	});
});

describe("R04 — the deadline spans body consumption", () => {
	it("aborts when headers arrive but the body never settles", async () => {
		vi.useFakeTimers();
		let abortSignal: AbortSignal | undefined;
		vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
			abortSignal = (init as RequestInit).signal ?? undefined;
			// Headers resolved; the body hangs until the signal aborts.
			return Promise.resolve({
				ok: true,
				status: 200,
				json: () => new Promise((_resolve, reject) => {
					abortSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
				}),
			} as unknown as Response);
		});

		const request: ReferencePreviewRequest = {
			meal_name: "M", expected_catalog_version: REFERENCE_CATALOG_PIN, items: [syntheticItemInput()],
		};
		const pending = previewReference(request).catch((error: unknown) => error);
		await vi.advanceTimersByTimeAsync(REFERENCE_HTTP_DEADLINE_MS + 10);
		const error = await pending;
		expect(error).toBeInstanceOf(ReferenceApiError);
		expect((error as ReferenceApiError).isTransportFailure).toBe(true);
	});
});

describe("R05 — validation is strict for its operation context", () => {
	it("does not accept not_evaluated as confirmation of a reference save", () => {
		const request: ReferencePreviewRequest = {
			meal_name: "M", expected_catalog_version: REFERENCE_CATALOG_PIN, items: [syntheticItemInput()],
		};
		const response = syntheticMealResponse({ assessment_state: "not_evaluated", assessment: null, reasons: [] });
		expect(savedResponseConfirmsRequest(request, response)).toBe(false);

		const wire = parseWireSaveRequest(referenceIntent().wireJson);
		expect(wire).not.toBeNull();
		expect(savedResponseConfirmsWireRequest(wire!, response)).toBe(false);
	});

	it("still accepts a valid evidence_error as confirmed persistence", () => {
		const request: ReferencePreviewRequest = {
			meal_name: "M", expected_catalog_version: REFERENCE_CATALOG_PIN, items: [syntheticItemInput()],
		};
		expect(savedResponseConfirmsRequest(request, syntheticMealResponse({
			assessment_state: "evidence_error", assessment: null,
			reasons: [{ code: "invalid_stored_assessment", detail: "corrupt" }],
		}))).toBe(true);
	});

	it("rejects a calculated row citing an off-protocol or ineligible source", () => {
		const offProtocol = JSON.parse(JSON.stringify(syntheticResult({
			items: [syntheticItemResult({ source: syntheticSourceEvidence({ actual_test_energy_kJ: 300 }) })],
		})));
		expect(() => decodeReferenceResult(offProtocol)).toThrow(/calculated_from_off_protocol_source/);

		const ineligible = JSON.parse(JSON.stringify(syntheticResult({
			items: [syntheticItemResult({
				source: syntheticSourceEvidence({
					eligibility: [{ use: "experimental_fii_input", status: "reference_only", reasons: [] }],
				}),
			})],
		})));
		expect(() => decodeReferenceResult(ineligible)).toThrow(/calculated_from_ineligible_source/);
	});

	it("quarantines a restored request with unsupported fields or a mismatched energy unit", () => {
		const extraField = JSON.stringify({
			meal_name: "M", expected_catalog_version: REFERENCE_CATALOG_PIN, client_request_id: REQUEST_ID,
			items: [{ name: "Food", quantity: 1, unit: "g", surprise: true }],
		});
		expect(parseWireSaveRequest(extraField)).toBeNull();

		const mismatchedUnit = JSON.stringify({
			meal_name: "M", expected_catalog_version: REFERENCE_CATALOG_PIN, client_request_id: REQUEST_ID,
			items: [{ name: "Food", quantity: 1, unit: "g", kcal_per_unit: 2, kcal_per_unit_unit: "ml" }],
		});
		expect(parseWireSaveRequest(mismatchedUnit)).toBeNull();
	});

	it("still accepts a sparse supported request unchanged", () => {
		const sparse = JSON.stringify({
			meal_name: "M", expected_catalog_version: REFERENCE_CATALOG_PIN, client_request_id: REQUEST_ID,
			items: [{ name: "Food", quantity: 1, unit: "g" }],
		});
		expect(parseWireSaveRequest(sparse)).not.toBeNull();
	});

	it("treats an explicit unsupported cache identity as unreadable, not legacy v0", () => {
		// A malformed attachment must not be sanitized into a supported state.
		expect(validateCachedAttachment({ state: "evidence_error", reasons: [] })).toEqual({ state: "invalid_cache" });
		expect(validateCachedAttachment({ state: "not_evaluated", reasons: [{ code: "", detail: "x" }] })).toEqual({ state: "invalid_cache" });
		expect(validateCachedAttachment({ state: "not_evaluated", reasons: [], assessment: {} })).toEqual({ state: "invalid_cache" });
		// A healthy record still validates.
		expect(validateCachedAttachment({ state: "not_evaluated", reasons: [] })).toEqual({ state: "not_evaluated", reasons: [] });
	});
});

describe("N4 — unknown root fields quarantine the restored request", () => {
	it("rejects an unknown top-level field without touching a sparse body", () => {
		const extraRoot = JSON.stringify({
			meal_name: "M", expected_catalog_version: REFERENCE_CATALOG_PIN, client_request_id: REQUEST_ID,
			items: [{ name: "Food", quantity: 1, unit: "g" }],
			extra: "not part of the contract",
		});
		expect(parseWireSaveRequest(extraRoot)).toBeNull();
		// A sparse historically supported body (absent optionals) still replays.
		const sparse = JSON.stringify({
			meal_name: "M", expected_catalog_version: REFERENCE_CATALOG_PIN, client_request_id: REQUEST_ID,
			items: [{ name: "Food", quantity: 1, unit: "g" }],
		});
		expect(parseWireSaveRequest(sparse)).not.toBeNull();
	});

	it("retains a malformed entry locally, visibly rejected, with no intent", () => {
		const intent = referenceIntent();
		const wire = JSON.parse(intent.wireJson) as Record<string, unknown>;
		wire.extra = "not part of the contract";
		const raw = JSON.stringify({ version: 1, intent: { ...intent, wireJson: JSON.stringify(wire) } });
		localStorage.setItem(journalKey(REQUEST_ID), raw);
		usePendingSaveStore.getState().hydrateReferenceJournal();
		const state = usePendingSaveStore.getState();
		expect(state.intents[REQUEST_ID]).toBeUndefined();
		expect(state.recoveryErrors.some((error) => error.requestId === REQUEST_ID && error.code === "invalid_journal_request")).toBe(true);
		// Original bytes retained, never rewritten into apparent validity.
		expect(localStorage.getItem(journalKey(REQUEST_ID))).toBe(raw);
	});
});

describe("R06 — an index edit does not approve an unrelated denominator", () => {
	const reviewed = {
		...createEmptyReferenceItem(),
		name: "Food", amount: 150, servingSize: 100, kcalPerServing: 200, carbPerServing_g: 20,
		basisReviewed: true,
	};

	it("keeps the basis unreviewed after a unit change when only GI is edited", () => {
		const unitChanged = updateReferenceDraftItem(reviewed, "servingUnit", Unit.Servings);
		expect(unitChanged.basisReviewed).toBe(false);
		const giEdited = updateReferenceDraftItem(unitChanged, "gi", "43");
		expect(giEdited.gi).toBe(43);
		// GI is an index, not a per-denominator rate: it says nothing about
		// whether the kcal/macros belong to the new unit.
		expect(giEdited.basisReviewed).toBe(false);
	});

	it("still lets an actual per-denominator edit confirm the basis", () => {
		const unitChanged = updateReferenceDraftItem(reviewed, "servingUnit", Unit.Servings);
		expect(updateReferenceDraftItem(unitChanged, "kcalPerServing", "9").basisReviewed).toBe(true);
	});
});


describe("R08/M05 — reference camera recovery round-trips a nullable draft", () => {
	// Camera recovery only engages on a native platform, so this exercises the
	// real parse boundary rather than pretending a browser run covered it.
	const envelope = (item: Record<string, unknown>) => ({
		version: 1,
		nonce: "nonce-1",
		createdAt: Date.now() - 1000,
		source: "CAMERA",
		flow: "preview-photo",
		caller: "/meals/new",
		destination: "/meals/new",
		smart: null,
		meal: {
			contract: "reference",
			id: "draft-1",
			name: "Restored meal",
			timestamp: Date.now(),
			image: null,
			reviewedCatalogVersion: null,
			items: [item],
		},
	});

	const nullableItem = {
		id: "i1", name: "Half-entered food",
		amount: null, servingUnit: "g", servingSize: 100,
		kcalPerServing: null, carbPerServing_g: 20, proteinPerServing_g: null,
		fatPerServing_g: null, satFatPerServing_g: null, gi: null,
		nutritionOrigin: "manual", basisReviewed: false, invalidFields: [],
		selection: { state: "needs_review", sourceId: "BAO2011-002", catalogVersion: REFERENCE_CATALOG_PIN, cause: "reused_suggestion" },
		needsReview: { previousName: "Old name" },
	};

	it("preserves null-versus-zero, the review flags and the suggestion cause", () => {
		const parsed = parseCameraRecovery(envelope(nullableItem));
		expect(parsed).not.toBeNull();
		const item = (parsed!.meal as { items: Record<string, unknown>[] }).items[0];
		// null must survive as null — never coerced into an explicit zero.
		expect(item.amount).toBeNull();
		expect(item.kcalPerServing).toBeNull();
		expect(item.carbPerServing_g).toBe(20);
		expect(item.basisReviewed).toBe(false);
		expect(item.needsReview).toEqual({ previousName: "Old name" });
		expect(item.selection).toMatchObject({ state: "needs_review", cause: "reused_suggestion" });
	});

	it("restores no ready preview and no save intent", () => {
		parseCameraRecovery(envelope(nullableItem));
		expect(Object.keys(localStorage).filter((key) => key.startsWith("insight-reference-pending:"))).toHaveLength(0);
		expect(usePendingSaveStore.getState().intents).toEqual({});
	});

	it("rejects a restored reference item whose nullable fields are malformed", () => {
		expect(parseCameraRecovery(envelope({ ...nullableItem, amount: "150" }))).toBeNull();
		expect(parseCameraRecovery(envelope({ ...nullableItem, gi: 1.5 }))).toBeNull();
		expect(parseCameraRecovery(envelope({ ...nullableItem, selection: { state: "selected" } }))).toBeNull();
	});
});


describe("N4 restored request bounds", () => {
	it("quarantines oversized names and overflowing consumed nutrition without rewriting bytes", () => {
		for (const field of ["meal_name", "item_name", "overflow"]) {
			const body = JSON.parse(referenceIntent().wireJson);
			if (field === "meal_name") body.meal_name = "a".repeat(256);
			if (field === "item_name") body.items[0].name = "a".repeat(256);
			if (field === "overflow") Object.assign(body.items[0], { quantity: 2, carb_g: Number.MAX_VALUE });
			const wireJson = JSON.stringify(body);
			const raw = JSON.stringify({ version: 1, intent: referenceIntent({ wireJson }) });
			localStorage.setItem(journalKey(REQUEST_ID), raw);
			usePendingSaveStore.setState({ journalStatus: "unknown", intents: {}, recoveryErrors: [] });
			usePendingSaveStore.getState().hydrateReferenceJournal();
			expect(parseWireSaveRequest(wireJson)).toBeNull();
			expect(usePendingSaveStore.getState().intents).toEqual({});
			expect(localStorage.getItem(journalKey(REQUEST_ID))).toBe(raw);
		}
		const valid = JSON.parse(referenceIntent().wireJson);
		valid.meal_name = "🥣".repeat(255);
		valid.items[0].name = valid.meal_name;
		expect(parseWireSaveRequest(JSON.stringify(valid))?.meal_name).toBe(valid.meal_name);
	});
});
