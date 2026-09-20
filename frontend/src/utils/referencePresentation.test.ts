import { describe, expect, it } from "vitest";
import {
  formatNutrientTotal,
  formatReferenceNumber,
  speakReferenceNumber,
  summariseReferenceNutrient,
  summariseReferenceNutrition,
} from "./referencePresentation";
import { syntheticItemInput, syntheticItemResult, syntheticResult } from "../api/referenceFixtures";

describe("reference number display (D1)", () => {
  it("shows an exact zero as a real zero", () => {
    expect(formatReferenceNumber(0)).toBe("0");
  });

  it("marks a positive value below one tenth without inventing precision", () => {
    expect(formatReferenceNumber(0.04)).toBe("<0.1");
    expect(formatReferenceNumber(0.0000001)).toBe("<0.1");
    expect(formatReferenceNumber(0.1)).toBe("0.1");
  });

  it("keeps at most one decimal and drops a trailing .0", () => {
    expect(formatReferenceNumber(42)).toBe("42");
    expect(formatReferenceNumber(207)).toBe("207");
    expect(formatReferenceNumber(240.72750000000002)).toBe("240.7");
    expect(formatReferenceNumber(0.25)).toBe("0.3");
  });

  it("switches to a bare-mantissa exponential at a million", () => {
    expect(formatReferenceNumber(999_999.9)).toBe("999999.9");
    expect(formatReferenceNumber(1_000_000)).toBe("1e+6");
    expect(formatReferenceNumber(1_234_567)).toBe("1.2e+6");
    expect(formatReferenceNumber(9.87e18)).toBe("9.9e+18");
  });

  it("renders no number at all for null, non-finite or negative input", () => {
    for (const value of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(formatReferenceNumber(value as number | null)).toBeNull();
    }
  });

  it("speaks exactly what it displays", () => {
    expect(speakReferenceNumber(0)).toBe("0");
    expect(speakReferenceNumber(0.04)).toBe("less than 0.1");
    expect(speakReferenceNumber(240.72750000000002)).toBe("240.7");
    expect(speakReferenceNumber(1_000_000)).toBe("1 times ten to the power of 6");
    expect(speakReferenceNumber(1_234_567)).toBe("1.2 times ten to the power of 6");
    expect(speakReferenceNumber(null)).toBeNull();
  });
});

describe("reviewed nutrition read-back", () => {
  it("reads 300 kcal and 30 g carbs back from the reviewed 150 g / per-100 g inputs", () => {
    const result = syntheticResult();
    expect(summariseReferenceNutrient(result, "kcal")).toMatchObject({ known: 300, complete: true });
    expect(summariseReferenceNutrient(result, "carb_g")).toMatchObject({ known: 30, complete: true });
  });

  it("marks a nutrient unknown when any consumed row is missing it", () => {
    const mixed = syntheticResult({
      reference_load_total: 414,
      items: [
        syntheticItemResult(),
        syntheticItemResult({ position: 1, inputs: syntheticItemInput({ name: "Second food", carb_g: null }) }),
      ],
    });
    const carbs = summariseReferenceNutrient(mixed, "carb_g");
    expect(carbs.complete).toBe(false);
    expect(carbs.known).toBe(30);
    expect(carbs.missingItemNames).toEqual(["Second food"]);
    expect(formatNutrientTotal(carbs, "carb_g")).toEqual({ text: "30 g", partial: true });
  });

  it("excludes a not-consumed row from the totals", () => {
    const withZero = syntheticResult({
      items: [
        syntheticItemResult(),
        syntheticItemResult({
          position: 1,
          inputs: syntheticItemInput({ name: "Skipped", quantity: 0 }),
          status: "not_consumed",
          eaten_kcal: 0,
          reference_load: 0,
          reasons: [{ code: "zero_quantity", detail: "Explicitly not consumed" }],
        }),
      ],
    });
    expect(summariseReferenceNutrient(withZero, "kcal")).toMatchObject({ known: 300, complete: true });
  });

  it("returns no reference-domain nutrition at all without validated evidence", () => {
    expect(summariseReferenceNutrition(null)).toBeNull();
    const noNutrition = summariseReferenceNutrient(syntheticResult({ items: [syntheticItemResult({ inputs: syntheticItemInput({ protein_g: null }) })] }), "protein_g");
    expect(noNutrition.known).toBeNull();
    expect(formatNutrientTotal(noNutrition, "protein_g")).toBeNull();
  });
});
