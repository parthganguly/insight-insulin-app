import { create } from "zustand";
import { Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";
import type { Unit } from "../types/MealItem";

type CurrentMealStore = {
	meal: Meal;
	setMeal: (meal: Meal) => void;
	resetMeal: () => void;
	addMealItem: (item: MealItem) => void;
	addEmptyMealItem: () => void;
	deleteMealItem: (id: string) => void;
	setNewMealId: () => void; // Generates a new ID for the meal
	setImage: (image: string | null) => void;
	setName: (name: string) => void;
	setTimestamp: (timestamp: number) => void;
};

export const useCurrentMealStore = create<CurrentMealStore>((set, get) => ({
	meal: {
		id: crypto.randomUUID(),
		image: null,
		name: "New Meal",
		timestamp: Date.now(),
		items: [],
		isAiDraft: false,
	},

	setMeal: (meal: Meal) => {
		set({ meal }); // Ensure meal has a unique ID
	},

	setNewMealId: () => {
		set((state) => ({
			meal: {
				...state.meal,
				id: crypto.randomUUID(),
			},
		}));
	},

	resetMeal: () => {
		set({
			meal: {
				id: crypto.randomUUID(),
				image: null,
				name: "New Meal",
				timestamp: Date.now(),
				items: [],
				isAiDraft: false,
			},
		});
	},

	// ✅ Add a new item to the meal
	addMealItem: (item: MealItem) => {
		set((state) => ({
			meal: {
				...state.meal,
				items: [...state.meal.items, item],
			},
		}));
	},

	// ✅ Add an empty item to the meal
	addEmptyMealItem: () => {
		const newItem: MealItem = {
			id: crypto.randomUUID(),
			name: "New Item",
			servingSize: 0,
			servingUnit: "g" as Unit,
			amount: 0,
			kcalPerServing: 0,
			carbPerServing_g: 0,
			satFatPerServing_g: 0,
			gi: 0,
			fii: 0,
		};

		set((state) => ({
			meal: {
				...state.meal,
				items: [...state.meal.items, newItem],
			},
		}));
	},

	// Optional: delete by ID instead of index for better reliability
	deleteMealItem: (id: string) => {
		set((state) => ({
			meal: {
				...state.meal,
				items: state.meal.items.filter((item) => item.id !== id),
			},
		}));
	},

	setImage: (image: string | null) => {
		set((state) => ({
			meal: {
				...state.meal,
				image,
			},
		}));
	},

	setName: (name: string) => {
		set((state) => ({
			meal: {
				...state.meal,
				name,
			},
		}));
	},

	setTimestamp: (timestamp: number) => {
		set((state) => ({
			meal: {
				...state.meal,
				timestamp,
			},
		}));
	},
}));
