import { describe, expect, it, vi } from "vitest";
import { previewReference, referenceWireBody, ReferenceApiError } from "./experimentalReference";

describe("reference request boundary", () => {
  const request = { meal_name: "Synthetic meal", expected_catalog_version: "r2_sha256_test",
    items: [{ name: "Synthetic food", quantity: 1, unit: "serving", source_record_id: "BAO2011-002", fii: 99, fii_value: 98 }] };
  it("sends exact source ID and never published or legacy FII", () => {
    const wire = referenceWireBody(request);
    expect(wire.items[0].source_record_id).toBe("BAO2011-002");
    expect(JSON.stringify(wire)).not.toMatch(/fii_value|"fii"/);
  });
  it("surfaces stale catalog identity for explicit re-review", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 409,
      json: async () => ({ detail: { code: "stale_catalog_version", catalog_version: "r2_sha256_new" } }) } as Response);
    await expect(previewReference(request)).rejects.toMatchObject({ status: 409, code: "stale_catalog_version", catalogVersion: "r2_sha256_new" } satisfies Partial<ReferenceApiError>);
    fetchMock.mockRestore();
  });
});
