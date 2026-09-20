import { isReviewedCatalogPin } from "../api/referenceDecode";
import type { Meal } from "../types/Meal";
import { Unit } from "../types/MealItem";
import {
	REFERENCE_UNITS,
	type NutritionOrigin,
	type ReferenceDraft,
	type ReferenceDraftItem,
	type ReferenceItemInput,
	type ReferenceMealResponse,
	type ReferencePreviewRequest,
	type ReferenceSaveRequest,
	type ReferenceSelection,
	type ReferenceUnit,
} from "../types/experimentalReference";

// Reference draft ownership (freeze §C). This module owns ONLY draft
// validation, reviewed-basis nutrition normalization, material snapshots and
// the reuse/import adapters. The server owns all assessment arithmetic. It
// never calls buildCreateMealPayload or normalizeAiExtractedItem, and it never
// zero-fills a missing value.

export const REFERENCE_NUTRITION_FIELDS = [
	"kcalPerServing",
	"carbPerServing_g",
	"proteinPerServing_g",
	"fatPerServing_g",
	"satFatPerServing_g",
	"gi",
] as const;

export type ReferenceNutritionField = (typeof REFERENCE_NUTRITION_FIELDS)[number];

/** Fields whose change requires renewed basis review before nutrition can be used. */
export const BASIS_FIELDS = ["servingSize", "servingUnit"] as const;

export const isReferenceDraft = (meal: { contract?: string }): meal is ReferenceDraft => meal.contract === "reference";

export const createEmptyReferenceItem = (): ReferenceDraftItem => ({
	id: crypto.randomUUID(),
	name: "",
	// Missing is null, never zero. A blank unit would be a hidden claim, so the
	// unit visibly starts at grams; no energy is inferred from that choice.
	amount: null,
	servingUnit: Unit.Grams,
	servingSize: null,
	kcalPerServing: null,
	carbPerServing_g: null,
	proteinPerServing_g: null,
	fatPerServing_g: null,
	satFatPerServing_g: null,
	gi: null,
	nutritionOrigin: "manual",
	basisReviewed: false,
	invalidFields: [],
	selection: { state: "none" },
	draftProvenance: "user_entered",
});

export const createReferenceDraft = (): ReferenceDraft => ({
	contract: "reference",
	id: crypto.randomUUID(),
	image: null,
	name: "New Meal",
	timestamp: Date.now(),
	items: [],
	reviewedCatalogVersion: null,
	isAiDraft: false,
});

// ---------------- Numeric input ----------------

export type ParsedNumericInput =
	| { kind: "blank" }
	| { kind: "value"; value: number }
	| { kind: "invalid" };

/**
 * Blank becomes unknown. Invalid, negative, infinite or unparseable entries
 * stay input errors rather than silently becoming missing or zero. Explicit
 * zero is a real, allowed value.
 */
export const parseReferenceNumericInput = (raw: unknown): ParsedNumericInput => {
	if (raw === null || raw === undefined) return { kind: "blank" };
	if (typeof raw === "string") {
		if (raw.trim() === "") return { kind: "blank" };
		const parsed = Number(raw);
		if (!Number.isFinite(parsed) || parsed < 0) return { kind: "invalid" };
		return { kind: "value", value: parsed };
	}
	if (typeof raw === "number") {
		if (!Number.isFinite(raw) || raw < 0) return { kind: "invalid" };
		return { kind: "value", value: raw };
	}
	return { kind: "invalid" };
};

const withInvalidField = (item: ReferenceDraftItem, field: string, invalid: boolean): string[] => {
	const others = item.invalidFields.filter((entry) => entry !== field);
	return invalid ? [...others, field] : others;
};

const isBasisField = (field: string): boolean => (BASIS_FIELDS as readonly string[]).includes(field);
const isNutritionField = (field: string): boolean => (REFERENCE_NUTRITION_FIELDS as readonly string[]).includes(field);

/**
 * One shared mutation path for the reference branch of the editor, quick
 * portion control, AI import, reuse and restored drafts. Selection authority
 * and basis review follow the frozen transition table.
 */
export const updateReferenceDraftItem = (item: ReferenceDraftItem, field: string, rawValue: unknown): ReferenceDraftItem => {
	if (field === "name") {
		const name = String(rawValue ?? "");
		if (name === item.name) return item;
		// A food-identity change clears source approval and leaves carried
		// nutrition needing review. It never re-matches a source implicitly.
		//
		// "needsReview" means specifically: these nutrition values were
		// entered for a different food, confirm they still fit. An item that
		// carries no nutrition has nothing to confirm, so naming a blank new
		// item must not raise a review the user cannot meaningfully answer.
		//
		// The denominator and unit are unchanged by a rename, so the BASIS is
		// still reviewed; what needs confirming is whether the carried values
		// still fit the new food. Renewed basis review belongs to a unit or
		// denominator change, which is a separate transition.
		const carriesNutrition = hasAnyReviewedNutrition(item);
		const renamed: ReferenceDraftItem = {
			...item,
			name,
			selection: { state: "none" },
			draftProvenance: item.draftProvenance === "ai_proposed" ? "user_reviewed" : item.draftProvenance,
		};
		if (carriesNutrition) renamed.needsReview = item.needsReview ?? { previousName: item.name };
		else delete renamed.needsReview;
		return renamed;
	}

	if (field === "servingUnit") {
		const unit = REFERENCE_UNITS.includes(rawValue as ReferenceUnit) ? (rawValue as Unit) : item.servingUnit;
		if (unit === item.servingUnit) return item;
		// Source stays selected; the basis must be confirmed or cleared again.
		return { ...item, servingUnit: unit, basisReviewed: false };
	}

	if (field === "nutritionOrigin") {
		const origin = (["manual", "label", "ai_reviewed", "other"] as const).includes(rawValue as NutritionOrigin)
			? (rawValue as NutritionOrigin)
			: item.nutritionOrigin;
		return origin === item.nutritionOrigin ? item : { ...item, nutritionOrigin: origin };
	}

	if (field === "amount" || isBasisField(field) || isNutritionField(field)) {
		const parsed = parseReferenceNumericInput(rawValue);
		if (parsed.kind === "invalid") {
			return { ...item, invalidFields: withInvalidField(item, field, true) };
		}
		const value = parsed.kind === "blank" ? null : parsed.value;
		// GI is a discrete index, never a divided per-unit rate.
		if (field === "gi" && value !== null && !Number.isSafeInteger(value)) {
			return { ...item, invalidFields: withInvalidField(item, field, true) };
		}
		const current = (item as unknown as Record<string, unknown>)[field];
		if (Object.is(current, value) && !item.invalidFields.includes(field)) return item;

		const next: ReferenceDraftItem = {
			...item,
			[field]: value,
			invalidFields: withInvalidField(item, field, false),
			draftProvenance: item.draftProvenance === "ai_proposed" ? "user_reviewed" : item.draftProvenance,
		} as ReferenceDraftItem;

		// Editing the denominator or unit re-opens basis review.
		if (isBasisField(field)) return { ...next, basisReviewed: false };
		// Editing a nutrition value is the explicit review of THAT value.
		//
		// R06: GI is a discrete published index, not a per-denominator rate.
		// Typing a GI therefore says nothing about whether the energy and
		// macronutrients belong to a changed unit or serving size, so it must
		// not approve the basis on their behalf. Only editing an actual
		// per-denominator value — or confirming the carried values outright —
		// can do that.
		if (isNutritionField(field)) {
			const reviewed = { ...next, basisReviewed: field === "gi" ? item.basisReviewed : true };
			// The carried-value review is likewise resolved by touching a real
			// per-denominator value, not by an index edit.
			if (field !== "gi") delete reviewed.needsReview;
			return reviewed;
		}
		return next;
	}

	return item;
};

/** "These still fit" — confirms carried nutrition and basis only; never a source. */
export const confirmReferenceItemBasis = (item: ReferenceDraftItem): ReferenceDraftItem => {
	const confirmed: ReferenceDraftItem = {
		...item,
		basisReviewed: true,
		draftProvenance: item.draftProvenance === "ai_proposed" ? "user_reviewed" : item.draftProvenance,
	};
	delete confirmed.needsReview;
	return confirmed;
};

/** Explicitly clears carried nutrition to unknown, allowing an unavailable assessment. */
export const clearReferenceItemNutrition = (item: ReferenceDraftItem): ReferenceDraftItem => {
	const cleared: ReferenceDraftItem = {
		...item,
		servingSize: null,
		kcalPerServing: null,
		carbPerServing_g: null,
		proteinPerServing_g: null,
		fatPerServing_g: null,
		satFatPerServing_g: null,
		gi: null,
		basisReviewed: true,
		invalidFields: item.invalidFields.filter((entry) => !isNutritionField(entry) && !isBasisField(entry)),
	};
	delete cleared.needsReview;
	return cleared;
};

export const selectReferenceSource = (item: ReferenceDraftItem, sourceId: string | null, catalogVersion: string): ReferenceDraftItem =>
	sourceId === null
		? { ...item, selection: { state: "none" } }
		: { ...item, selection: { state: "selected", sourceId, catalogVersion } };

/** A detected catalog change marks every previous selection for explicit re-review. */
export const markSelectionsNeedingReview = (draft: ReferenceDraft): ReferenceDraft => ({
	...draft,
	reviewedCatalogVersion: null,
	items: draft.items.map((item) => (item.selection.state === "selected"
		? { ...item, selection: { state: "needs_review", sourceId: item.selection.sourceId, catalogVersion: item.selection.catalogVersion, cause: "catalog_changed" } }
		: item)),
});

export const hasAnyReviewedNutrition = (item: ReferenceDraftItem): boolean =>
	REFERENCE_NUTRITION_FIELDS.some((field) => item[field] !== null);

// ---------------- Validation ----------------

const describeItem = (item: ReferenceDraftItem, index: number): string =>
	item.name.trim() ? `“${item.name.trim()}”` : `Item ${index + 1}`;

/**
 * Reference-branch validation. Quantity may be any finite value >= 0 including
 * an all-zero meal (R2 `no_consumed_items`). A missing source or missing
 * energy is NOT an input error — it produces an unavailable, savable result.
 * The legacy `quantity > 0` rule is untouched on the legacy branch.
 */
export const validateReferenceItem = (item: ReferenceDraftItem, index: number): string | null => {
	if (item.invalidFields.length > 0) {
		return `${describeItem(item, index)} has an entry that isn't a valid number. Clear it or enter a number of 0 or more.`;
	}
	if (!item.name.trim()) return `Item ${index + 1} still needs a name. Tap the item to add one.`;
	if (item.amount === null) {
		return `${describeItem(item, index)} needs an amount eaten. Enter 0 if you did not eat any.`;
	}
	if (hasAnyReviewedNutrition(item)) {
		if (item.servingSize === null || !(item.servingSize > 0)) {
			return `${describeItem(item, index)} needs the serving size its nutrition is measured per — for example 100 for “per 100 g”.`;
		}
		if (!item.basisReviewed) {
			return `Review the nutrition basis for ${describeItem(item, index)} before calculating. Confirm the values, edit one, or clear them to unknown.`;
		}
	}
	if (item.needsReview) {
		return `Review the carried nutrition for ${describeItem(item, index)} before calculating. Edit a nutrition value or choose “These still fit”.`;
	}
	if (item.selection.state === "needs_review") {
		// M03: only claim a catalog change when that is actually the cause.
		const why = item.selection.cause === "catalog_changed"
			? "needs review after a catalog change"
			: item.selection.cause === "reused_suggestion"
				? "is a suggestion copied from the saved meal and needs review"
				: "needs review";
		return `The published reference for ${describeItem(item, index)} ${why}. Select it again or continue without a reference.`;
	}
	return null;
};

export const validateReferenceDraftBeforeSave = (draft: ReferenceDraft): string | null => {
	if (!draft.name.trim()) return "This meal needs a name before you can calculate it.";
	if (draft.items.length === 0) return "This meal is still empty. Tap + to add at least one item, then calculate.";
	for (let index = 0; index < draft.items.length; index += 1) {
		const error = validateReferenceItem(draft.items[index], index);
		if (error) return error;
	}
	return null;
};

// ---------------- Material snapshot ----------------

const materialItem = (item: ReferenceDraftItem) => ({
	name: item.name,
	amount: item.amount,
	servingUnit: item.servingUnit,
	servingSize: item.servingSize,
	kcalPerServing: item.kcalPerServing,
	carbPerServing_g: item.carbPerServing_g,
	proteinPerServing_g: item.proteinPerServing_g,
	fatPerServing_g: item.fatPerServing_g,
	satFatPerServing_g: item.satFatPerServing_g,
	gi: item.gi,
	nutritionOrigin: item.nutritionOrigin,
	basisReviewed: item.basisReviewed,
	invalidFields: [...item.invalidFields].sort(),
	selection: item.selection,
});

/**
 * Ordered material inputs plus catalog identity. Title, time and photo are
 * deliberately absent: they are edits, not scientific material.
 */
export const getReferenceMaterialSnapshot = (draft: ReferenceDraft): string =>
	JSON.stringify({
		reviewedCatalogVersion: draft.reviewedCatalogVersion,
		items: draft.items.map(materialItem),
	});

// ---------------- Wire mapping ----------------

export type ReferenceRequestResult =
	| { ok: true; request: ReferencePreviewRequest }
	| { ok: false; errors: string[] };

const perUnit = (value: number | null, denominator: number, quantity: number): number | null | "invalid" => {
	if (value === null) return null;
	const rate = value / denominator;
	if (!Number.isFinite(rate) || rate < 0) return "invalid";
	if (!Number.isFinite(rate * quantity)) return "invalid";
	return rate;
};

/**
 * Maps a reviewed reference draft to the strict wire request.
 *
 * Amount means consumed units; serving size is the nutrition denominator in
 * the same unit. Every supplied macro gram is divided by that denominator
 * exactly once, and GI — an index, not a rate — is never divided. 150 g eaten
 * at 200 kcal per 100 g therefore yields quantity 150 and kcal/unit 2, which
 * is 300 reviewed kcal, not 30,000.
 *
 * Optional values are written explicitly (including real nulls and the
 * declared nutrition origin) so correspondence checks are deterministic (C2).
 */
export const buildReferencePreviewRequest = (draft: ReferenceDraft): ReferenceRequestResult => {
	const errors: string[] = [];
	const catalogVersion = draft.reviewedCatalogVersion;
	if (catalogVersion === null) {
		errors.push("Browse and review the published reference catalog before calculating.");
	} else if (!isReviewedCatalogPin(catalogVersion)) {
		// A new evaluation always requires the reviewed pin. The client never
		// approves a new pin just because a server named one (C1).
		errors.push("This catalog version has not been reviewed for use, so no new estimate can be calculated.");
	}

	const items: ReferenceItemInput[] = [];
	draft.items.forEach((item, index) => {
		const itemError = validateReferenceItem(item, index);
		if (itemError) {
			errors.push(itemError);
			return;
		}
		const quantity = item.amount as number;
		const denominator = hasAnyReviewedNutrition(item) ? (item.servingSize as number) : 1;

		const kcal = perUnit(item.kcalPerServing, denominator, quantity);
		const carb = perUnit(item.carbPerServing_g, denominator, quantity);
		const protein = perUnit(item.proteinPerServing_g, denominator, quantity);
		const fat = perUnit(item.fatPerServing_g, denominator, quantity);
		const satFat = perUnit(item.satFatPerServing_g, denominator, quantity);
		if ([kcal, carb, protein, fat, satFat].includes("invalid")) {
			errors.push(`${describeItem(item, index)} produces a nutrition value this app cannot represent. Check the amount and serving size.`);
			return;
		}
		if (item.gi !== null && !Number.isSafeInteger(item.gi)) {
			errors.push(`${describeItem(item, index)} has a glycemic index that must be a whole number.`);
			return;
		}

		const sourceRecordId = item.selection.state === "selected" && item.selection.catalogVersion === catalogVersion
			? item.selection.sourceId
			: null;
		const kcalPerUnit = kcal as number | null;

		items.push({
			name: item.name.trim(),
			quantity,
			unit: item.servingUnit as ReferenceUnit,
			kcal_per_unit: kcalPerUnit,
			kcal_per_unit_unit: kcalPerUnit === null ? null : (item.servingUnit as ReferenceUnit),
			nutrition_origin: item.nutritionOrigin,
			carb_g: carb as number | null,
			protein_g: protein as number | null,
			fat_g: fat as number | null,
			sat_fat_g: satFat as number | null,
			gi: item.gi,
			source_record_id: sourceRecordId,
		});
	});

	const mealName = draft.name.trim();
	if (!mealName) errors.push("This meal needs a name before you can calculate it.");
	if (errors.length > 0) return { ok: false, errors };

	return {
		ok: true,
		request: { meal_name: mealName, expected_catalog_version: catalogVersion as string, items },
	};
};

export const buildReferenceSaveRequest = (
	request: ReferencePreviewRequest,
	{ mealName, clientRequestId, createdAt }: { mealName: string; clientRequestId: string; createdAt: string | null },
): ReferenceSaveRequest => ({
	...request,
	meal_name: mealName.trim() || request.meal_name,
	client_request_id: clientRequestId,
	created_at: createdAt,
});

// ---------------- Reuse and import adapters ----------------

const toDraftUnit = (unit: string): Unit => (REFERENCE_UNITS.includes(unit as ReferenceUnit) ? (unit as Unit) : Unit.Grams);

const suggestionSelection = (sourceId: string | null, catalogVersion: string): ReferenceSelection =>
	// M03: reuse carries a SUGGESTION, not a selection, and not a catalog event.
	sourceId === null ? { state: "none" } : { state: "needs_review", sourceId, catalogVersion, cause: "reused_suggestion" };

/**
 * Reuse from validated reference evidence: fresh item IDs, denominator 1,
 * preserved missingness and visible nutrition review. No attached result,
 * fingerprint or old request ID enters the draft, and a previous source ID
 * becomes a suggestion, never a selection.
 */
export const buildReferenceDraftFromEvidence = (response: ReferenceMealResponse): ReferenceDraft | null => {
	const assessment = response.assessment;
	if (response.assessment_state !== "evaluated" || !assessment) return null;
	return {
		contract: "reference",
		id: crypto.randomUUID(),
		image: null,
		name: response.legacy_compatibility.meal_name,
		timestamp: Date.now(),
		reviewedCatalogVersion: null,
		isAiDraft: false,
		source_meal_id: response.legacy_compatibility.id,
		items: assessment.items.map((row) => ({
			id: crypto.randomUUID(),
			name: row.inputs.name,
			amount: row.inputs.quantity,
			servingUnit: toDraftUnit(row.inputs.unit),
			servingSize: 1,
			kcalPerServing: row.inputs.kcal_per_unit,
			carbPerServing_g: row.inputs.carb_g,
			proteinPerServing_g: row.inputs.protein_g,
			fatPerServing_g: row.inputs.fat_g,
			satFatPerServing_g: row.inputs.sat_fat_g,
			gi: row.inputs.gi,
			nutritionOrigin: row.inputs.nutrition_origin,
			basisReviewed: false,
			invalidFields: [],
			selection: suggestionSelection(row.inputs.source_record_id, assessment.catalog_version),
			draftProvenance: "user_entered",
			// Only reviewed values that actually carried over need confirming.
			...(row.inputs.kcal_per_unit === null && row.inputs.carb_g === null && row.inputs.protein_g === null
				&& row.inputs.fat_g === null && row.inputs.sat_fat_g === null && row.inputs.gi === null
				? {}
				: { needsReview: { previousName: row.inputs.name } }),
		})),
	};
};

/**
 * Reuse of a legacy, not-evaluated or evidence-error meal. Food names and
 * explicitly known portions carry over as suggestions; compatibility nutrition
 * is never silently promoted into reference input, so with no known reviewed
 * basis the nutrition starts unknown.
 */
export const buildReferenceDraftFromLegacyMeal = (meal: Meal): ReferenceDraft => ({
	contract: "reference",
	id: crypto.randomUUID(),
	image: null,
	name: meal.name,
	timestamp: Date.now(),
	reviewedCatalogVersion: null,
	isAiDraft: false,
	source_meal_id: meal.id,
	items: meal.items.map((item) => ({
		...createEmptyReferenceItem(),
		name: item.name,
		amount: Number.isFinite(item.amount) && item.amount > 0 ? item.amount : null,
		servingUnit: toDraftUnit(item.servingUnit),
		// Nutrition starts unknown, so there is nothing to confirm here. The
		// user enters reviewed values, or leaves the assessment unavailable.
	})),
});

/**
 * AI proposals in reference mode take this branch BEFORE legacy
 * normalization. Only explicit valid fields are copied, nulls are retained,
 * and the per-unit basis is made explicit only where the extraction contract
 * actually declares it. There is no density guessing, and no catalog or FII
 * selection is ever taken from a proposal.
 */
export const referenceItemFromAiExtraction = (raw: unknown): ReferenceDraftItem => {
	const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
	const base = createEmptyReferenceItem();
	const name = typeof source.name === "string" && source.name.trim() ? source.name : "";
	const declaredUnit = typeof source.unit === "string" && REFERENCE_UNITS.includes(source.unit as ReferenceUnit)
		? (source.unit as Unit)
		: null;

	const explicit = (value: unknown): number | null => {
		const parsed = parseReferenceNumericInput(value === undefined ? null : value);
		return parsed.kind === "value" ? parsed.value : null;
	};
	const explicitInteger = (value: unknown): number | null => {
		const parsed = explicit(value);
		return parsed !== null && Number.isSafeInteger(parsed) ? parsed : null;
	};

	// With no declared unit the basis is ambiguous, so only the name and the
	// review requirement survive. `fii` is never read here.
	if (declaredUnit === null) {
		// Nothing usable was proposed beyond the name, so there is no carried
		// nutrition to confirm.
		return { ...base, name, nutritionOrigin: "ai_reviewed", draftProvenance: "ai_proposed" };
	}

	const proposedNutrition = [source.kcalPerUnit, source.carb_g, source.satFat_g, source.gi]
		.some((value) => explicit(value) !== null);

	return {
		...base,
		name,
		servingUnit: declaredUnit,
		amount: explicit(source.quantity),
		// The extraction contract declares kcalPerUnit/carb_g/satFat_g per unit,
		// so the denominator is an explicit 1 rather than an inferred density.
		servingSize: 1,
		kcalPerServing: explicit(source.kcalPerUnit),
		carbPerServing_g: explicit(source.carb_g),
		satFatPerServing_g: explicit(source.satFat_g),
		gi: explicitInteger(source.gi),
		nutritionOrigin: "ai_reviewed",
		basisReviewed: false,
		draftProvenance: "ai_proposed",
		...(proposedNutrition ? { needsReview: { previousName: name } } : {}),
	};
};
