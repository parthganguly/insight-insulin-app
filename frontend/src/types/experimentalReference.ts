export type AssessmentState = "evaluated" | "not_evaluated" | "evidence_error";
export type ReferenceStatus = "experimental" | "unavailable";
export type ItemResultStatus = "calculated" | "unavailable" | "not_consumed";
export type EligibilityStatus = "candidate" | "reference_only" | "requires_review";

export type Reason = { code: string; detail: string };
export type Eligibility = { use: "experimental_fii_input" | "composition_energy" | "gi_gl_calculation" | "fibre_context"; status: EligibilityStatus; reasons: string[] };

export type ReferenceItemInput = {
  name: string;
  quantity: number;
  unit: string;
  kcal_per_unit?: number | null;
  kcal_per_unit_unit?: string | null;
  nutrition_origin?: "manual" | "label" | "ai_reviewed" | "other";
  carb_g?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  sat_fat_g?: number | null;
  gi?: number | null;
  source_record_id: string | null;
};

export type ReferencePreviewRequest = {
  meal_name: string;
  expected_catalog_version: string;
  items: ReferenceItemInput[];
};
export type ReferenceSaveRequest = ReferencePreviewRequest & { client_request_id: string; created_at?: string };

export type SourceEvidence = {
  source_record_id: string;
  source_food_wording: string;
  fii_mean: number | null;
  uncertainty_type: "SEM";
  uncertainty_value: number | null;
  uncertainty_meaning: "published_food_mean_not_personal_interval";
  reference_scale: string;
  actual_test_energy_kJ: number;
  composition_basis_kJ: number;
  source_study: string;
  source_doi: string;
  source_table: string;
  source_printed_page: number | string;
  source_row: number;
  source_footnote: string;
  population: string;
  issue_ids: string[];
  eligibility: Eligibility[];
};

export type ItemResult = {
  position: number;
  inputs: ReferenceItemInput;
  selection_label: "explicit_source_reference_not_verified_food_equivalence";
  status: ItemResultStatus;
  eaten_kcal: number | null;
  reference_load: number | null;
  source: SourceEvidence | null;
  reasons: Reason[];
};

export type ReferenceResult = {
  result_schema_version: "reference_meal_result_v1";
  formula_version: "experimental_reference_load_v1";
  catalog_version: string;
  catalog_schema_version: string;
  eligibility_policy_version: string;
  selection_policy_version: string;
  status: ReferenceStatus;
  reference_load_total: number | null;
  items: ItemResult[];
  reasons: Reason[];
};

export type ReferenceMealResponse = {
  assessment_state: AssessmentState;
  assessment: ReferenceResult | null;
  reasons: Reason[];
  legacy_compatibility: unknown;
};

export type CatalogBrowseRecord = {
  source_record_id: string;
  source_food_wording: string;
  food_category: string;
  fii_mean: number | null;
  fii_sem: number | null;
  source_study: string;
  source_doi: string;
  reference_scale: string | null;
  actual_test_energy_kJ: number;
  eligibility: Eligibility & { use: "experimental_fii_input" };
};
export type CatalogBrowse = { catalog_version: string; records: CatalogBrowseRecord[] };
