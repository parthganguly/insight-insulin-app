// Safety and UX copy approved in issue #45; truth-in-presentation revisions
// approved in issues #93 and #125. These strings are user-facing safety
// wording; do not edit without a new approval.

// Issue #93 dataset-truth correction. The live dataset is ten hand-entered
// `starter_placeholder` rows: no value traces to a cited primary study, and
// the confidences are not measurement-derived. Copy claiming "published",
// "population-level", "population-average", "validated", or "measured" data
// therefore overstates the evidence and is forbidden here (guarded by tests
// in safetyCopy.test.ts). Items with no suitable dataset value fall through
// to heuristic estimates, which the copy must also admit.
export const APP_DISCLAIMER =
	"INSIGHT estimates relative meal insulin demand using a limited starter set of food insulin-index values, and heuristic estimates when a suitable food value is unavailable. The dataset and model are not yet scientifically validated. It does not measure or predict your personal insulin or glucose response, diagnose any condition, or provide medical advice. Do not use it for insulin dosing or treatment decisions.";

export const MEAL_SCORE_DISCLAIMER =
	"Estimated from the app’s limited food insulin-index dataset, heuristic fallbacks, and your entered portions. The dataset and model are not yet validated. This is a relative comparison tool, not a prediction of your body’s response.";

export const UNKNOWN_ITEMS_NOTICE =
	"Some items were not estimated by the current model. This is missing model information, not a statement about their biological effect.";

export const ROUGH_ESTIMATE_NOTICE =
	"Some items were approximated using similar foods or fallback nutrition estimates. Their model handling is listed below.";

// Issue #93: logged-days-only semantics, plus the dataset-truth correction.
// The displayed trend is an energy-normalized index (kcal-weighted mean FII),
// not total or average daily insulin demand — see utils/trendDisplay.ts. It is
// not a percentage and can exceed 100 (a potato-only day displays 121).
export const CHRONIC_TREND_DISCLAIMER =
	"This is an energy-normalized insulin-demand index, not a total or a percentage, and it can exceed 100 — the ring caps at 100 as a visual guide only. It averages only the days you logged meals on; days without logs are left out, not counted as zero, and meals you ate but didn’t log on a logged day still aren’t reflected. It is not a measure of insulin resistance or metabolic health.";

export const PROVIDED_FII_DISCLAIMER =
	"This item uses an insulin-index value you entered. The app has not verified that value.";

// Approved in issue #50.
export const AI_EXTRACTION_PRIVACY_DISCLOSURE =
	"AI meal extraction sends your meal image or description to an external AI service to estimate food items and nutrition. INSIGHT does not retain uploaded images on the backend by default, but the external service may process the data according to its own policies. Do not upload anything you are not comfortable sharing for AI processing.";

// Approved Settings / identity milestone copy.
export const SETTINGS_PROTOTYPE_STATUS = "Experimental prototype";
export const SETTINGS_SAVED_MEALS_DISCLOSURE =
	"Saved meals are stored on this device and in the configured INSIGHT backend. The current backend has no accounts or per-user isolation, so saved meals are not separated by user.";
export const SETTINGS_IMAGE_DISCLOSURE =
	"Small saved-meal images may remain in this app’s local storage. To recover unfinished work if Android closes INSIGHT while the camera or photo picker is open, the app may temporarily store your draft and full-size images on this device, with a small recovery marker. This is not a cloud backup. The app attempts to clear recovery data after completion, cancellation or recovery, and when it finds invalid or expired recovery data at startup. Recovery expires after about 15 minutes.";
export const SETTINGS_DELETE_DISCLOSURE = "Saved meals can be deleted one at a time. There is no delete-all action in this prototype.";

const SOURCE_LABELS: Record<string, string> = {
	user_confirmed: "User-entered FII",
	exact_fii: "Direct FII match",
	mapped_fii: "Mapped FII estimate",
	macro_fallback: "Macro-based rough estimate",
	unknown: "Unknown / not estimated",
};

export const humanizeFiiSource = (source: string | undefined): string => {
	if (!source) return SOURCE_LABELS.unknown;
	return SOURCE_LABELS[source] ?? SOURCE_LABELS.unknown;
};

// Issue #125 saved-result provenance uses software-action language instead of
// implying calibrated confidence or row-level scientific authority. Canonical
// backend tokens remain unchanged.
const SAVED_RESULT_SOURCE_COPY: Record<string, string> = {
	user_confirmed: "Value you entered",
	exact_fii: "Matched in INSIGHT’s current food table",
	mapped_fii: "Estimated using a similar food",
	macro_fallback: "Used a fallback estimate",
	unknown: "Not estimated in this version",
};

export const getSavedResultSourceCopy = (source: string | undefined): string => {
	if (!source) return SAVED_RESULT_SOURCE_COPY.unknown;
	return SAVED_RESULT_SOURCE_COPY[source] ?? SAVED_RESULT_SOURCE_COPY.unknown;
};

export const getSavedResultUnknownItemsNotice = (itemNames: string[]): string => {
	const names = itemNames.map((name) => name.trim()).filter((name) => name.length > 0);
	if (names.length === 0) return UNKNOWN_ITEMS_NOTICE;
	return `Not estimated in this version: ${names.join(", ")}. The saved result includes no model estimate for these items.`;
};

export type EstimateQualityCopy = {
	label: string;
	description: string;
};

const ESTIMATE_QUALITY_COPY: Record<string, EstimateQualityCopy> = {
	high: { label: "High", description: "Based on direct or explicitly provided insulin-index data." },
	medium: { label: "Medium", description: "Based on mapped or decomposed food-insulin data. Useful, but less direct." },
	low: { label: "Low", description: "Uses rough fallback, unknown, or mixed-quality estimates. Treat as approximate." },
	unknown: { label: "Unknown", description: "Not enough reliable data to estimate this confidently." },
};

export const getEstimateQualityCopy = (quality: string | undefined): EstimateQualityCopy => {
	const normalized = quality?.trim().toLowerCase();
	return (normalized && ESTIMATE_QUALITY_COPY[normalized]) || ESTIMATE_QUALITY_COPY.unknown;
};

export const isUnknownSource = (source: string | undefined): boolean => source === "unknown";

export const isRoughEstimateSource = (source: string | undefined): boolean => source === "macro_fallback" || source === "mapped_fii";

export const isProvidedFiiSource = (source: string | undefined): boolean => source === "user_confirmed";

// Sources the frontend itself assigns to draft items before any backend save.
// Backend-scored items always carry one of the standardized fii_source tokens
// instead, so an explicit FII on a draft item can only come from a user edit.
const DRAFT_ITEM_SOURCES = new Set<string | undefined>([undefined, "ai"]);

export const shouldShowProvidedFiiDisclaimer = (source: string | undefined, fii: number | undefined): boolean => {
	if (isProvidedFiiSource(source)) return true;
	return fii !== undefined && DRAFT_ITEM_SOURCES.has(source);
};
