import { Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";

export const normalizeExplicitFii = (value: unknown): number | undefined => {
	if (value === undefined || value === null) return undefined;
	if (typeof value === "string" && !value.trim()) return undefined;

	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const updateMealItemFii = (item: MealItem, value: unknown): MealItem => {
	const updatedItem = { ...item };
	const fii = normalizeExplicitFii(value);
	if (fii === undefined) {
		delete updatedItem.fii;
	} else {
		updatedItem.fii = fii;
	}
	return updatedItem;
};

export const buildDraftFromSavedMeal = (savedMeal: Meal): Meal => ({
	...savedMeal,
	id: crypto.randomUUID(),
	timestamp: Date.now(),
	isAiDraft: false,
	backend_created_at: undefined,
	acute_score: undefined,
	insulin_load_total: undefined,
	kcal_total: undefined,
	carbs_total: undefined,
	protein_total: undefined,
	fat_total: undefined,
	estimate_quality: undefined,
	main_insulin_drivers: undefined,
	items: savedMeal.items.map((item) => {
		const draftItem = { ...item, id: crypto.randomUUID() };
		delete draftItem.fii;
		delete draftItem.source;
		delete draftItem.why;
		return draftItem;
	}),
});
