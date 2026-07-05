import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Meal } from "../types/Meal";
import { fetchMealsFromAPI, mapMealModelingResponseToMeal } from "../api/api";

type MealState = {
	meals: Meal[];
	addMeal: (meal: Meal) => void;
	deleteMeal: (id: string) => void;
	clearMeals: () => void;
	getMealById: (id: string) => Meal | null;
	hydrateFromBackend: (backendMeals: Meal[]) => void;
};

// --------- Zustand Store ---------

export const usePersistentMealStore = create<MealState>()(
	persist(
		(set, get) => ({
			meals: [],
			addMeal: (meal: Meal) => {
				// If a meal with the same id exists, replace it. Otherwise prepend the new meal.
				const existingIndex = get().meals.findIndex((m) => m.id === meal.id);
				if (existingIndex !== -1) {
					const updated = [...get().meals];
					updated[existingIndex] = meal;
					set({ meals: updated });
					return;
				}
				set({ meals: [meal, ...get().meals] });
			},
			deleteMeal: (id: string) => set({ meals: get().meals.filter((m) => m.id !== id) }),
			clearMeals: () => set({ meals: [] }),
			getMealById: (id: string) => get().meals.find((meal) => meal.id === id) || null,
			hydrateFromBackend: (backendMeals: Meal[]) => {
				// Merge policy (private-beta hydration, not account sync):
				// backend is canonical for meals it returns, matched by backend meal id;
				// local-only meals (no matching backend id) are preserved;
				// the locally cached image is kept because the backend does not retain images.
				const localMeals = get().meals;
				const localById = new Map(localMeals.map((meal) => [meal.id, meal]));
				const backendIds = new Set(backendMeals.map((meal) => meal.id));

				const canonicalMeals = backendMeals.map((backendMeal) => {
					const localMeal = localById.get(backendMeal.id);
					return localMeal?.image ? { ...backendMeal, image: localMeal.image } : backendMeal;
				});
				const localOnlyMeals = localMeals.filter((meal) => !backendIds.has(meal.id));

				set({ meals: [...canonicalMeals, ...localOnlyMeals].sort((a, b) => b.timestamp - a.timestamp) });
			},
		}),
		{
			name: "insight-meals", // localStorage key
		}
	)
);

// Pull backend meals into the local persistent cache so a fresh browser shows
// backend-seeded and backend-saved history. Draft state lives in the current-meal
// store and is never part of hydration. Fails soft: on any backend error the
// existing local cache is left untouched.
export const syncMealsFromBackend = async (): Promise<boolean> => {
	try {
		const backendMeals = await fetchMealsFromAPI();
		usePersistentMealStore.getState().hydrateFromBackend(backendMeals.map((backendMeal) => mapMealModelingResponseToMeal(backendMeal)));
		return true;
	} catch (error) {
		console.warn("Skipped meal hydration from backend:", error);
		return false;
	}
};
