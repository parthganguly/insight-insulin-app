import config from "../../config.json"; // adjust path as needed
import { Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";

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

export type ChronicMetricPoint = {
	date: string;
	daily_dil: number;
	total_daily_energy: number;
	daily_dii: number;
	rolling_7d_dil: number;
	rolling_7d_dii: number;
};

export type ChronicMetricsResponse = {
	days: number;
	series: ChronicMetricPoint[];
	current_daily_dil: number;
	current_daily_dii: number;
	current_rolling_7d_dil: number;
	current_rolling_7d_dii: number;
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

const mapDraftMealItemToCreatePayload = (item: MealItem): CreateMealItemPayload => {
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
		fii: toOptionalNumber(flexibleItem.fii),
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
		fii_value: toOptionalNumber(source.fii_value as NumberLike),
		fii: toOptionalNumber(source.fii as NumberLike),
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

const normalizeChronicMetricPoint = (point: unknown): ChronicMetricPoint => {
	const source = point && typeof point === "object" ? (point as Record<string, unknown>) : {};
	return {
		date: toNonEmptyString(source.date) ?? new Date().toISOString().slice(0, 10),
		daily_dil: toNumberWithDefault(source.daily_dil as NumberLike, 0),
		total_daily_energy: toNumberWithDefault(source.total_daily_energy as NumberLike, 0),
		daily_dii: toNumberWithDefault(source.daily_dii as NumberLike, 0),
		rolling_7d_dil: toNumberWithDefault(source.rolling_7d_dil as NumberLike, 0),
		rolling_7d_dii: toNumberWithDefault(source.rolling_7d_dii as NumberLike, 0),
	};
};

const normalizeChronicMetricsResponse = (raw: unknown): ChronicMetricsResponse => {
	const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
	return {
		days: toNumberWithDefault(root.days as NumberLike, 0),
		series: Array.isArray(root.series) ? root.series.map(normalizeChronicMetricPoint) : [],
		current_daily_dil: toNumberWithDefault(root.current_daily_dil as NumberLike, 0),
		current_daily_dii: toNumberWithDefault(root.current_daily_dii as NumberLike, 0),
		current_rolling_7d_dil: toNumberWithDefault(root.current_rolling_7d_dil as NumberLike, 0),
		current_rolling_7d_dii: toNumberWithDefault(root.current_rolling_7d_dii as NumberLike, 0),
	};
};

export const buildCreateMealPayload = (meal: Meal): CreateMealPayload => ({
	meal_name: toNonEmptyString(meal.name) ?? "Untitled meal",
	items: meal.items.map(mapDraftMealItemToCreatePayload),
});

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
		throw new Error(errorMessage);
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
