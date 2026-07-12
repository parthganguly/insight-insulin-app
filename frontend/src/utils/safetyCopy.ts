// Safety and UX copy approved in issue #45; truth-in-presentation revisions
// approved in issue #93. These strings are user-facing safety wording; do not
// edit without a new approval on one of those issues.

// Issue #93: "published population-level food data" oversold the current
// small starter dataset, so the word "published" was removed. Every negative
// disclaimer is unchanged.
export const APP_DISCLAIMER =
	"INSIGHT estimates the relative insulin demand of meals using population-level food data. It does not measure or predict your personal insulin or glucose response, does not diagnose any condition, and is not medical advice. Do not use it to make insulin dosing or treatment decisions.";

export const MEAL_SCORE_DISCLAIMER =
	"Estimated from population-average food insulin index data and your entered portions. This is a relative comparison tool, not a prediction of your body’s response.";

export const UNKNOWN_ITEMS_NOTICE =
	"We couldn’t estimate some items, so they add 0 to this score. The real insulin demand may be higher than shown.";

export const ROUGH_ESTIMATE_NOTICE =
	"No direct insulin-index data was available for this item, so this is a rough estimate from nutrition data or typical dish components. Treat it as approximate.";

export const CHRONIC_TREND_DISCLAIMER =
	"This trend summarizes the estimated insulin load of meals you logged. Days without logged meals may lower the trend. It is not a measure of insulin resistance or metabolic health.";

export const PROVIDED_FII_DISCLAIMER =
	"This item uses an insulin-index value you entered. The app has not verified that value.";

// Approved in issue #50.
export const AI_EXTRACTION_PRIVACY_DISCLOSURE =
	"AI meal extraction sends your meal image or description to an external AI service to estimate food items and nutrition. INSIGHT does not retain uploaded images on the backend by default, but the external service may process the data according to its own policies. Do not upload anything you are not comfortable sharing for AI processing.";

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
