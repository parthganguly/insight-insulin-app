import type { DraftProvenance, MealItemNeedsReview, Unit } from "./MealItem";

export type AssessmentState = "evaluated" | "not_evaluated" | "evidence_error";
export type ReferenceStatus = "experimental" | "unavailable";
export type ItemResultStatus = "calculated" | "unavailable" | "not_consumed";
export type EligibilityStatus = "candidate" | "reference_only" | "requires_review";
export type EligibilityUse = "experimental_fii_input" | "composition_energy" | "gi_gl_calculation" | "fibre_context";
export type NutritionOrigin = "manual" | "label" | "ai_reviewed" | "other";

// Narrowed to the backend's supported literals (R3B/D10). A value outside
// these sets is a protocol error, never a coerced display string.
export type ReferenceUnit = "g" | "ml" | "pcs" | "slice" | "cup" | "tbsp" | "serving";
export const REFERENCE_UNITS: readonly ReferenceUnit[] = ["g", "ml", "pcs", "slice", "cup", "tbsp", "serving"];

export const REFERENCE_CATALOG_PIN = "r2_sha256_6db5357ae368981b1e2781a2a2402d60d63850e7b59c63e757b654a39bdc51d9";
export const RESULT_SCHEMA_VERSION = "reference_meal_result_v1";
export const FORMULA_VERSION = "experimental_reference_load_v1";
export const CATALOG_SCHEMA_VERSION = "insight_reference_catalog_v1";
export const ELIGIBILITY_POLICY_VERSION = "experimental_fii_input_v1";
export const SELECTION_POLICY_VERSION = "explicit_source_id_v1";

export type Reason = { code: string; detail: string };
export type Eligibility = { use: EligibilityUse; status: EligibilityStatus; reasons: string[] };

export type ReferenceItemInput = {
  name: string;
  quantity: number;
  unit: ReferenceUnit;
  kcal_per_unit: number | null;
  kcal_per_unit_unit: ReferenceUnit | null;
  nutrition_origin: NutritionOrigin;
  carb_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  gi: number | null;
  source_record_id: string | null;
};

export type ReferencePreviewRequest = {
  meal_name: string;
  expected_catalog_version: string;
  items: ReferenceItemInput[];
};
export type ReferenceSaveRequest = ReferencePreviewRequest & { client_request_id: string; created_at: string | null };

export type SourceEvidence = {
  source_record_id: string;
  source_food_wording: string;
  fii_mean: number | null;
  uncertainty_type: "SEM";
  uncertainty_value: number | null;
  uncertainty_meaning: "published_food_mean_not_personal_interval";
  reference_scale: "glucose=100";
  actual_test_energy_kJ: number;
  composition_basis_kJ: number;
  source_study: string;
  source_doi: string;
  source_table: string;
  source_printed_page: number | string;
  source_row: number;
  source_footnote: string;
  test_year: number | null;
  population: string;
  record_sample_size: null;
  record_sample_size_status: string;
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
  result_schema_version: typeof RESULT_SCHEMA_VERSION;
  formula_version: typeof FORMULA_VERSION;
  catalog_version: string;
  catalog_schema_version: typeof CATALOG_SCHEMA_VERSION;
  eligibility_policy_version: typeof ELIGIBILITY_POLICY_VERSION;
  selection_policy_version: typeof SELECTION_POLICY_VERSION;
  status: ReferenceStatus;
  reference_load_total: number | null;
  items: ItemResult[];
  reasons: Reason[];
};

// `legacy_compatibility` is validated only for saved identity/title/time.
// Its numeric defaults are never mapped into reference evidence (D6).
export type LegacyCompatibilityEnvelope = {
  id: string;
  meal_name: string;
  created_at: string;
};

export type ReferenceMealResponse = {
  assessment_state: AssessmentState;
  assessment: ReferenceResult | null;
  reasons: Reason[];
  legacy_compatibility: LegacyCompatibilityEnvelope;
};

export type ReferencePreviewResponse = { persisted: false; assessment: ReferenceResult };

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

// ---------------- Editable reference draft (D2) ----------------
//
// The nullable variant exists because bolting a source ID onto a legacy
// MealItem after its missing numbers have already become zero cannot recover
// the original missingness. Field names are retained so the existing item
// editor owns the same controls.

/**
 * M03: a needs_review selection records its CAUSE. Claiming "the catalog
 * changed" for a reused suggestion would assert an event that never happened,
 * so an unknown cause stays neutral.
 */
export type ReferenceReviewCause = "catalog_changed" | "reused_suggestion" | "unspecified";

export type ReferenceSelection =
  | { state: "none" }
  | { state: "selected"; sourceId: string; catalogVersion: string }
  | { state: "needs_review"; sourceId: string; catalogVersion: string; cause: ReferenceReviewCause };

export type ReferenceDraftItem = {
  id: string;
  name: string;
  image?: string;
  amount: number | null;
  servingUnit: Unit;
  servingSize: number | null; // nutrition denominator, in servingUnit
  kcalPerServing: number | null;
  carbPerServing_g: number | null;
  proteinPerServing_g: number | null;
  fatPerServing_g: number | null;
  satFatPerServing_g: number | null;
  gi: number | null;
  nutritionOrigin: NutritionOrigin;
  basisReviewed: boolean;
  invalidFields: string[]; // invalid input is never silently converted to missing
  selection: ReferenceSelection;
  draftProvenance?: DraftProvenance;
  needsReview?: MealItemNeedsReview;
};

export type ReferenceDraft = {
  contract: "reference";
  id: string;
  name: string;
  timestamp: number;
  image: string | null;
  items: ReferenceDraftItem[];
  reviewedCatalogVersion: string | null;
  isAiDraft?: boolean;
  source_meal_id?: string;
};

// ---------------- Cached history attachment (D6) ----------------

export type ReferenceAttachment =
  | { state: "not_loaded" }
  | { state: "invalid_cache" }
  | { state: "not_evaluated"; reasons: Reason[] }
  | { state: "evidence_error"; reasons: Reason[] }
  | { state: "evaluated"; assessment: Readonly<ReferenceResult>; reasons: Reason[] };

export type ReferenceRefresh = "idle" | "loading" | "fresh" | "read_error" | "offline" | "not_found";
