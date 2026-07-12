// Presentation-only helpers for the 7-Day Logged Meal Trend (issues #93).
// Never use these to persist or recalculate the trend.
//
// What the displayed number actually is (traced through the backend):
//   daily_dil = Σ (fii/100 × kcal_item)
//   daily_dii = daily_dil / total_daily_energy
//   displayed = rolling mean of daily_dii over LOGGED days, × 100
// Substituting, `daily_dii × 100` is the kcal-weighted mean FII of that day's
// food. So the displayed value is an **energy-normalized insulin-demand
// index**, NOT total insulin demand per day and NOT an average of daily
// demand. A day of potato (FII 121) displays 121 — the index legitimately
// exceeds 100, so the number must never be capped and must never be called a
// percentage. Only the ring geometry caps, as a visual guide.

export const TREND_RING_MAX = 100;

export const getTrendRingValue = (trend?: number | null): number => {
	if (trend === undefined || trend === null || !Number.isFinite(trend)) return 0;
	return Math.min(TREND_RING_MAX, Math.max(0, Math.round(trend)));
};

export const getTrendText = (trend?: number | null, isLoading = false): string => {
	if (isLoading) return "...";
	if (trend === undefined || trend === null || !Number.isFinite(trend)) return "--";
	return String(Math.round(trend));
};

export const isAboveTrendRingMax = (trend?: number | null): boolean => {
	if (trend === undefined || trend === null || !Number.isFinite(trend)) return false;
	return Math.round(trend) > TREND_RING_MAX;
};

export const getTrendCoverageText = (loggedDays: number, windowDays: number): string => `${loggedDays} of ${windowDays} days logged`;

// Describes the displayed quantity accurately: an energy-normalized index over
// logged days. Deliberately avoids "total daily insulin demand", "average
// insulin demand per day", "chronic", and "metabolic score".
export const TREND_STATUS_LINE = "Average energy-normalized insulin-demand index across the days you logged meals in the last 7.";

export const TREND_NO_DATA_LINE = "No meals logged in the last 7 days, so there is no trend to show yet.";

export const TREND_LOADING_LINE = "Loading trend from your logged meals…";

export const TREND_UNAVAILABLE_LINE = "Long-term backend trend data is unavailable right now.";

// The trend has three distinct ABSENT-value states plus a value state, and a
// screen reader must not confuse them. A pending or failed request tells us
// nothing about whether meals were logged, so neither may ever claim "no meals
// logged" — that assertion is only true for a SUCCESSFUL response reporting
// has_data = false. Never infer "no-data" from a missing number alone.
export type TrendAccessibilityState = "loading" | "unavailable" | "no-data" | "value";

export type TrendStateInput = {
	isLoading: boolean;
	/** Non-null when the chronic fetch failed. */
	errorMessage: string | null;
	/** True once a chronic response has actually been received. */
	hasResponse: boolean;
	/** The response's has_data flag (meaningless unless hasResponse). */
	hasData: boolean;
	/** The rounded index, or undefined when the response carried none. */
	trend: number | undefined;
};

export const resolveTrendState = ({ isLoading, errorMessage, hasResponse, hasData, trend }: TrendStateInput): TrendAccessibilityState => {
	if (isLoading) return "loading";
	if (errorMessage !== null || !hasResponse) return "unavailable";
	if (typeof trend === "number" && Number.isFinite(trend)) return "value";
	// A successful response with no logged days is the ONLY case that may say
	// "no meals were logged". A successful response that claims data but
	// carries no usable number is a backend inconsistency, not a no-data state.
	return hasData ? "unavailable" : "no-data";
};

export const TREND_ARIA_LOADING = "7-day logged meal trend loading.";
export const TREND_ARIA_UNAVAILABLE = "7-day logged meal trend unavailable because the data could not be loaded.";
export const TREND_ARIA_NO_DATA = "7-day logged meal trend not available because no meals were logged in the last 7 days.";

export const getTrendAriaLabel = (state: TrendAccessibilityState, trend: number | null | undefined, loggedDays: number, windowDays: number): string => {
	if (state === "loading") return TREND_ARIA_LOADING;
	if (state === "unavailable") return TREND_ARIA_UNAVAILABLE;
	if (state === "no-data") return TREND_ARIA_NO_DATA;

	if (trend === undefined || trend === null || !Number.isFinite(trend)) {
		// Defensive: a "value" state must carry a finite number.
		return TREND_ARIA_UNAVAILABLE;
	}

	const rounded = Math.round(trend);
	const exceeds = rounded > TREND_RING_MAX ? " This is above 100; the index is not a percentage and can exceed 100." : "";
	return (
		`7-day logged meal trend ${rounded}. This is an energy-normalized insulin-demand index, ` +
		`averaged over the ${loggedDays} of the last ${windowDays} days that have logged meals. ` +
		`Days without logged meals are excluded, and meals you did not log on a logged day are not represented.${exceeds}` +
		` The ring caps at 100 and is a visual guide only. This is not a measure of insulin resistance or metabolic health.`
	);
};
