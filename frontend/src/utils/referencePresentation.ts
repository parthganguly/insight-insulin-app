import type { ItemResult, Reason, ReferenceResult } from "../types/experimentalReference";

// Display-only presentation for the reference private preview (freeze D1).
// Formatting is a typography convention. It never changes a payload, a stored
// value, or the source FII/SEM, and it never implies scientific precision.

const EXPONENTIAL_THRESHOLD = 1_000_000;

/**
 * Exact zero renders `0`; a positive value below 0.1 renders `<0.1`; anything
 * else renders at most one decimal with no trailing `.0`. At or above
 * 1,000,000 the value switches to one-decimal exponential notation with a
 * bare mantissa (`1e+6`). Null, non-finite and negative inputs render nothing.
 *
 * No step multiplies by ten, so a large finite load cannot overflow here.
 */
export const formatReferenceNumber = (value: number | null | undefined): string | null => {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
	if (value === 0) return "0";
	if (value < 0.1) return "<0.1";
	if (value >= EXPONENTIAL_THRESHOLD) return value.toExponential(1).replace(/\.0(?=e)/, "");
	return value.toFixed(1).replace(/\.0$/, "");
};

/** Spoken equivalent of exactly what `formatReferenceNumber` displays. */
export const speakReferenceNumber = (value: number | null | undefined): string | null => {
	const displayed = formatReferenceNumber(value);
	if (displayed === null) return null;
	if (displayed === "<0.1") return "less than 0.1";
	const exponential = /^(-?[\d.]+)e\+?(-?\d+)$/.exec(displayed);
	if (!exponential) return displayed;
	return `${exponential[1]} times ten to the power of ${exponential[2]}`;
};

export const REFERENCE_UNAVAILABLE_TEXT = "Not available";

export const reasonCopy: Record<string, string> = {
	no_reference_selected: "No published reference was selected.",
	unknown_id: "The selected reference is unavailable.",
	version_mismatch: "The selected reference belongs to a different catalog version.",
	reference_only: "This reference is for context only.",
	requires_review: "This reference needs further review.",
	missing_energy: "Reviewed energy is missing.",
	zero_energy: "A consumed item needs positive energy.",
	zero_quantity: "Explicitly not consumed.",
	no_consumed_items: "No positive-quantity items were entered.",
	incomplete_consumed_items: "Some consumed items cannot be assessed.",
	invalid_stored_assessment: "The saved evidence could not be read.",
};

export const describeReason = (reason: Reason): string =>
	reasonCopy[reason.code] ?? "This item cannot be assessed with the selected evidence.";

// ---------------- Reviewed nutrition read-back ----------------

export type ReferenceNutrientTotal = {
	/** Sum over consumed rows that declare the nutrient, or null when none do. */
	known: number | null;
	/** False when at least one consumed row is missing this nutrient. */
	complete: boolean;
	missingItemNames: string[];
};

const NUTRIENT_KEYS = ["kcal", "carb_g", "protein_g", "fat_g", "sat_fat_g"] as const;
export type ReferenceNutrientKey = (typeof NUTRIENT_KEYS)[number];

const consumedRows = (result: ReferenceResult): ItemResult[] =>
	result.items.filter((item) => item.status !== "not_consumed");

// Display arithmetic over reviewed inputs only — the same multiplication the
// legacy item rows already perform. It is never a scientific load, a total
// insulin figure, or a substitute for server-owned evidence.
const perRowValue = (item: ItemResult, key: ReferenceNutrientKey): number | null => {
	if (key === "kcal") return item.eaten_kcal;
	const perUnit = item.inputs[key];
	if (perUnit === null) return null;
	const total = item.inputs.quantity * perUnit;
	return Number.isFinite(total) ? total : null;
};

export const summariseReferenceNutrient = (result: ReferenceResult, key: ReferenceNutrientKey): ReferenceNutrientTotal => {
	const rows = consumedRows(result);
	const missingItemNames: string[] = [];
	let known: number | null = null;
	for (const row of rows) {
		const value = perRowValue(row, key);
		if (value === null) {
			missingItemNames.push(row.inputs.name);
			continue;
		}
		known = (known ?? 0) + value;
	}
	if (known !== null && !Number.isFinite(known)) known = null;
	return { known, complete: rows.length > 0 && missingItemNames.length === 0, missingItemNames };
};

/**
 * Reference-domain nutrition for a saved or previewed meal. A meal with no
 * validated reference evidence has unknown nutrition in this domain; legacy
 * compatibility totals are never substituted (freeze §C, cache rules).
 */
export const summariseReferenceNutrition = (result: ReferenceResult | null): Record<ReferenceNutrientKey, ReferenceNutrientTotal> | null => {
	if (!result) return null;
	return Object.fromEntries(
		NUTRIENT_KEYS.map((key) => [key, summariseReferenceNutrient(result, key)]),
	) as Record<ReferenceNutrientKey, ReferenceNutrientTotal>;
};

export const NUTRIENT_LABELS: Record<ReferenceNutrientKey, string> = {
	kcal: "Reviewed energy",
	carb_g: "Carbohydrate",
	protein_g: "Protein",
	fat_g: "Fat",
	sat_fat_g: "Saturated fat",
};

export const NUTRIENT_SUFFIX: Record<ReferenceNutrientKey, string> = {
	kcal: " kcal",
	carb_g: " g",
	protein_g: " g",
	fat_g: " g",
	sat_fat_g: " g",
};

/** `null` when the total is unknown; partial values stay explicitly labelled. */
export const formatNutrientTotal = (total: ReferenceNutrientTotal, key: ReferenceNutrientKey): { text: string; partial: boolean } | null => {
	const displayed = formatReferenceNumber(total.known);
	if (displayed === null) return null;
	return { text: `${displayed}${NUTRIENT_SUFFIX[key]}`, partial: !total.complete };
};

// ---------------- Eligibility and uncertainty wording (M02) ----------------
//
// Display labels only. The raw policy enum, the selection logic and every
// published number are unchanged. "candidate" means eligible under the source
// policy — NOT that a search matched the user's food — so match/recommendation
// language is deliberately absent.

export const ELIGIBILITY_DISPLAY: Record<string, string> = {
	candidate: "Eligible for experimental selection",
	reference_only: "Reference only — not selectable",
	requires_review: "Requires source review — not selectable",
};

export const describeEligibility = (status: string): string =>
	ELIGIBILITY_DISPLAY[status] ?? "Not selectable";

/** Stated once where SEM is first shown; the source-details meaning is unchanged. */
export const SEM_GLOSS = "SEM (standard error of the published mean) describes uncertainty in that study mean, not your personal prediction uncertainty.";

/** Selection is explicit and is never evidence that this food was measured. */
export const SELECTION_BOUNDARY = "Selecting a published reference does not verify that your food was the one measured.";
