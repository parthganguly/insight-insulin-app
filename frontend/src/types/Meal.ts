import { MealItem } from "./MealItem";

export type MealEstimate = {
	estimated_calories: number;
	estimated_carbs_g: number;
	estimated_fat_g: number;
	confidence: number;
	serving_type: string;
	serving_count: number;
};

export type CalorieSource = "meal_estimate" | "item_sum";

export type Meal = {
	id: string;
	image: string | null;
	name: string;
	timestamp: number;
	items: MealItem[];
	isAiDraft?: boolean;
	acute_score?: number;
	insulin_load_total?: number;
	backend_created_at?: string;
	kcal_total?: number;
	carbs_total?: number;
	protein_total?: number;
	fat_total?: number;
	estimate_quality?: string;
	main_insulin_drivers?: string[];
	estimate?: MealEstimate;
	calorie_source?: CalorieSource;
};
