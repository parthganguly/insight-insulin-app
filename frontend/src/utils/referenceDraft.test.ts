import { describe, expect, it } from "vitest";
import {
  buildReferenceDraftFromEvidence,
  buildReferenceDraftFromLegacyMeal,
  buildReferencePreviewRequest,
  clearReferenceItemNutrition,
  confirmReferenceItemBasis,
  createEmptyReferenceItem,
  createReferenceDraft,
  getReferenceMaterialSnapshot,
  markSelectionsNeedingReview,
  parseReferenceNumericInput,
  referenceItemFromAiExtraction,
  selectReferenceSource,
  updateReferenceDraftItem,
  validateReferenceDraftBeforeSave,
} from "./referenceDraft";
import { syntheticMealResponse } from "../api/referenceFixtures";
import { REFERENCE_CATALOG_PIN, type ReferenceDraft, type ReferenceDraftItem } from "../types/experimentalReference";
import { Unit } from "../types/MealItem";
import type { Meal } from "../types/Meal";

/** 150 g eaten of a food whose label reads "per 100 g: 200 kcal, 20 g carbohydrate". */
const reviewedItem = (overrides: Partial<ReferenceDraftItem> = {}): ReferenceDraftItem => ({
  ...createEmptyReferenceItem(),
  name: "Reviewed food",
  amount: 150,
  servingUnit: Unit.Grams,
  servingSize: 100,
  kcalPerServing: 200,
  carbPerServing_g: 20,
  basisReviewed: true,
  selection: { state: "selected", sourceId: "BAO2011-002", catalogVersion: REFERENCE_CATALOG_PIN },
  ...overrides,
});

const draftWith = (items: ReferenceDraftItem[], overrides: Partial<ReferenceDraft> = {}): ReferenceDraft => ({
  ...createReferenceDraft(),
  name: "Synthetic reference meal",
  reviewedCatalogVersion: REFERENCE_CATALOG_PIN,
  items,
  ...overrides,
});

describe("numeric input", () => {
  it("keeps missing, explicit zero and invalid entries distinct", () => {
    expect(parseReferenceNumericInput("")).toEqual({ kind: "blank" });
    expect(parseReferenceNumericInput(null)).toEqual({ kind: "blank" });
    expect(parseReferenceNumericInput("0")).toEqual({ kind: "value", value: 0 });
    expect(parseReferenceNumericInput("abc")).toEqual({ kind: "invalid" });
    expect(parseReferenceNumericInput("-4")).toEqual({ kind: "invalid" });
    expect(parseReferenceNumericInput(Number.POSITIVE_INFINITY)).toEqual({ kind: "invalid" });
  });

  it("never converts an invalid entry into a missing value", () => {
    const item = updateReferenceDraftItem(reviewedItem(), "kcalPerServing", "not a number");
    expect(item.invalidFields).toContain("kcalPerServing");
    expect(item.kcalPerServing).toBe(200);
  });

  it("starts a new manual item with null nutrition and a visible grams unit", () => {
    const fresh = createEmptyReferenceItem();
    expect(fresh.amount).toBeNull();
    expect(fresh.kcalPerServing).toBeNull();
    expect(fresh.servingSize).toBeNull();
    expect(fresh.servingUnit).toBe(Unit.Grams);
    expect(fresh.basisReviewed).toBe(false);
  });
});

describe("reviewed-basis conversion", () => {
  it("divides by the denominator exactly once: 150 g at 200 kcal per 100 g is 300 kcal", () => {
    const result = buildReferencePreviewRequest(draftWith([reviewedItem()]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [item] = result.request.items;
    expect(item.quantity).toBe(150);
    expect(item.kcal_per_unit).toBe(2);
    expect(item.kcal_per_unit_unit).toBe("g");
    expect(item.carb_g).toBe(0.2);
    // Eaten totals the server will produce from these inputs.
    expect(item.quantity * (item.kcal_per_unit as number)).toBe(300);
    expect(item.quantity * (item.carb_g as number)).toBe(30);
  });

  it("does not divide again when the same draft is mapped twice", () => {
    const draft = draftWith([reviewedItem()]);
    const first = buildReferencePreviewRequest(draft);
    const second = buildReferencePreviewRequest(draft);
    expect(first).toEqual(second);
  });

  it("treats GI as an index and never divides it", () => {
    const result = buildReferencePreviewRequest(draftWith([reviewedItem({ gi: 43 })]));
    expect(result.ok && result.request.items[0].gi).toBe(43);
  });

  it("carries null nutrition when everything is unknown, with no basis required", () => {
    const unknown = { ...createEmptyReferenceItem(), name: "Unknown food", amount: 90 };
    const result = buildReferencePreviewRequest(draftWith([unknown]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.items[0]).toMatchObject({ quantity: 90, kcal_per_unit: null, kcal_per_unit_unit: null, carb_g: null, gi: null });
  });

  it("writes optional values explicitly, including the declared nutrition origin", () => {
    const result = buildReferencePreviewRequest(draftWith([reviewedItem({ nutritionOrigin: "label" })]));
    expect(result.ok && result.request.items[0].nutrition_origin).toBe("label");
  });

  it("requires a positive denominator once any nutrient is supplied", () => {
    const result = buildReferencePreviewRequest(draftWith([reviewedItem({ servingSize: 0 })]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/serving size/i);
  });
});

describe("draft validation", () => {
  it("accepts zero quantity and an all-zero meal", () => {
    expect(validateReferenceDraftBeforeSave(draftWith([reviewedItem({ amount: 0 })]))).toBeNull();
  });

  it("does not treat a missing source or missing energy as an input error", () => {
    const noSource = reviewedItem({ selection: { state: "none" }, kcalPerServing: null, carbPerServing_g: null, servingSize: null });
    expect(validateReferenceDraftBeforeSave(draftWith([noSource]))).toBeNull();
  });

  it("rejects a missing amount, a blank name and a blank meal name", () => {
    expect(validateReferenceDraftBeforeSave(draftWith([reviewedItem({ amount: null })]))).toMatch(/amount eaten/i);
    expect(validateReferenceDraftBeforeSave(draftWith([reviewedItem({ name: "  " })]))).toMatch(/needs a name/i);
    expect(validateReferenceDraftBeforeSave(draftWith([reviewedItem()], { name: " " }))).toMatch(/meal needs a name/i);
  });

  it("blocks calculation until an unreviewed basis and a stale selection are resolved", () => {
    expect(validateReferenceDraftBeforeSave(draftWith([reviewedItem({ basisReviewed: false })]))).toMatch(/nutrition basis/i);
    const stale = reviewedItem({ selection: { state: "needs_review", sourceId: "BAO2011-002", catalogVersion: REFERENCE_CATALOG_PIN, cause: "catalog_changed" } });
    expect(validateReferenceDraftBeforeSave(draftWith([stale]))).toMatch(/needs review after a catalog change/i);
  });
});

describe("edit authority", () => {
  it("raises no nutrition review when a blank new item is first named", () => {
    // "These values were for X" is unanswerable when there are no values.
    const named = updateReferenceDraftItem(createEmptyReferenceItem(), "name", "Freshly typed food");
    expect(named.needsReview).toBeUndefined();
    expect(named.name).toBe("Freshly typed food");
    expect(validateReferenceDraftBeforeSave(draftWith([{ ...named, amount: 0 }]))).toBeNull();
  });

  it("clears source approval and re-opens carried-value review on a food-identity change", () => {
    const renamed = updateReferenceDraftItem(reviewedItem(), "name", "Something else");
    expect(renamed.selection).toEqual({ state: "none" });
    expect(renamed.needsReview).toEqual({ previousName: "Reviewed food" });
    // The denominator and unit did not change, so the basis is still reviewed.
    expect(renamed.basisReviewed).toBe(true);
    expect(validateReferenceDraftBeforeSave(draftWith([renamed]))).toMatch(/carried nutrition/i);
  });

  it("keeps the source but re-opens basis review on a unit or denominator change", () => {
    const unitChanged = updateReferenceDraftItem(reviewedItem(), "servingUnit", Unit.Milliliters);
    expect(unitChanged.selection).toEqual({ state: "selected", sourceId: "BAO2011-002", catalogVersion: REFERENCE_CATALOG_PIN });
    expect(unitChanged.basisReviewed).toBe(false);

    const denominatorChanged = updateReferenceDraftItem(reviewedItem(), "servingSize", "50");
    expect(denominatorChanged.basisReviewed).toBe(false);
  });

  it("keeps the source and the reviewed basis on an amount change", () => {
    const amended = updateReferenceDraftItem(reviewedItem(), "amount", "200");
    expect(amended.amount).toBe(200);
    expect(amended.basisReviewed).toBe(true);
    expect(amended.selection).toMatchObject({ state: "selected" });
  });

  it("confirms carried nutrition without ever reselecting a source", () => {
    const carried = reviewedItem({ basisReviewed: false, selection: { state: "none" }, needsReview: { previousName: "Old name" } });
    const confirmed = confirmReferenceItemBasis(carried);
    expect(confirmed.basisReviewed).toBe(true);
    expect(confirmed.needsReview).toBeUndefined();
    expect(confirmed.selection).toEqual({ state: "none" });
  });

  it("clears carried nutrition to unknown so an unavailable assessment stays possible", () => {
    const cleared = clearReferenceItemNutrition(reviewedItem());
    expect(cleared.kcalPerServing).toBeNull();
    expect(cleared.servingSize).toBeNull();
    expect(cleared.basisReviewed).toBe(true);
    expect(validateReferenceDraftBeforeSave(draftWith([cleared]))).toBeNull();
  });

  it("does not increment material state for a pure no-op setter", () => {
    const item = reviewedItem();
    expect(updateReferenceDraftItem(item, "amount", 150)).toBe(item);
    expect(updateReferenceDraftItem(item, "name", "Reviewed food")).toBe(item);
  });
});

describe("material snapshot", () => {
  const draft = draftWith([reviewedItem()]);

  it("changes when a material input, the order or the catalog identity changes", () => {
    const base = getReferenceMaterialSnapshot(draft);
    expect(getReferenceMaterialSnapshot({ ...draft, items: [updateReferenceDraftItem(draft.items[0], "amount", 151)] })).not.toBe(base);
    expect(getReferenceMaterialSnapshot({ ...draft, reviewedCatalogVersion: null })).not.toBe(base);
    const two = draftWith([reviewedItem({ name: "A" }), reviewedItem({ name: "B" })]);
    expect(getReferenceMaterialSnapshot({ ...two, items: [...two.items].reverse() })).not.toBe(getReferenceMaterialSnapshot(two));
  });

  it("includes the review authority so a confirmation is a material change", () => {
    const unreviewed = { ...draft, items: [reviewedItem({ basisReviewed: false })] };
    expect(getReferenceMaterialSnapshot(unreviewed)).not.toBe(getReferenceMaterialSnapshot(draft));
  });

  it("ignores title, time and photo", () => {
    const base = getReferenceMaterialSnapshot(draft);
    expect(getReferenceMaterialSnapshot({ ...draft, name: "Renamed", timestamp: 1, image: "data:image/png;base64,AA" })).toBe(base);
  });

  it("returns to the same snapshot after an A to B to A edit", () => {
    const base = getReferenceMaterialSnapshot(draft);
    const toB = updateReferenceDraftItem(draft.items[0], "amount", 10);
    const backToA = updateReferenceDraftItem(toB, "amount", 150);
    expect(getReferenceMaterialSnapshot({ ...draft, items: [backToA] })).toBe(base);
  });
});

describe("catalog re-review", () => {
  it("marks every previous selection for explicit review and drops the reviewed version", () => {
    const stale = markSelectionsNeedingReview(draftWith([reviewedItem(), reviewedItem({ name: "Second" })]));
    expect(stale.reviewedCatalogVersion).toBeNull();
    expect(stale.items.every((item) => item.selection.state === "needs_review")).toBe(true);
  });

  it("refuses to build a new evaluation against an unreviewed pin", () => {
    const unreviewed = draftWith([reviewedItem()], { reviewedCatalogVersion: `r2_sha256_${"c".repeat(64)}` });
    const result = buildReferencePreviewRequest(unreviewed);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/has not been reviewed/i);
  });

  it("omits a source whose selection belongs to a different reviewed version", () => {
    const mixed = reviewedItem({ selection: { state: "selected", sourceId: "BAO2011-002", catalogVersion: `r2_sha256_${"d".repeat(64)}` } });
    const result = buildReferencePreviewRequest(draftWith([mixed]));
    expect(result.ok && result.request.items[0].source_record_id).toBeNull();
  });

  it("selects and clears a source explicitly", () => {
    const cleared = selectReferenceSource(reviewedItem(), null, REFERENCE_CATALOG_PIN);
    expect(cleared.selection).toEqual({ state: "none" });
    const selected = selectReferenceSource(createEmptyReferenceItem(), "BAO2011-002", REFERENCE_CATALOG_PIN);
    expect(selected.selection).toEqual({ state: "selected", sourceId: "BAO2011-002", catalogVersion: REFERENCE_CATALOG_PIN });
  });
});

describe("reuse and import adapters", () => {
  it("reuses validated evidence with fresh IDs, denominator 1 and suggestions only", () => {
    const reused = buildReferenceDraftFromEvidence(syntheticMealResponse());
    expect(reused).not.toBeNull();
    if (!reused) return;
    const [item] = reused.items;
    expect(reused.reviewedCatalogVersion).toBeNull();
    expect(item.servingSize).toBe(1);
    expect(item.amount).toBe(150);
    expect(item.kcalPerServing).toBe(2);
    expect(item.selection.state).toBe("needs_review");
    expect(item.basisReviewed).toBe(false);
    // No attached result, fingerprint or old request identity enters a draft.
    // The suggestion's catalog version is kept deliberately and is not evidence.
    expect(JSON.stringify(reused)).not.toMatch(/client_request_id|reference_load|"assessment"|envelope_version/);
  });

  it("does not reuse evidence from a not_evaluated meal", () => {
    expect(buildReferenceDraftFromEvidence(syntheticMealResponse({ assessment_state: "not_evaluated", assessment: null }))).toBeNull();
  });

  it("raises no nutrition review on a reused legacy meal, which carries no nutrition", () => {
    const legacy: Meal = {
      id: "legacy-2", image: null, name: "Legacy meal", timestamp: 1, items: [
        { id: "i1", name: "Legacy item", servingSize: 1, servingUnit: Unit.Grams, amount: 120, kcalPerServing: 3, carbPerServing_g: 0.4, satFatPerServing_g: 0.1, gi: 50 },
      ],
    };
    expect(buildReferenceDraftFromLegacyMeal(legacy).items[0].needsReview).toBeUndefined();
  });

  it("reuses a legacy meal as name and portion suggestions with unknown nutrition", () => {
    const legacy: Meal = {
      id: "legacy-1", image: null, name: "Legacy meal", timestamp: 1, items: [
        { id: "i1", name: "Legacy item", servingSize: 1, servingUnit: Unit.Grams, amount: 120, kcalPerServing: 3, carbPerServing_g: 0.4, satFatPerServing_g: 0.1, gi: 50 },
      ],
    };
    const reused = buildReferenceDraftFromLegacyMeal(legacy);
    expect(reused.items[0].amount).toBe(120);
    expect(reused.items[0].kcalPerServing).toBeNull();
    expect(reused.items[0].carbPerServing_g).toBeNull();
    expect(reused.items[0].gi).toBeNull();
    expect(reused.items[0].selection).toEqual({ state: "none" });
  });

  it("imports an AI proposal without density guessing, FII or a default zero", () => {
    const item = referenceItemFromAiExtraction({ name: "Proposed food", quantity: 150, unit: "g", kcalPerUnit: 2, carb_g: 0.2, gi: 43, fii: 88 });
    expect(item.servingSize).toBe(1);
    expect(item.kcalPerServing).toBe(2);
    expect(item.carbPerServing_g).toBe(0.2);
    expect(item.proteinPerServing_g).toBeNull();
    expect(item.basisReviewed).toBe(false);
    expect(item.selection).toEqual({ state: "none" });
    // A proposed FII is never read, under any field name.
    expect(Object.values(item)).not.toContain(88);
    expect(item).not.toHaveProperty("fii");
  });

  it("keeps an ambiguous AI basis unreviewed and unused", () => {
    const item = referenceItemFromAiExtraction({ name: "Proposed food", quantity: 150, kcalPerUnit: 200 });
    expect(item.servingSize).toBeNull();
    expect(item.kcalPerServing).toBeNull();
    expect(item.amount).toBeNull();
  });
});
