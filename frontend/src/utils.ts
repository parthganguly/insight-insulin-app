import { ActivityLevel, Gender } from "./stores/settingsStore";
import { Meal } from "./types/Meal";
import { MealItem } from "./types/MealItem";

export const getMealAcuteScore = (meal: Meal): number | undefined => {
	if (typeof meal.acute_score !== "number" || !Number.isFinite(meal.acute_score)) {
		return undefined;
	}
	return Math.round(meal.acute_score);
};
export const calculateBmr = (weight: number, height: number, age: number, gender: Gender): number => {
	let bmr: number;
	if (gender === "female") {
		bmr = 10 * weight + 6.25 * height - 5 * age + 5;
	} else {
		bmr = 10 * weight + 6.25 * height - 5 * age - 161;
	}
	return bmr;
};

export const calculateTdee = (weight: number, height: number, age: number, activityLevel: ActivityLevel, gender: Gender): number => {
	const bmr = calculateBmr(weight, height, age, gender);

	switch (activityLevel) {
		case ActivityLevel.Sedentary:
			return Math.round(bmr * 1.2);
		case ActivityLevel.Light:
			return Math.round(bmr * 1.375);
		case ActivityLevel.Moderate:
			return Math.round(bmr * 1.55);
		case ActivityLevel.Active:
			return Math.round(bmr * 1.725);
		case ActivityLevel.VeryActive:
			return Math.round(bmr * 1.9);
		default:
			return Math.round(bmr * 1.2); // Default to sedentary if no activity level is set
	}
};

export const calculateTotalCalories = (meal: Meal): number => {
	const total = meal.items.reduce((total, item) => total + item.kcalPerServing * item.amount, 0);
	return Math.round(total * 100) / 100;
};

export const getMealDisplayCalories = (meal: Meal): number => {
	if (meal.calorie_source === "meal_estimate" && meal.estimate) {
		return Math.round(meal.estimate.estimated_calories * meal.estimate.serving_count * 100) / 100;
	}
	return calculateTotalCalories(meal);
};

export const calculateTotalItemCalories = (mealItem: MealItem): number => {
	return Math.round(mealItem.kcalPerServing * mealItem.amount * 100) / 100;
};

export const calculateTotalCarbohydrates = (meal: Meal): number => {
	const total = meal.items.reduce((total, item) => total + item.carbPerServing_g * item.amount, 0);
	return Math.round(total * 100) / 100;
};

export const calculateTotalItemCarbohydrates = (mealItem: MealItem): number => {
	return Math.round(mealItem.carbPerServing_g * mealItem.amount * 100) / 100;
};

export const calculateTotalSaturatedFat = (meal: Meal): number => {
	const total = meal.items.reduce((total, item) => total + item.satFatPerServing_g * item.amount, 0);
	return Math.round(total * 100) / 100;
};

export const calculateTotalItemSaturatedFat = (mealItem: MealItem): number => {
	return Math.round(mealItem.satFatPerServing_g * mealItem.amount * 100) / 100;
};

export const getMealTimeString = (meal: Meal): string => {
	return new Date(meal.timestamp).toLocaleString();
};
