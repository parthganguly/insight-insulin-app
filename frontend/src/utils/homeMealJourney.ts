export type HomeLifecycleState = "empty" | "building-history" | "trend-ready";

type HomeLifecycleInput = {
	mealCount: number;
	// undefined/null means "coverage isn't known yet" (still loading, or the
	// last fetch failed) — distinct from a confirmed 0. Only a confirmed
	// coverage count below the threshold collapses the trend card; an unknown
	// count must not, or a loading/failed fetch would be misread as "not
	// enough history yet" and lose its own loading/error announcement.
	loggedDaysLast7?: number | null;
	coverageKnown: boolean;
};

export const HOME_TREND_MINIMUM_LOGGED_DAYS = 3;

export const resolveHomeLifecycleState = ({ mealCount, loggedDaysLast7, coverageKnown }: HomeLifecycleInput): HomeLifecycleState => {
	if (mealCount <= 0) return "empty";
	if (!coverageKnown) return "trend-ready";
	return (loggedDaysLast7 ?? 0) >= HOME_TREND_MINIMUM_LOGGED_DAYS ? "trend-ready" : "building-history";
};

export const getHomeTrendCoverageLine = (loggedDaysLast7: number, windowDays: number): string => {
	const safeLoggedDays = Math.max(0, Math.min(HOME_TREND_MINIMUM_LOGGED_DAYS, Math.floor(loggedDaysLast7)));
	const safeWindowDays = Number.isFinite(windowDays) && windowDays > 0 ? Math.floor(windowDays) : 7;
	return `Your ${safeWindowDays}-day trend appears after you log meals on ${HOME_TREND_MINIMUM_LOGGED_DAYS} different days (${safeLoggedDays} of ${HOME_TREND_MINIMUM_LOGGED_DAYS} so far).`;
};
