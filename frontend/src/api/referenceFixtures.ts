import {
  CATALOG_SCHEMA_VERSION,
  ELIGIBILITY_POLICY_VERSION,
  FORMULA_VERSION,
  REFERENCE_CATALOG_PIN,
  RESULT_SCHEMA_VERSION,
  SELECTION_POLICY_VERSION,
  type ItemResult,
  type ReferenceItemInput,
  type ReferenceMealResponse,
  type ReferenceResult,
  type SourceEvidence,
} from "../types/experimentalReference";

// Synthetic reference fixtures. Every value here is invented for tests and for
// isolated display mounts (freeze E, T11); none of it is owner data, a real
// meal, or a substitute for a server calculation. Building a fixture never
// proves the backend computed anything.

export const syntheticItemInput = (overrides: Partial<ReferenceItemInput> = {}): ReferenceItemInput => ({
  name: "Synthetic reviewed food",
  quantity: 150,
  unit: "g",
  kcal_per_unit: 2,
  kcal_per_unit_unit: "g",
  nutrition_origin: "manual",
  carb_g: 0.2,
  protein_g: null,
  fat_g: null,
  sat_fat_g: null,
  gi: null,
  source_record_id: "BAO2011-002",
  ...overrides,
});

export const syntheticSourceEvidence = (overrides: Partial<SourceEvidence> = {}): SourceEvidence => ({
  source_record_id: "BAO2011-002",
  source_food_wording: "Synthetic published reference wording",
  fii_mean: 69,
  uncertainty_type: "SEM",
  uncertainty_value: 6,
  uncertainty_meaning: "published_food_mean_not_personal_interval",
  reference_scale: "glucose=100",
  actual_test_energy_kJ: 1000,
  composition_basis_kJ: 1000,
  source_study: "Synthetic study",
  source_doi: "10.0000/synthetic",
  source_table: "Table 1",
  source_printed_page: 1,
  source_row: 2,
  source_footnote: "",
  test_year: 2011,
  population: "Synthetic published population",
  record_sample_size: null,
  record_sample_size_status: "not_reported_per_record",
  issue_ids: [],
  eligibility: [{ use: "experimental_fii_input", status: "candidate", reasons: ["attributed_glucose_reference_1000_kj"] }],
  ...overrides,
});

export const syntheticItemResult = (overrides: Partial<ItemResult> = {}): ItemResult => ({
  position: 0,
  inputs: syntheticItemInput(),
  selection_label: "explicit_source_reference_not_verified_food_equivalence",
  status: "calculated",
  eaten_kcal: 300,
  reference_load: 207,
  source: syntheticSourceEvidence(),
  reasons: [],
  ...overrides,
});

export const syntheticResult = (overrides: Partial<ReferenceResult> = {}): ReferenceResult => ({
  result_schema_version: RESULT_SCHEMA_VERSION,
  formula_version: FORMULA_VERSION,
  catalog_version: REFERENCE_CATALOG_PIN,
  catalog_schema_version: CATALOG_SCHEMA_VERSION,
  eligibility_policy_version: ELIGIBILITY_POLICY_VERSION,
  selection_policy_version: SELECTION_POLICY_VERSION,
  status: "experimental",
  reference_load_total: 207,
  items: [syntheticItemResult()],
  reasons: [],
  ...overrides,
});

/** An unavailable meal: null total plus explicit reasons, never a zero or partial total. */
export const syntheticUnavailableResult = (overrides: Partial<ReferenceResult> = {}): ReferenceResult => syntheticResult({
  status: "unavailable",
  reference_load_total: null,
  items: [syntheticItemResult({
    status: "unavailable",
    reference_load: null,
    source: null,
    inputs: syntheticItemInput({ source_record_id: null }),
    reasons: [{ code: "no_reference_selected", detail: "No explicit source record selected" }],
  })],
  reasons: [{ code: "incomplete_consumed_items", detail: "See ordered item reasons" }],
  ...overrides,
});

export const syntheticMealResponse = (overrides: Partial<ReferenceMealResponse> = {}): ReferenceMealResponse => ({
  assessment_state: "evaluated",
  assessment: syntheticResult(),
  reasons: [],
  legacy_compatibility: {
    id: "11111111-2222-4333-8444-555555555555",
    meal_name: "Synthetic reference meal",
    created_at: "2026-09-19T12:00:00Z",
  },
  ...overrides,
});
