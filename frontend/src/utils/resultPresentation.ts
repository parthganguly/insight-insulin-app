import { Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";
import { calculateTotalCalories, calculateTotalCarbohydrates, calculateTotalItemCalories } from "../utils";

// Annotated Journal J5 — pure display helpers for the saved-result chassis.
//
// Presentation only. Nothing here scores a meal, resolves an FII, judges
// estimate quality, or reconstructs insulin load. The saved meal that reaches
// this screen has NO per-item insulin load: the backend response carries
// `insulin_load` per item, but `mapMealModelingResponseToMeal` drops it before
// persistence and `syncMealsFromBackend` rehydrates through the same mapper.
// Per-item "share of load" is therefore not derivable from stored data, and
// recomputing it here would reimplement a protected scientific formula. The
// evidence bars express one honest thing instead — each item's share of the
// meal's *calories* — and the UI says so in words.

export const getResultCompositionLine = (meal: Meal): string => {
	const itemCount = meal.items.length;
	const kcal = Math.round(meal.kcal_total ?? calculateTotalCalories(meal));
	const carbs = Math.round(meal.carbs_total ?? calculateTotalCarbohydrates(meal));
	return `${itemCount} ${itemCount === 1 ? "item" : "items"} · ≈ ${kcal} kcal · ${carbs} g carbs`;
};

// A saved meal can be read back long after it was logged, so the date carries
// its year. Demoted metadata, never the answer.
export const getResultLoggedLine = (meal: Meal): string => {
	const loggedAt = new Date(meal.timestamp);
	const date = loggedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
	const time = loggedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
	return `Logged ${date} · ${time}`;
};

// Display ordering only: items the backend named as main drivers read first,
// in the backend's own driver order, then everything else in stored order.
// Matching is by name and never rewrites, filters, or reweights an item.
// Drivers that match no item are not dropped from the page — they render in
// the drivers line regardless (backend driver strings and item names are
// independent fields and legitimately disagree).
export const orderItemsByDriver = (items: MealItem[], drivers: string[] = []): MealItem[] => {
	const normalize = (value: string): string => value.trim().toLocaleLowerCase();
	const claimed = new Set<number>();
	const ordered: MealItem[] = [];

	for (const driver of drivers.map(normalize).filter((driver) => driver.length > 0)) {
		const matchIndex = items.findIndex((item, index) => !claimed.has(index) && normalize(item.name) === driver);
		if (matchIndex === -1) continue;
		claimed.add(matchIndex);
		ordered.push(items[matchIndex]);
	}

	items.forEach((item, index) => {
		if (!claimed.has(index)) ordered.push(item);
	});

	return ordered;
};

export type ItemCalorieShare = {
	item: MealItem;
	kcal: number;
	// 0–1 share of the meal's item-calorie sum. The denominator is the item sum
	// itself, so shares always total 1 and no residual has to be invented.
	fraction: number;
};

export const getItemCalorieShares = (items: MealItem[]): ItemCalorieShare[] => {
	const calories = items.map((item) => {
		const itemCalories = calculateTotalItemCalories(item);
		return Number.isFinite(itemCalories) && itemCalories > 0 ? itemCalories : 0;
	});
	const total = calories.reduce((sum, value) => sum + value, 0);

	return items.map((item, index) => ({
		item,
		kcal: Math.round(calories[index]),
		fraction: total > 0 ? calories[index] / total : 0,
	}));
};

// With no positive calorie anywhere in the meal every bar would be a full-width
// or zero-width lie, so the bars (and the sentence explaining them) are omitted
// entirely rather than drawn meaninglessly.
export const hasCalorieShareBars = (items: MealItem[]): boolean =>
	getItemCalorieShares(items).some((share) => share.fraction > 0);

export const getVisibleDrivers = (drivers: string[] | undefined): string[] =>
	(drivers ?? []).map((driver) => driver.trim()).filter((driver) => driver.length > 0).slice(0, 3);
