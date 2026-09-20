import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GENERIC_FAILURE_CODE,
  GENERIC_PROTOCOL_CODE,
  NETWORK_CODE,
  ReferenceApiError,
  deleteReference,
  previewReference,
  readReference,
  referenceWireBody,
} from "./experimentalReference";
import { syntheticItemInput, syntheticMealResponse } from "./referenceFixtures";
import { REFERENCE_CATALOG_PIN, type ReferencePreviewRequest } from "../types/experimentalReference";

const request: ReferencePreviewRequest = {
  meal_name: "Synthetic meal",
  expected_catalog_version: REFERENCE_CATALOG_PIN,
  items: [syntheticItemInput({ name: "Synthetic food", quantity: 1, unit: "serving", kcal_per_unit: 1, kcal_per_unit_unit: "serving", carb_g: null })],
};

const SAVED_ID = "11111111-2222-4333-8444-555555555555";

const respondWith = (response: Partial<Response> & { json?: () => Promise<unknown> }) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(response as Response);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reference request boundary", () => {
  it("sends exact source ID and never published or legacy FII", () => {
    const wire = referenceWireBody({
      ...request,
      // A stray legacy field on the caller's object must not reach the wire.
      items: [{ ...request.items[0], ...({ fii: 99, fii_value: 98 } as object) }],
    });
    expect(wire.items[0].source_record_id).toBe("BAO2011-002");
    expect(JSON.stringify(wire)).not.toMatch(/fii_value|"fii"/);
  });

  it("writes every optional value explicitly so correspondence is deterministic", () => {
    const wire = referenceWireBody(request);
    for (const key of ["kcal_per_unit", "kcal_per_unit_unit", "nutrition_origin", "carb_g", "protein_g", "fat_g", "sat_fat_g", "gi", "source_record_id"]) {
      expect(Object.prototype.hasOwnProperty.call(wire.items[0], key)).toBe(true);
    }
  });

  it("surfaces stale catalog identity for explicit re-review", async () => {
    respondWith({ ok: false, status: 409, json: async () => ({ detail: { code: "stale_catalog_version", catalog_version: "r2_sha256_new" } }) });
    await expect(previewReference(request)).rejects.toMatchObject({ status: 409, code: "stale_catalog_version", catalogVersion: "r2_sha256_new" });
  });

  it("retains HTTP status and curates the code for a non-JSON error body", async () => {
    respondWith({ ok: false, status: 503, json: async () => { throw new SyntaxError("Unexpected token <"); } });
    await expect(previewReference(request)).rejects.toMatchObject({ status: 503, code: GENERIC_PROTOCOL_CODE });
  });

  it("never turns arbitrary server text into an error code", async () => {
    respondWith({ ok: false, status: 400, json: async () => ({ detail: { code: "SELECT * FROM meals" } }) });
    await expect(previewReference(request)).rejects.toMatchObject({ status: 400, code: GENERIC_FAILURE_CODE });
  });

  it("reports a transport failure as an unknown outcome", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await previewReference(request).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ReferenceApiError);
    expect(error).toMatchObject({ status: 0, code: NETWORK_CODE });
    expect((error as ReferenceApiError).isTransportFailure).toBe(true);
  });
});

describe("protocol-specific absence (C3)", () => {
  it("treats only the reference route's structured body as proof of absence", async () => {
    respondWith({ ok: false, status: 404, json: async () => ({ detail: { code: "meal_not_found" } }) });
    const structured = await readReference(SAVED_ID).catch((error: unknown) => error);
    expect((structured as ReferenceApiError).isProtocolAbsence).toBe(true);
  });

  it("does not accept a generic FastAPI 404 as proof of absence", async () => {
    respondWith({ ok: false, status: 404, json: async () => ({ detail: "Not Found" }) });
    const generic = await readReference(SAVED_ID).catch((error: unknown) => error);
    expect((generic as ReferenceApiError).isProtocolAbsence).toBe(false);
    expect((generic as ReferenceApiError).code).toBe(GENERIC_FAILURE_CODE);
  });

  it("does not accept an HTML 404 from an unmounted router as proof of absence", async () => {
    respondWith({ ok: false, status: 404, json: async () => { throw new SyntaxError("Unexpected token <"); } });
    const html = await deleteReference(SAVED_ID).catch((error: unknown) => error);
    expect((html as ReferenceApiError).isProtocolAbsence).toBe(false);
    expect((html as ReferenceApiError).code).toBe(GENERIC_PROTOCOL_CODE);
  });

  it("accepts 204 as a completed delete", async () => {
    respondWith({ ok: true, status: 204 });
    await expect(deleteReference(SAVED_ID)).resolves.toBeUndefined();
  });

  it("rejects a valid detail response that answers about a different saved ID", async () => {
    const other = syntheticMealResponse();
    other.legacy_compatibility.id = "99999999-8888-4777-8666-555555555555";
    respondWith({ ok: true, status: 200, json: async () => other });
    const mismatch = await readReference(SAVED_ID).catch((error: unknown) => error);
    expect(mismatch).toBeInstanceOf(ReferenceApiError);
    // A wrong-ID 200 proves nothing about the requested record: it is a
    // protocol failure, never absence, never transport loss.
    expect(mismatch as ReferenceApiError).toMatchObject({ status: 200, code: GENERIC_PROTOCOL_CODE });
    expect((mismatch as ReferenceApiError).isProtocolAbsence).toBe(false);
    expect((mismatch as ReferenceApiError).isTransportFailure).toBe(false);
  });

  it("accepts a valid detail response for the requested saved ID", async () => {
    respondWith({ ok: true, status: 200, json: async () => syntheticMealResponse() });
    const entry = await readReference(SAVED_ID);
    expect(entry.legacy_compatibility.id).toBe(SAVED_ID);
  });
});
