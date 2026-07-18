import config from "../../config.json"; // adjust path as needed
import { Meal } from "../types/Meal";
import { MealItem, Unit } from "../types/MealItem";
import { parseBackendTimestampMs } from "../utils/backendTimestamp";
import { normalizeExplicitFii, updateMealItemFii } from "../utils/fiiTrustBoundary";

type NumberLike = number | string | null | undefined;

export type CreateMealItemPayload = {
	name: string;
	quantity: number;
	unit: string;
	kcalPerUnit?: number;
	carb_g?: number;
	protein_g?: number;
	fat_g?: number;
	satFat_g?: number;
	gi?: number;
	fii?: number;
};

export type CreateMealPayload = {
	meal_name: string;
	items: CreateMealItemPayload[];
};

export type MealModelingItemResponse = {
	name: string;
	quantity: number;
	unit: string;
	kcalPerUnit?: number;
	carb_g?: number;
	protein_g?: number;
	fat_g?: number;
	satFat_g?: number;
	gi?: number;
	fii_value?: number;
	fii?: number;
	kcal_item: number;
	insulin_load: number;
	confidence: number;
	fii_source: string;
	why?: string;
};

export type MealModelingResponse = {
	id: string;
	created_at: string;
	meal_name: string;
	items: MealModelingItemResponse[];
	insulin_load_total?: number;
	acute_score?: number;
	kcal_total: number;
	carbs_total: number;
	protein_total: number;
	fat_total: number;
	estimate_quality: string;
	main_insulin_drivers: string[];
};

// Logged-days-only trend semantics (issue #93): unlogged days carry null
// daily values and are excluded from the rolling means, which are null when
// the trailing window has no logged days. Coverage metadata says how many of
// the last 7 days actually had logs — missing data is never rendered as 0.
export type ChronicMetricPoint = {
	date: string;
	logged: boolean;
	daily_dil: number | null;
	total_daily_energy: number | null;
	daily_dii: number | null;
	rolling_7d_dil: number | null;
	rolling_7d_dii: number | null;
	logged_days_in_window: number;
};

export type ChronicMetricsResponse = {
	days: number;
	window_days: number;
	logged_days_last_7: number;
	has_data: boolean;
	series: ChronicMetricPoint[];
	current_daily_dil: number | null;
	current_daily_dii: number | null;
	current_rolling_7d_dil: number | null;
	current_rolling_7d_dii: number | null;
};

const DEFAULT_BACKEND_API_URL = "http://127.0.0.1:8000";
const backendApiUrl = (import.meta.env.VITE_BACKEND_API_URL ?? config.backend_api_url ?? DEFAULT_BACKEND_API_URL).replace(/\/+$/, "");

const asFiniteNumber = (value: NumberLike): number | undefined => {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const toOptionalNumber = (value: NumberLike): number | undefined => {
	const parsed = asFiniteNumber(value);
	return parsed === undefined ? undefined : parsed;
};

const toNumberWithDefault = (value: NumberLike, fallback = 0): number => {
	const parsed = asFiniteNumber(value);
	return parsed === undefined ? fallback : parsed;
};

const toNonEmptyString = (value: unknown): string | undefined => {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const toMealUnit = (value: unknown): Unit => {
	if (typeof value === "string" && Object.values(Unit).includes(value as Unit)) {
		return value as Unit;
	}
	return Unit.Servings;
};

const normalizeAiDensityValue = (value: number | undefined, unit: Unit, maxPerSingleUnit: number): number | undefined => {
	if (value === undefined || !Number.isFinite(value)) return value;
	if (unit !== Unit.Grams && unit !== Unit.Milliliters) return value;

	const looksLikePerHundredUnits = value > maxPerSingleUnit;
	return looksLikePerHundredUnits ? value / 100 : value;
};

export const normalizeAiExtractedItem = (item: unknown): MealItem => {
	const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
	const servingUnit = toMealUnit(source.unit ?? source.servingUnit);
	const kcalPerUnit = normalizeAiDensityValue(toNumberWithDefault((source.kcalPerUnit ?? source.kcalPerServing) as NumberLike, 0), servingUnit, 9.5) ?? 0;
	const carbPerUnit = normalizeAiDensityValue(toNumberWithDefault((source.carb_g ?? source.carbPerServing_g) as NumberLike, 0), servingUnit, 1) ?? 0;
	const proteinPerUnitRaw = source.protein_g === undefined ? undefined : toOptionalNumber(source.protein_g as NumberLike);
	const fatPerUnitRaw = source.fat_g === undefined ? undefined : toOptionalNumber(source.fat_g as NumberLike);
	const satFatPerUnit = normalizeAiDensityValue(toNumberWithDefault((source.satFat_g ?? source.satFatPerServing_g) as NumberLike, 0), servingUnit, 1) ?? 0;

	const aiDraftItem: MealItem = {
		id: typeof source.id === "string" && source.id.trim() ? source.id : crypto.randomUUID(),
		name: typeof source.name === "string" && source.name.trim() ? source.name : "New Item",
		image: typeof source.image === "string" ? source.image : undefined,
		servingSize: 1,
		servingUnit,
		amount: toNumberWithDefault((source.quantity ?? source.amount) as NumberLike, 0),
		kcalPerServing: kcalPerUnit,
		carbPerServing_g: carbPerUnit,
		proteinPerServing_g: normalizeAiDensityValue(proteinPerUnitRaw, servingUnit, 1),
		fatPerServing_g: normalizeAiDensityValue(fatPerUnitRaw, servingUnit, 1),
		satFatPerServing_g: satFatPerUnit,
		gi: toNumberWithDefault(source.gi as NumberLike, 0),
		draftProvenance: "ai_proposed",
	};

	return aiDraftItem;
};

export const mapDraftMealItemToCreatePayload = (item: MealItem): CreateMealItemPayload => {
	const flexibleItem = item as MealItem & {
		quantity?: NumberLike;
		unit?: string;
		kcalPerUnit?: NumberLike;
		carb_g?: NumberLike;
		protein_g?: NumberLike;
		proteinPerServing_g?: NumberLike;
		fat_g?: NumberLike;
		fatPerServing_g?: NumberLike;
		satFat_g?: NumberLike;
	};

	const explicitFii = normalizeExplicitFii(flexibleItem.fii);

	return {
		name: toNonEmptyString(flexibleItem.name) ?? "Unnamed item",
		quantity: toNumberWithDefault(flexibleItem.quantity ?? flexibleItem.amount, 0),
		unit: toNonEmptyString(flexibleItem.unit ?? flexibleItem.servingUnit) ?? "serving",
		kcalPerUnit: toOptionalNumber(flexibleItem.kcalPerUnit ?? flexibleItem.kcalPerServing),
		carb_g: toOptionalNumber(flexibleItem.carb_g ?? flexibleItem.carbPerServing_g),
		protein_g: toOptionalNumber(flexibleItem.protein_g ?? flexibleItem.proteinPerServing_g),
		fat_g: toOptionalNumber(flexibleItem.fat_g ?? flexibleItem.fatPerServing_g),
		satFat_g: toOptionalNumber(flexibleItem.satFat_g ?? flexibleItem.satFatPerServing_g),
		gi: toOptionalNumber(flexibleItem.gi),
		...(explicitFii === undefined ? {} : { fii: explicitFii }),
	};
};

const normalizeMealModelingItem = (item: unknown): MealModelingItemResponse => {
	const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
	return {
		name: toNonEmptyString(source.name) ?? "Unnamed item",
		quantity: toNumberWithDefault(source.quantity as NumberLike, 0),
		unit: toNonEmptyString(source.unit) ?? "serving",
		kcalPerUnit: toOptionalNumber((source.kcalPerUnit ?? source.kcal_per_unit) as NumberLike),
		carb_g: toOptionalNumber(source.carb_g as NumberLike),
		protein_g: toOptionalNumber(source.protein_g as NumberLike),
		fat_g: toOptionalNumber(source.fat_g as NumberLike),
		satFat_g: toOptionalNumber((source.satFat_g ?? source.sat_fat_g) as NumberLike),
		gi: toOptionalNumber(source.gi as NumberLike),
		fii_value: normalizeExplicitFii(source.fii_value),
		fii: normalizeExplicitFii(source.fii),
		kcal_item: toNumberWithDefault(source.kcal_item as NumberLike, 0),
		insulin_load: toNumberWithDefault(source.insulin_load as NumberLike, 0),
		confidence: toNumberWithDefault(source.confidence as NumberLike, 0),
		fii_source: toNonEmptyString(source.fii_source) ?? "unknown",
		why: toNonEmptyString(source.why),
	};
};

const normalizeMealModelingResponse = (raw: unknown): MealModelingResponse => {
	const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
	const candidate = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
	const items = Array.isArray(candidate.items) ? candidate.items.map(normalizeMealModelingItem) : [];
	return {
		id: toNonEmptyString(candidate.id) ?? crypto.randomUUID(),
		created_at: toNonEmptyString(candidate.created_at) ?? new Date().toISOString(),
		meal_name: toNonEmptyString(candidate.meal_name ?? candidate.name) ?? "Untitled meal",
		items,
		insulin_load_total: toOptionalNumber(candidate.insulin_load_total as NumberLike),
		acute_score: toOptionalNumber(candidate.acute_score as NumberLike),
		kcal_total: toNumberWithDefault(candidate.kcal_total as NumberLike, 0),
		carbs_total: toNumberWithDefault(candidate.carbs_total as NumberLike, 0),
		protein_total: toNumberWithDefault(candidate.protein_total as NumberLike, 0),
		fat_total: toNumberWithDefault(candidate.fat_total as NumberLike, 0),
		estimate_quality: toNonEmptyString(candidate.estimate_quality) ?? "unknown",
		main_insulin_drivers: Array.isArray(candidate.main_insulin_drivers)
			? candidate.main_insulin_drivers.map((driver) => toNonEmptyString(driver)).filter((driver): driver is string => Boolean(driver))
			: [],
	};
};

// Missing data must stay missing: null/undefined/non-numeric values become
// null, never 0, so an unlogged day cannot masquerade as a zero-insulin day.
const toNullableNumber = (value: NumberLike): number | null => {
	if (value === null || value === undefined) return null;
	const parsed = asFiniteNumber(value);
	return parsed === undefined ? null : parsed;
};

const normalizeChronicMetricPoint = (point: unknown): ChronicMetricPoint => {
	const source = point && typeof point === "object" ? (point as Record<string, unknown>) : {};
	return {
		date: toNonEmptyString(source.date) ?? new Date().toISOString().slice(0, 10),
		logged: source.logged === true,
		daily_dil: toNullableNumber(source.daily_dil as NumberLike),
		total_daily_energy: toNullableNumber(source.total_daily_energy as NumberLike),
		daily_dii: toNullableNumber(source.daily_dii as NumberLike),
		rolling_7d_dil: toNullableNumber(source.rolling_7d_dil as NumberLike),
		rolling_7d_dii: toNullableNumber(source.rolling_7d_dii as NumberLike),
		logged_days_in_window: toNumberWithDefault(source.logged_days_in_window as NumberLike, 0),
	};
};

const normalizeChronicMetricsResponse = (raw: unknown): ChronicMetricsResponse => {
	const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
	const loggedDaysLast7 = toNumberWithDefault(root.logged_days_last_7 as NumberLike, 0);
	return {
		days: toNumberWithDefault(root.days as NumberLike, 0),
		window_days: toNumberWithDefault(root.window_days as NumberLike, 7),
		logged_days_last_7: loggedDaysLast7,
		has_data: root.has_data === true || (root.has_data === undefined && loggedDaysLast7 > 0),
		series: Array.isArray(root.series) ? root.series.map(normalizeChronicMetricPoint) : [],
		current_daily_dil: toNullableNumber(root.current_daily_dil as NumberLike),
		current_daily_dii: toNullableNumber(root.current_daily_dii as NumberLike),
		current_rolling_7d_dil: toNullableNumber(root.current_rolling_7d_dil as NumberLike),
		current_rolling_7d_dii: toNullableNumber(root.current_rolling_7d_dii as NumberLike),
	};
};

export const mapMealModelingResponseToMeal = (backendMeal: MealModelingResponse, image: string | null = null): Meal => ({
	id: backendMeal.id,
	image,
	name: backendMeal.meal_name,
	timestamp: parseBackendTimestampMs(backendMeal.created_at, Date.now()),
	isAiDraft: false,
	items: backendMeal.items.map((item) => {
		const canonicalItem: MealItem = {
			id: crypto.randomUUID(),
			name: item.name,
			servingSize: 1,
			servingUnit: toMealUnit(item.unit),
			amount: item.quantity,
			kcalPerServing: item.kcalPerUnit ?? 0,
			carbPerServing_g: item.carb_g ?? 0,
			proteinPerServing_g: item.protein_g,
			fatPerServing_g: item.fat_g,
			satFatPerServing_g: item.satFat_g ?? 0,
			gi: item.gi ?? 0,
			source: item.fii_source,
			why: item.why,
		};
		return updateMealItemFii(canonicalItem, item.fii_value ?? item.fii);
	}),
	acute_score: backendMeal.acute_score,
	insulin_load_total: backendMeal.insulin_load_total,
	backend_created_at: backendMeal.created_at,
	kcal_total: backendMeal.kcal_total,
	carbs_total: backendMeal.carbs_total,
	protein_total: backendMeal.protein_total,
	fat_total: backendMeal.fat_total,
	estimate_quality: backendMeal.estimate_quality,
	main_insulin_drivers: backendMeal.main_insulin_drivers,
	estimate: undefined,
	calorie_source: "item_sum",
});

export const buildCreateMealPayload = (meal: Meal): CreateMealPayload => ({
	meal_name: toNonEmptyString(meal.name) ?? "Untitled meal",
	items: meal.items.map(mapDraftMealItemToCreatePayload),
});

// Typed error for /ai-meal-extract HTTP failures so the UI can map them to
// curated copy (issue #74). The backend detail is kept on `message` for
// console diagnostics only and must never be rendered to the user.
export class AiExtractionHttpError extends Error {
	readonly status: number;

	constructor(status: number, detail: string) {
		super(detail);
		this.name = "AiExtractionHttpError";
		this.status = status;
	}
}

export const fetchAiMealFromAPI = async (base64Images: string[], textualData: string): Promise<Meal> => {
	const res = await fetch(`${backendApiUrl}/ai-meal-extract`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ images: base64Images, textualData }),
	});
	if (!res.ok) {
		let errorMessage = "Failed to extract meal.";
		try {
			const errorBody = (await res.json()) as { detail?: string };
			if (errorBody?.detail) {
				errorMessage = errorBody.detail;
			}
		} catch {
			// Keep fallback message when error body is not JSON.
		}
		throw new AiExtractionHttpError(res.status, errorMessage);
	}
	const response = await res.json();
	return response.data.meal;
};

export const fetchBarcodeMealItemFromAPI = async (base64Image: string): Promise<MealItem> => {
	const res = await fetch(`${backendApiUrl}/barcode-meal-item-extract`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ image_base64: base64Image }),
	});
	if (!res.ok) throw new Error("Failed to scan barcode.");

	const response = await res.json();
	if (response.success) {
		return response.data.mealItem;
	} else {
		throw new Error(response.message || "Failed to scan barcode.");
	}
};

export const postMealToAPI = async (payload: CreateMealPayload): Promise<MealModelingResponse> => {
	const res = await fetch(`${backendApiUrl}/meals`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		let errorMessage = "Failed to save meal";
		try {
			const errorBody = (await res.json()) as { detail?: string };
			if (errorBody?.detail) {
				errorMessage = errorBody.detail;
			}
		} catch {
			// Keep fallback message when error body is not JSON.
		}
		throw new Error(errorMessage);
	}

	const responseBody = await res.json();
	return normalizeMealModelingResponse(responseBody);
};

// Deletes a backend-persisted meal (issue #78). A 404 is treated as success:
// the meal is already absent from the backend, which is the state deletion is
// trying to reach, so the caller may safely drop its local copy.
export const deleteMealFromAPI = async (mealId: string): Promise<void> => {
	const res = await fetch(`${backendApiUrl}/meals/${encodeURIComponent(mealId)}`, { method: "DELETE" });

	if (res.ok || res.status === 404) return;

	let errorMessage = "Failed to delete meal";
	try {
		const errorBody = (await res.json()) as { detail?: string };
		if (errorBody?.detail) {
			errorMessage = errorBody.detail;
		}
	} catch {
		// Keep fallback message when error body is not JSON.
	}
	throw new Error(errorMessage);
};

export const fetchMealsFromAPI = async (): Promise<MealModelingResponse[]> => {
	const res = await fetch(`${backendApiUrl}/meals`);

	if (!res.ok) {
		let errorMessage = "Failed to load meals";
		try {
			const errorBody = (await res.json()) as { detail?: string };
			if (errorBody?.detail) {
				errorMessage = errorBody.detail;
			}
		} catch {
			// Keep fallback message when error body is not JSON.
		}
		throw new Error(errorMessage);
	}

	const responseBody = (await res.json()) as unknown;
	const rawMeals = Array.isArray(responseBody) ? responseBody : Array.isArray((responseBody as { data?: unknown })?.data) ? ((responseBody as { data: unknown[] }).data) : [];
	return rawMeals.map(normalizeMealModelingResponse);
};

export const fetchChronicMetricsFromAPI = async (days = 30): Promise<ChronicMetricsResponse> => {
	const res = await fetch(`${backendApiUrl}/metrics/chronic?days=${days}`);
	if (!res.ok) {
		let errorMessage = "Failed to load chronic metrics";
		try {
			const errorBody = (await res.json()) as { detail?: string };
			if (errorBody?.detail) {
				errorMessage = errorBody.detail;
			}
		} catch {
			// Keep fallback message when error body is not JSON.
		}
		throw new Error(errorMessage);
	}

	const responseBody = await res.json();
	return normalizeChronicMetricsResponse(responseBody);
};
