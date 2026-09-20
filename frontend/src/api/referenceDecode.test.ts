import { describe, expect, it } from "vitest";
import {
  ReferenceDecodeError,
  decodeCatalog,
  decodeMealList,
  decodeMealResponse,
  decodePreviewResponse,
  decodeReferenceResult,
  inputsCorrespondToRequest,
  isReviewedCatalogPin,
  savedResponseConfirmsRequest,
} from "./referenceDecode";
import {
  syntheticItemInput,
  syntheticItemResult,
  syntheticMealResponse,
  syntheticResult,
  syntheticUnavailableResult,
} from "./referenceFixtures";
import { REFERENCE_CATALOG_PIN, type ReferencePreviewRequest } from "../types/experimentalReference";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const codeOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    return error instanceof ReferenceDecodeError ? error.code : "not_a_decode_error";
  }
  return "no_error";
};

const request: ReferencePreviewRequest = {
  meal_name: "Synthetic reference meal",
  expected_catalog_version: REFERENCE_CATALOG_PIN,
  items: [syntheticItemInput()],
};

const catalogPayload = {
  catalog_version: REFERENCE_CATALOG_PIN,
  records: [{
    source_record_id: "BAO2011-002", source_food_wording: "Synthetic wording", food_category: "Dairy products",
    fii_mean: 69, fii_sem: 6, source_study: "Synthetic study", source_doi: "10.0000/synthetic",
    reference_scale: "glucose=100", actual_test_energy_kJ: 1000,
    eligibility: { use: "experimental_fii_input", status: "candidate", reasons: [] },
  }],
};

describe("catalog decoding", () => {
  it("accepts a well-formed catalog and keeps ineligible records inspectable", () => {
    const ineligible = clone(catalogPayload);
    ineligible.records[0].eligibility.status = "reference_only";
    ineligible.records[0].source_record_id = "BELL2016-S1-001";
    expect(decodeCatalog(ineligible).records[0].eligibility.status).toBe("reference_only");
  });

  it("rejects duplicate source IDs", () => {
    const duplicated = clone(catalogPayload);
    duplicated.records = [duplicated.records[0], clone(duplicated.records[0])];
    expect(codeOf(() => decodeCatalog(duplicated))).toBe("duplicate_source_id");
  });

  it("rejects a malformed catalog identity and an unsupported eligibility status", () => {
    const badId = clone(catalogPayload);
    badId.catalog_version = "sha256_not_r2";
    expect(codeOf(() => decodeCatalog(badId))).toBe("invalid_catalog_id");

    const badStatus = clone(catalogPayload);
    (badStatus.records[0].eligibility as Record<string, unknown>).status = "approved";
    expect(codeOf(() => decodeCatalog(badStatus))).toBe("unsupported_literal");
  });

  it("pins only the reviewed catalog identity for a new evaluation", () => {
    expect(isReviewedCatalogPin(REFERENCE_CATALOG_PIN)).toBe(true);
    expect(isReviewedCatalogPin(`r2_sha256_${"a".repeat(64)}`)).toBe(false);
  });
});

describe("assessment decoding", () => {
  it("accepts a complete experimental result and an unavailable result", () => {
    expect(decodeReferenceResult(clone(syntheticResult())).reference_load_total).toBe(207);
    expect(decodeReferenceResult(clone(syntheticUnavailableResult())).reference_load_total).toBeNull();
  });

  it("does not recompute the load, so an arithmetically odd but well-formed total still decodes", () => {
    const skewed = clone(syntheticResult({ reference_load_total: 999, items: [syntheticItemResult({ reference_load: 999 })] }));
    expect(decodeReferenceResult(skewed).reference_load_total).toBe(999);
  });

  it("rejects unsupported identities", () => {
    for (const [key, value] of [
      ["result_schema_version", "reference_meal_result_v2"],
      ["formula_version", "experimental_reference_load_v2"],
      ["eligibility_policy_version", "something_else_v1"],
      ["selection_policy_version", "fuzzy_match_v1"],
      ["status", "approved"],
    ] as const) {
      const broken = clone(syntheticResult()) as unknown as Record<string, unknown>;
      broken[key] = value;
      expect(codeOf(() => decodeReferenceResult(broken))).toBe("unsupported_literal");
    }
  });

  it("rejects broken item ordering, identity and state relationships", () => {
    const reordered = clone(syntheticResult({ items: [syntheticItemResult({ position: 3 })] }));
    expect(codeOf(() => decodeReferenceResult(reordered))).toBe("invalid_item_ordering");

    const mismatched = clone(syntheticResult({
      items: [syntheticItemResult({ inputs: syntheticItemInput({ source_record_id: "BAO2011-003" }) })],
    }));
    expect(codeOf(() => decodeReferenceResult(mismatched))).toBe("source_identity_mismatch");

    const calculatedWithoutSource = clone(syntheticResult({ items: [syntheticItemResult({ source: null })] }));
    expect(codeOf(() => decodeReferenceResult(calculatedWithoutSource))).toBe("calculated_without_source");

    const partialTotal = clone(syntheticUnavailableResult({ reference_load_total: 0 }));
    expect(codeOf(() => decodeReferenceResult(partialTotal))).toBe("invalid_unavailable_meal_total");
  });

  it("requires a zero-quantity row to be not_consumed with a zero load", () => {
    const badZero = clone(syntheticResult({
      items: [syntheticItemResult({ inputs: syntheticItemInput({ quantity: 0 }), status: "calculated", reference_load: 5 })],
    }));
    expect(codeOf(() => decodeReferenceResult(badZero))).toBe("invalid_nonconsumption_result");
  });

  it("rejects non-finite, negative and numeric-string values", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1, "207"]) {
      const broken = clone(syntheticResult()) as unknown as Record<string, unknown>;
      broken.reference_load_total = value;
      expect(codeOf(() => decodeReferenceResult(broken))).toBe("expected_finite_nonnegative");
    }
  });

  it("rejects an unsafe discrete integer but keeps a large finite load", () => {
    const unsafeGi = clone(syntheticResult({
      items: [syntheticItemResult({ inputs: syntheticItemInput({ gi: Number.MAX_SAFE_INTEGER + 2 }) })],
    }));
    expect(codeOf(() => decodeReferenceResult(unsafeGi))).toBe("expected_safe_integer");

    const bigLoad = 9.87e18;
    const large = clone(syntheticResult({
      reference_load_total: bigLoad,
      items: [syntheticItemResult({ reference_load: bigLoad })],
    }));
    expect(decodeReferenceResult(large).reference_load_total).toBe(bigLoad);
  });

  it("rejects a mismatched energy unit and a missing required field", () => {
    const mismatchedUnit = clone(syntheticResult({
      items: [syntheticItemResult({ inputs: syntheticItemInput({ kcal_per_unit_unit: "ml" }) })],
    }));
    expect(codeOf(() => decodeReferenceResult(mismatchedUnit))).toBe("energy_unit_mismatch");

    const missing = clone(syntheticResult()) as unknown as Record<string, unknown>;
    delete missing.catalog_version;
    expect(codeOf(() => decodeReferenceResult(missing))).toBe("missing_field");
  });

  it("accepts a historical supported result carrying a different well-formed catalog hash (C1)", () => {
    const historical = clone(syntheticResult({ catalog_version: `r2_sha256_${"b".repeat(64)}` }));
    expect(decodeReferenceResult(historical).catalog_version).toMatch(/^r2_sha256_b+$/);
  });
});

describe("request correspondence (C2)", () => {
  it("reads an omitted optional field as its documented server default", () => {
    const sparse = [{ name: "Synthetic reviewed food", quantity: 150, unit: "g" }];
    const expanded = [syntheticItemInput({ kcal_per_unit: null, kcal_per_unit_unit: null, carb_g: null, source_record_id: null })];
    expect(inputsCorrespondToRequest(sparse, expanded)).toBe(true);
  });

  it("treats an explicit null and an omitted optional field the same way", () => {
    const explicitNull = [{ name: "Synthetic reviewed food", quantity: 150, unit: "g", carb_g: null, gi: null }];
    const expanded = [syntheticItemInput({ kcal_per_unit: null, kcal_per_unit_unit: null, carb_g: null, source_record_id: null })];
    expect(inputsCorrespondToRequest(explicitNull, expanded)).toBe(true);
  });

  it("does not default a missing required field", () => {
    const missingRequired = [{ quantity: 150, unit: "g" }];
    expect(inputsCorrespondToRequest(missingRequired, [syntheticItemInput()])).toBe(false);
  });

  it("rejects a real disagreement in an optional value", () => {
    const disagreeing = [{ name: "Synthetic reviewed food", quantity: 150, unit: "g", carb_g: 0.5 }];
    expect(inputsCorrespondToRequest(disagreeing, [syntheticItemInput()])).toBe(false);
  });
});

describe("response decoding", () => {
  it("requires preview to be literally unpersisted and to match the frozen request", () => {
    const good = { persisted: false, assessment: clone(syntheticResult()) };
    expect(decodePreviewResponse(good, request).assessment.reference_load_total).toBe(207);

    expect(codeOf(() => decodePreviewResponse({ ...good, persisted: true }, request))).toBe("preview_claimed_persisted");

    const otherRequest: ReferencePreviewRequest = { ...request, items: [syntheticItemInput({ quantity: 151 })] };
    expect(codeOf(() => decodePreviewResponse(good, otherRequest))).toBe("preview_request_mismatch");
  });

  it("enforces the saved state/assessment relationship", () => {
    expect(decodeMealResponse(clone(syntheticMealResponse())).assessment_state).toBe("evaluated");

    const evaluatedWithoutAssessment = clone(syntheticMealResponse({ assessment: null }));
    expect(codeOf(() => decodeMealResponse(evaluatedWithoutAssessment))).toBe("evaluated_without_assessment");

    const notEvaluatedWithAssessment = clone(syntheticMealResponse({ assessment_state: "not_evaluated" }));
    expect(codeOf(() => decodeMealResponse(notEvaluatedWithAssessment))).toBe("unevaluated_with_assessment");

    const evidenceErrorWithoutReason = clone(syntheticMealResponse({ assessment_state: "evidence_error", assessment: null, reasons: [] }));
    expect(codeOf(() => decodeMealResponse(evidenceErrorWithoutReason))).toBe("evidence_error_without_reason");
  });

  it("rejects an invented saved ID or a naive saved timestamp", () => {
    const badId = clone(syntheticMealResponse());
    badId.legacy_compatibility.id = "not-a-uuid";
    expect(codeOf(() => decodeMealResponse(badId))).toBe("invalid_saved_id");

    const naive = clone(syntheticMealResponse());
    naive.legacy_compatibility.created_at = "2026-09-19T12:00:00";
    expect(codeOf(() => decodeMealResponse(naive))).toBe("expected_timezone_qualified_timestamp");
  });

  it("keeps valid list entries when a neighbour is malformed and never reports deletion", () => {
    const decoded = decodeMealList([
      clone(syntheticMealResponse()),
      { assessment_state: "sideways", assessment: null, reasons: [], legacy_compatibility: {} },
      clone(syntheticMealResponse({ assessment_state: "not_evaluated", assessment: null })),
    ]);
    expect(decoded.entries).toHaveLength(2);
    expect(decoded.failures).toEqual([{ index: 1, code: "unsupported_literal" }]);
  });

  it("confirms persistence for a valid evidence_error without authorizing recomputation", () => {
    const stored = syntheticMealResponse({
      assessment_state: "evidence_error",
      assessment: null,
      reasons: [{ code: "invalid_stored_assessment", detail: "Stored evidence is corrupt or unsupported" }],
    });
    expect(savedResponseConfirmsRequest(request, stored)).toBe(true);
    expect(stored.assessment).toBeNull();
  });

  it("treats a malformed success as ambiguous rather than confirmed", () => {
    const mismatched = syntheticMealResponse({ assessment: syntheticResult({ items: [syntheticItemResult({ inputs: syntheticItemInput({ quantity: 999 }) })], reference_load_total: 207 }) });
    expect(savedResponseConfirmsRequest(request, mismatched)).toBe(false);
  });
});
