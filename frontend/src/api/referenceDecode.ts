import {
  CATALOG_SCHEMA_VERSION,
  ELIGIBILITY_POLICY_VERSION,
  FORMULA_VERSION,
  REFERENCE_CATALOG_PIN,
  REFERENCE_UNITS,
  RESULT_SCHEMA_VERSION,
  SELECTION_POLICY_VERSION,
  type CatalogBrowse,
  type CatalogBrowseRecord,
  type Eligibility,
  type EligibilityUse,
  type ItemResult,
  type LegacyCompatibilityEnvelope,
  type NutritionOrigin,
  type Reason,
  type ReferenceItemInput,
  type ReferenceMealResponse,
  type ReferencePreviewRequest,
  type ReferencePreviewResponse,
  type ReferenceResult,
  type ReferenceUnit,
  type SourceEvidence,
} from "../types/experimentalReference";

// Runtime decoders shared by HTTP, the saved-meal cache and the retry journal
// (freeze D10). They validate shape, identity and state/value relationships.
// They never recalculate a reference load, sum a scientific total or reproduce
// the server-only StoredAssessment.sha256 envelope.

export class ReferenceDecodeError extends Error {
  constructor(readonly code: string, readonly path: string) {
    super(`${code} at ${path}`);
    this.name = "ReferenceDecodeError";
  }
}

const fail = (code: string, path: string): never => {
  throw new ReferenceDecodeError(code, path);
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_ID_PATTERN = /^(BAO2011-|BELL2016-S1-)\d{3}$/;
const CATALOG_ID_PATTERN = /^r2_sha256_[0-9a-f]{64}$/;
const ELIGIBILITY_USES: readonly EligibilityUse[] = ["experimental_fii_input", "composition_energy", "gi_gl_calculation", "fibre_context"];
const ELIGIBILITY_STATUSES = ["candidate", "reference_only", "requires_review"] as const;
const NUTRITION_ORIGINS: readonly NutritionOrigin[] = ["manual", "label", "ai_reviewed", "other"];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const obj = (value: unknown, path: string): Record<string, unknown> =>
  isPlainObject(value) ? value : fail("expected_object", path);

const arr = (value: unknown, path: string): unknown[] =>
  Array.isArray(value) ? value : fail("expected_array", path);

// A required key must be present: an absent key is not an explicit null.
const field = (source: Record<string, unknown>, key: string, path: string): unknown =>
  Object.prototype.hasOwnProperty.call(source, key) ? source[key] : fail("missing_field", `${path}.${key}`);

const str = (value: unknown, path: string): string =>
  typeof value === "string" ? value : fail("expected_string", path);

const nonEmptyStr = (value: unknown, path: string): string => {
  const text = str(value, path);
  return text.trim().length > 0 ? text : fail("expected_nonempty_string", path);
};

const bool = (value: unknown, path: string): boolean =>
  typeof value === "boolean" ? value : fail("expected_boolean", path);

// Floating-point contract: finite and nonnegative. Deliberately NOT bounded by
// Number.MAX_SAFE_INTEGER — a large finite reference load stays displayable
// rather than becoming a protocol error (C2).
const finiteNonNegative = (value: unknown, path: string): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fail("expected_finite_nonnegative", path);

const nullableFinite = (value: unknown, path: string): number | null =>
  value === null ? null : finiteNonNegative(value, path);

// Discrete integer contract: GI, positions and source-row indices must
// round-trip exactly, so a value past the exact-integer range is a
// protocol/input error rather than something silently rounded (C2).
const safeInt = (value: unknown, path: string, minimum: number): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
    ? value
    : fail("expected_safe_integer", path);

const nullableSafeInt = (value: unknown, path: string, minimum: number): number | null =>
  value === null ? null : safeInt(value, path, minimum);

const literal = <T extends string>(value: unknown, allowed: readonly T[], path: string): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? value as T
    : fail("unsupported_literal", path);

const unit = (value: unknown, path: string): ReferenceUnit => literal(value, REFERENCE_UNITS, path);

const nullableUnit = (value: unknown, path: string): ReferenceUnit | null =>
  value === null ? null : unit(value, path);

const pattern = (value: unknown, expression: RegExp, code: string, path: string): string => {
  const text = str(value, path);
  return expression.test(text) ? text : fail(code, path);
};

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_PATTERN.test(value);
export const isCatalogId = (value: unknown): value is string => typeof value === "string" && CATALOG_ID_PATTERN.test(value);
export const isSourceId = (value: unknown): value is string => typeof value === "string" && SOURCE_ID_PATTERN.test(value);

// A saved timestamp must carry an explicit UTC offset; a naive string would be
// parsed as local time and silently move the meal.
const TZ_QUALIFIED = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const savedTimestamp = (value: unknown, path: string): string => {
  const text = pattern(value, TZ_QUALIFIED, "expected_timezone_qualified_timestamp", path);
  return Number.isFinite(Date.parse(text)) ? text : fail("unparseable_timestamp", path);
};

const decodeReason = (value: unknown, path: string): Reason => {
  const source = obj(value, path);
  return {
    code: nonEmptyStr(field(source, "code", path), `${path}.code`),
    detail: str(field(source, "detail", path), `${path}.detail`),
  };
};

const decodeReasons = (value: unknown, path: string): Reason[] =>
  arr(value, path).map((entry, index) => decodeReason(entry, `${path}[${index}]`));

const decodeEligibility = (value: unknown, path: string): Eligibility => {
  const source = obj(value, path);
  return {
    use: literal(field(source, "use", path), ELIGIBILITY_USES, `${path}.use`),
    status: literal(field(source, "status", path), ELIGIBILITY_STATUSES, `${path}.status`),
    reasons: arr(field(source, "reasons", path), `${path}.reasons`).map((entry, index) => str(entry, `${path}.reasons[${index}]`)),
  };
};

// ---------------- Catalog ----------------

export const decodeCatalog = (value: unknown): CatalogBrowse => {
  const source = obj(value, "catalog");
  const catalogVersion = pattern(field(source, "catalog_version", "catalog"), CATALOG_ID_PATTERN, "invalid_catalog_id", "catalog.catalog_version");
  const rawRecords = arr(field(source, "records", "catalog"), "catalog.records");
  const seen = new Set<string>();
  const records: CatalogBrowseRecord[] = rawRecords.map((entry, index) => {
    const path = `catalog.records[${index}]`;
    const record = obj(entry, path);
    const sourceRecordId = pattern(field(record, "source_record_id", path), SOURCE_ID_PATTERN, "invalid_source_id", `${path}.source_record_id`);
    if (seen.has(sourceRecordId)) fail("duplicate_source_id", `${path}.source_record_id`);
    seen.add(sourceRecordId);
    const eligibility = decodeEligibility(field(record, "eligibility", path), `${path}.eligibility`);
    if (eligibility.use !== "experimental_fii_input") fail("unexpected_eligibility_use", `${path}.eligibility.use`);
    const referenceScale = field(record, "reference_scale", path);
    return {
      source_record_id: sourceRecordId,
      source_food_wording: nonEmptyStr(field(record, "source_food_wording", path), `${path}.source_food_wording`),
      food_category: str(field(record, "food_category", path), `${path}.food_category`),
      fii_mean: nullableFinite(field(record, "fii_mean", path), `${path}.fii_mean`),
      fii_sem: nullableFinite(field(record, "fii_sem", path), `${path}.fii_sem`),
      source_study: str(field(record, "source_study", path), `${path}.source_study`),
      source_doi: str(field(record, "source_doi", path), `${path}.source_doi`),
      reference_scale: referenceScale === null ? null : str(referenceScale, `${path}.reference_scale`),
      actual_test_energy_kJ: finiteNonNegative(field(record, "actual_test_energy_kJ", path), `${path}.actual_test_energy_kJ`),
      // Ineligible records stay inspectable; only the Select action is withheld.
      eligibility: eligibility as Eligibility & { use: "experimental_fii_input" },
    };
  });
  return { catalog_version: catalogVersion, records };
};

/** New evaluations and selections require the reviewed pin (C1). */
export const isReviewedCatalogPin = (catalogVersion: string): boolean => catalogVersion === REFERENCE_CATALOG_PIN;

// ---------------- Assessment ----------------

const decodeItemInput = (value: unknown, path: string): ReferenceItemInput => {
  const source = obj(value, path);
  const itemUnit = unit(field(source, "unit", path), `${path}.unit`);
  const kcalPerUnit = nullableFinite(field(source, "kcal_per_unit", path), `${path}.kcal_per_unit`);
  const kcalUnit = nullableUnit(field(source, "kcal_per_unit_unit", path), `${path}.kcal_per_unit_unit`);
  if (kcalPerUnit !== null && kcalUnit !== itemUnit) fail("energy_unit_mismatch", `${path}.kcal_per_unit_unit`);
  if (kcalUnit !== null && kcalUnit !== itemUnit) fail("energy_unit_mismatch", `${path}.kcal_per_unit_unit`);
  const sourceRecordId = field(source, "source_record_id", path);
  return {
    name: nonEmptyStr(field(source, "name", path), `${path}.name`),
    quantity: finiteNonNegative(field(source, "quantity", path), `${path}.quantity`),
    unit: itemUnit,
    kcal_per_unit: kcalPerUnit,
    kcal_per_unit_unit: kcalUnit,
    nutrition_origin: literal(field(source, "nutrition_origin", path), NUTRITION_ORIGINS, `${path}.nutrition_origin`),
    carb_g: nullableFinite(field(source, "carb_g", path), `${path}.carb_g`),
    protein_g: nullableFinite(field(source, "protein_g", path), `${path}.protein_g`),
    fat_g: nullableFinite(field(source, "fat_g", path), `${path}.fat_g`),
    sat_fat_g: nullableFinite(field(source, "sat_fat_g", path), `${path}.sat_fat_g`),
    gi: nullableSafeInt(field(source, "gi", path), `${path}.gi`, 0),
    source_record_id: sourceRecordId === null ? null : pattern(sourceRecordId, SOURCE_ID_PATTERN, "invalid_source_id", `${path}.source_record_id`),
  };
};

const decodeSourceEvidence = (value: unknown, path: string): SourceEvidence => {
  const source = obj(value, path);
  const printedPage = field(source, "source_printed_page", path);
  const testYear = field(source, "test_year", path);
  if (field(source, "record_sample_size", path) !== null) fail("expected_null_record_sample_size", `${path}.record_sample_size`);
  return {
    source_record_id: pattern(field(source, "source_record_id", path), SOURCE_ID_PATTERN, "invalid_source_id", `${path}.source_record_id`),
    source_food_wording: nonEmptyStr(field(source, "source_food_wording", path), `${path}.source_food_wording`),
    fii_mean: nullableFinite(field(source, "fii_mean", path), `${path}.fii_mean`),
    uncertainty_type: literal(field(source, "uncertainty_type", path), ["SEM"] as const, `${path}.uncertainty_type`),
    uncertainty_value: nullableFinite(field(source, "uncertainty_value", path), `${path}.uncertainty_value`),
    uncertainty_meaning: literal(field(source, "uncertainty_meaning", path), ["published_food_mean_not_personal_interval"] as const, `${path}.uncertainty_meaning`),
    reference_scale: literal(field(source, "reference_scale", path), ["glucose=100"] as const, `${path}.reference_scale`),
    actual_test_energy_kJ: finiteNonNegative(field(source, "actual_test_energy_kJ", path), `${path}.actual_test_energy_kJ`),
    composition_basis_kJ: finiteNonNegative(field(source, "composition_basis_kJ", path), `${path}.composition_basis_kJ`),
    source_study: str(field(source, "source_study", path), `${path}.source_study`),
    source_doi: str(field(source, "source_doi", path), `${path}.source_doi`),
    source_table: str(field(source, "source_table", path), `${path}.source_table`),
    source_printed_page: typeof printedPage === "number"
      ? safeInt(printedPage, `${path}.source_printed_page`, 0)
      : str(printedPage, `${path}.source_printed_page`),
    source_row: safeInt(field(source, "source_row", path), `${path}.source_row`, 1),
    source_footnote: str(field(source, "source_footnote", path), `${path}.source_footnote`),
    test_year: testYear === null ? null : finiteNonNegative(testYear, `${path}.test_year`),
    population: str(field(source, "population", path), `${path}.population`),
    record_sample_size: null,
    record_sample_size_status: str(field(source, "record_sample_size_status", path), `${path}.record_sample_size_status`),
    issue_ids: arr(field(source, "issue_ids", path), `${path}.issue_ids`).map((entry, index) => str(entry, `${path}.issue_ids[${index}]`)),
    eligibility: arr(field(source, "eligibility", path), `${path}.eligibility`).map((entry, index) => decodeEligibility(entry, `${path}.eligibility[${index}]`)),
  };
};

const decodeItemResult = (value: unknown, path: string, expectedPosition: number): ItemResult => {
  const source = obj(value, path);
  const position = safeInt(field(source, "position", path), `${path}.position`, 0);
  if (position !== expectedPosition) fail("invalid_item_ordering", `${path}.position`);
  const inputs = decodeItemInput(field(source, "inputs", path), `${path}.inputs`);
  const status = literal(field(source, "status", path), ["calculated", "unavailable", "not_consumed"] as const, `${path}.status`);
  const eatenKcal = nullableFinite(field(source, "eaten_kcal", path), `${path}.eaten_kcal`);
  const referenceLoad = nullableFinite(field(source, "reference_load", path), `${path}.reference_load`);
  const rawSource = field(source, "source", path);
  const evidence = rawSource === null ? null : decodeSourceEvidence(rawSource, `${path}.source`);
  const reasons = decodeReasons(field(source, "reasons", path), `${path}.reasons`);

  if (evidence !== null && evidence.source_record_id !== inputs.source_record_id) {
    fail("source_identity_mismatch", `${path}.source.source_record_id`);
  }
  // Presence relationship only; the energy product itself is server arithmetic.
  if ((inputs.kcal_per_unit === null) !== (eatenKcal === null)) fail("energy_presence_mismatch", `${path}.eaten_kcal`);

  if (inputs.quantity === 0) {
    if (status !== "not_consumed" || referenceLoad !== 0) fail("invalid_nonconsumption_result", path);
  } else if (status === "calculated") {
    if (evidence === null || evidence.fii_mean === null) fail("calculated_without_source", path);
    if (eatenKcal === null || eatenKcal <= 0) fail("calculated_without_energy", path);
    if (referenceLoad === null) fail("calculated_without_load", path);
    if (reasons.length > 0) fail("calculated_with_blocking_reasons", path);
    // R05: the server only calculates from a source that is an eligible
    // experimental input at the attributed 1000 kJ protocol. Checking that
    // documented relationship is protocol validation, not recomputing the
    // formula: a "calculated" row citing a reference-only or off-protocol
    // record contradicts the contract that produced it.
    if (evidence !== null && evidence.actual_test_energy_kJ !== 1000) {
      fail("calculated_from_off_protocol_source", `${path}.source.actual_test_energy_kJ`);
    }
    if (evidence !== null && !evidence.eligibility.some((entry) => entry.use === "experimental_fii_input" && entry.status === "candidate")) {
      fail("calculated_from_ineligible_source", `${path}.source.eligibility`);
    }
  } else if (status !== "unavailable" || referenceLoad !== null || reasons.length === 0) {
    fail("invalid_unavailable_contribution", path);
  }

  return {
    position,
    inputs,
    selection_label: literal(field(source, "selection_label", path), ["explicit_source_reference_not_verified_food_equivalence"] as const, `${path}.selection_label`),
    status,
    eaten_kcal: eatenKcal,
    reference_load: referenceLoad,
    source: evidence,
    reasons,
  };
};

export const decodeReferenceResult = (value: unknown, path = "assessment"): ReferenceResult => {
  const source = obj(value, path);
  const items = arr(field(source, "items", path), `${path}.items`)
    .map((entry, index) => decodeItemResult(entry, `${path}.items[${index}]`, index));
  const status = literal(field(source, "status", path), ["experimental", "unavailable"] as const, `${path}.status`);
  const total = nullableFinite(field(source, "reference_load_total", path), `${path}.reference_load_total`);
  const reasons = decodeReasons(field(source, "reasons", path), `${path}.reasons`);

  const consumed = items.filter((item) => item.status !== "not_consumed");
  const complete = consumed.length > 0 && consumed.every((item) => item.status === "calculated");
  if (complete) {
    // Relationship check only — the total is never recomputed here.
    if (status !== "experimental" || total === null || reasons.length > 0) fail("invalid_complete_meal_total", path);
  } else if (status !== "unavailable" || total !== null || reasons.length === 0) {
    fail("invalid_unavailable_meal_total", path);
  }

  return {
    result_schema_version: literal(field(source, "result_schema_version", path), [RESULT_SCHEMA_VERSION] as const, `${path}.result_schema_version`),
    formula_version: literal(field(source, "formula_version", path), [FORMULA_VERSION] as const, `${path}.formula_version`),
    // Historical supported results may carry a different well-formed catalog
    // hash. Only a new evaluation is pinned (C1).
    catalog_version: pattern(field(source, "catalog_version", path), CATALOG_ID_PATTERN, "invalid_catalog_id", `${path}.catalog_version`),
    catalog_schema_version: literal(field(source, "catalog_schema_version", path), [CATALOG_SCHEMA_VERSION] as const, `${path}.catalog_schema_version`),
    eligibility_policy_version: literal(field(source, "eligibility_policy_version", path), [ELIGIBILITY_POLICY_VERSION] as const, `${path}.eligibility_policy_version`),
    selection_policy_version: literal(field(source, "selection_policy_version", path), [SELECTION_POLICY_VERSION] as const, `${path}.selection_policy_version`),
    status,
    reference_load_total: total,
    items,
    reasons,
  };
};

// ---------------- Request/result correspondence (C2) ----------------

// The backend materializes these optional defaults in the returned inputs.
// A sparse supported request is compared under exactly these defaults; the
// request is never rewritten and no missing required field is defaulted.
export const REQUEST_OPTIONAL_DEFAULTS = {
  kcal_per_unit: null,
  kcal_per_unit_unit: null,
  nutrition_origin: "manual",
  carb_g: null,
  protein_g: null,
  fat_g: null,
  sat_fat_g: null,
  gi: null,
  source_record_id: null,
} as const;

const OPTIONAL_KEYS = Object.keys(REQUEST_OPTIONAL_DEFAULTS) as (keyof typeof REQUEST_OPTIONAL_DEFAULTS)[];
const REQUIRED_ITEM_KEYS = ["name", "quantity", "unit"] as const;

/** Exactly the item fields the server contract defines. Nothing else replays. */
const SUPPORTED_WIRE_ITEM_KEYS = new Set<string>([...REQUIRED_ITEM_KEYS, ...OPTIONAL_KEYS]);

/** Exactly the request root fields the server contract defines. Nothing else replays. */
const SUPPORTED_WIRE_ROOT_KEYS = new Set<string>([
	"meal_name",
	"expected_catalog_version",
	"client_request_id",
	"created_at",
	"items",
]);

/**
 * True when every item of `requestItems` corresponds to the server-expanded
 * `inputs`, reading omitted optional fields as their documented defaults.
 * Byte equality is deliberately not required, and retry bytes are never
 * rewritten to satisfy it.
 */
export const inputsCorrespondToRequest = (
  requestItems: readonly Record<string, unknown>[],
  resultInputs: readonly ReferenceItemInput[],
): boolean => {
  if (requestItems.length !== resultInputs.length) return false;
  return requestItems.every((requested, index) => {
    const actual = resultInputs[index] as unknown as Record<string, unknown>;
    for (const key of REQUIRED_ITEM_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(requested, key)) return false;
      if (!Object.is(requested[key], actual[key])) return false;
    }
    return OPTIONAL_KEYS.every((key) => {
      const expected = Object.prototype.hasOwnProperty.call(requested, key)
        ? requested[key]
        : REQUEST_OPTIONAL_DEFAULTS[key];
      return Object.is(expected, actual[key]);
    });
  });
};

export const resultMatchesRequest = (request: ReferencePreviewRequest, result: ReferenceResult): boolean =>
  result.catalog_version === request.expected_catalog_version
  && inputsCorrespondToRequest(
    request.items as unknown as Record<string, unknown>[],
    result.items.map((item) => item.inputs),
  );

// ---------------- Journal wire requests ----------------

export type ParsedWireSaveRequest = {
  meal_name: string;
  expected_catalog_version: string;
  client_request_id: string;
  created_at: string | null;
  items: Record<string, unknown>[];
};

/**
 * Validates a restored retry request strictly, WITHOUT reserializing it. The
 * stored bytes are what gets replayed, so this only reads and checks them; it
 * never rewrites `wireJson`, synthesizes a missing identity, or recomputes a
 * scientific value.
 *
 * A sparse request written by an older build stays supported: optional fields
 * may be absent and are read under their documented defaults later (C2).
 */
const wireName = (value: unknown, path: string): string => {
  const name = nonEmptyStr(value, path);
  // Python's contract counts Unicode code points, not UTF-16 code units.
  return Array.from(name).length <= 255 ? name : fail("name_too_long", path);
};

export const parseWireSaveRequest = (wireJson: string): ParsedWireSaveRequest | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(wireJson);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  try {
    // N4: like items, the request root replays verbatim, so an unknown
    // top-level field quarantines the whole entry. Sparse historical bodies
    // stay supported — absent optional keys are read under their documented
    // defaults — but an unknown key is not an absent key. Nothing is dropped
    // or reserialized into apparent validity.
    for (const key of Object.keys(parsed)) {
      if (!SUPPORTED_WIRE_ROOT_KEYS.has(key)) fail("unsupported_wire_field", `wire.${key}`);
    }
    const items = arr(field(parsed, "items", "wire"), "wire.items").map((entry, index) => {
      const path = `wire.items[${index}]`;
      const item = obj(entry, path);
      // R05: a restored request is replayed verbatim, so anything the server
      // contract does not define must be quarantined rather than dispatched as
      // a supposedly validated journal request. Sparse requests stay supported
      // — absent optional keys are read under their documented defaults — but
      // an unknown key is not an absent key.
      for (const key of Object.keys(item)) {
        if (!SUPPORTED_WIRE_ITEM_KEYS.has(key)) fail("unsupported_wire_field", `${path}.${key}`);
      }
      wireName(field(item, "name", path), `${path}.name`);
      const quantity = finiteNonNegative(field(item, "quantity", path), `${path}.quantity`);
      const itemUnit = unit(field(item, "unit", path), `${path}.unit`);
      for (const key of ["carb_g", "protein_g", "fat_g", "sat_fat_g"]) {
        if (Object.prototype.hasOwnProperty.call(item, key)) nullableFinite(item[key], `${path}.${key}`);
      }
      // The energy unit must agree with the quantity unit, exactly as the
      // server contract requires; a mismatched pair is not replayable.
      const kcalUnit = Object.prototype.hasOwnProperty.call(item, "kcal_per_unit_unit")
        ? nullableUnit(item.kcal_per_unit_unit, `${path}.kcal_per_unit_unit`)
        : null;
      const kcalPerUnit = Object.prototype.hasOwnProperty.call(item, "kcal_per_unit")
        ? nullableFinite(item.kcal_per_unit, `${path}.kcal_per_unit`)
        : null;
      if (kcalPerUnit !== null && kcalUnit !== itemUnit) fail("energy_unit_mismatch", `${path}.kcal_per_unit_unit`);
      if (kcalUnit !== null && kcalUnit !== itemUnit) fail("energy_unit_mismatch", `${path}.kcal_per_unit_unit`);
      if (Object.prototype.hasOwnProperty.call(item, "nutrition_origin")) literal(item.nutrition_origin, NUTRITION_ORIGINS, `${path}.nutrition_origin`);
      if (Object.prototype.hasOwnProperty.call(item, "gi")) nullableSafeInt(item.gi, `${path}.gi`, 0);
      if (Object.prototype.hasOwnProperty.call(item, "source_record_id") && item.source_record_id !== null) {
        pattern(item.source_record_id, SOURCE_ID_PATTERN, "invalid_source_id", `${path}.source_record_id`);
      }
      for (const key of ["kcal_per_unit", "carb_g", "protein_g", "fat_g", "sat_fat_g", "gi"]) {
        if (item[key] !== undefined && item[key] !== null) finiteNonNegative((item[key] as number) * quantity, `${path}.${key}`);
      }
      return item;
    });
    const createdAt = Object.prototype.hasOwnProperty.call(parsed, "created_at") ? parsed.created_at : null;
    return {
      meal_name: wireName(field(parsed, "meal_name", "wire"), "wire.meal_name"),
      // A restored historical request keeps its own well-formed catalog
      // identity; today's pin is not a replay requirement (C1).
      expected_catalog_version: pattern(field(parsed, "expected_catalog_version", "wire"), CATALOG_ID_PATTERN, "invalid_catalog_id", "wire.expected_catalog_version"),
      client_request_id: pattern(field(parsed, "client_request_id", "wire"), UUID_PATTERN, "invalid_request_id", "wire.client_request_id"),
      created_at: createdAt === null || createdAt === undefined ? null : savedTimestamp(createdAt, "wire.created_at"),
      items,
    };
  } catch {
    return null;
  }
};

// ---------------- Responses ----------------

export const decodePreviewResponse = (value: unknown, request: ReferencePreviewRequest): ReferencePreviewResponse => {
  const source = obj(value, "preview");
  if (bool(field(source, "persisted", "preview"), "preview.persisted") !== false) fail("preview_claimed_persisted", "preview.persisted");
  const assessment = decodeReferenceResult(field(source, "assessment", "preview"), "preview.assessment");
  if (!resultMatchesRequest(request, assessment)) fail("preview_request_mismatch", "preview.assessment");
  return { persisted: false, assessment };
};

const decodeLegacyCompatibility = (value: unknown, path: string): LegacyCompatibilityEnvelope => {
  const source = obj(value, path);
  return {
    id: pattern(field(source, "id", path), UUID_PATTERN, "invalid_saved_id", `${path}.id`),
    meal_name: nonEmptyStr(field(source, "meal_name", path), `${path}.meal_name`),
    created_at: savedTimestamp(field(source, "created_at", path), `${path}.created_at`),
  };
};

export const decodeMealResponse = (value: unknown, path = "meal"): ReferenceMealResponse => {
  const source = obj(value, path);
  const state = literal(field(source, "assessment_state", path), ["evaluated", "not_evaluated", "evidence_error"] as const, `${path}.assessment_state`);
  const rawAssessment = field(source, "assessment", path);
  const reasons = decodeReasons(field(source, "reasons", path), `${path}.reasons`);
  const legacy = decodeLegacyCompatibility(field(source, "legacy_compatibility", path), `${path}.legacy_compatibility`);

  if (state === "evaluated") {
    if (rawAssessment === null) fail("evaluated_without_assessment", `${path}.assessment`);
  } else {
    if (rawAssessment !== null) fail("unevaluated_with_assessment", `${path}.assessment`);
    // An explicit stored-evidence failure must carry its reason.
    if (state === "evidence_error" && reasons.length === 0) fail("evidence_error_without_reason", `${path}.reasons`);
  }

  return {
    assessment_state: state,
    assessment: state === "evaluated" ? decodeReferenceResult(rawAssessment, `${path}.assessment`) : null,
    reasons,
    legacy_compatibility: legacy,
  };
};

export type ReferenceListDecode = {
  entries: ReferenceMealResponse[];
  /** Malformed neighbours are reported, never merged and never read as deletion. */
  failures: { index: number; code: string }[];
};

export const decodeMealList = (value: unknown): ReferenceListDecode => {
  const rows = arr(value, "list");
  const entries: ReferenceMealResponse[] = [];
  const failures: { index: number; code: string }[] = [];
  rows.forEach((row, index) => {
    try {
      entries.push(decodeMealResponse(row, `list[${index}]`));
    } catch (error) {
      failures.push({ index, code: error instanceof ReferenceDecodeError ? error.code : "list_entry_decode_failed" });
    }
  });
  return { entries, failures };
};

/**
 * A saved response confirms the request it replays when its assessment
 * corresponds to the frozen request. An explicit `evidence_error` still
 * confirms persistence; it never authorizes recomputation.
 */
export const savedResponseConfirmsRequest = (request: ReferencePreviewRequest, response: ReferenceMealResponse): boolean => {
  if (response.assessment_state === "evaluated") {
    return response.assessment !== null && resultMatchesRequest(request, response.assessment);
  }
  // R05: context matters. `not_evaluated` is a legitimate HISTORICAL read — an
  // older meal simply has no reference evidence — but it is NOT confirmation
  // that THIS reference save produced a result. Treating it as confirmation
  // would drop the durable retry record on an outcome we cannot explain, so it
  // stays ambiguous. An explicit `evidence_error` still confirms persistence.
  return response.assessment_state === "evidence_error";
};

/**
 * The same confirmation from a restored retry request, compared under the
 * documented optional-request defaults so a sparse stored body is supported
 * without ever rewriting its bytes (C2).
 */
export const savedResponseConfirmsWireRequest = (wire: ParsedWireSaveRequest, response: ReferenceMealResponse): boolean => {
  if (response.assessment_state !== "evaluated") {
    // R05: as above — only an explicit stored-evidence failure confirms that
    // this save persisted. `not_evaluated` leaves the attempt ambiguous.
    return response.assessment_state === "evidence_error";
  }
  const assessment = response.assessment;
  if (assessment === null) return false;
  return assessment.catalog_version === wire.expected_catalog_version
    && inputsCorrespondToRequest(wire.items, assessment.items.map((item) => item.inputs));
};
