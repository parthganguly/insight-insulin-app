import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
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

// --------- localStorage photo-quota safety (issue #65) ---------
//
// Full-size base64 camera photos can be hundreds of KB to a few MB each,
// while browser/WebView localStorage quota is only a few MB total. Persisting
// them can make the whole meal store fail to save after a handful of photo
// meals. Policy: meal nutrition/scoring data is always persisted; images are
// kept in memory for the current session but only written to localStorage
// when they are tiny. Nothing is ever sent to or kept on the backend (#49).

const MAX_PERSISTED_IMAGE_CHARS = 24_000; // ~18 KB decoded; camera photos are far larger

export const isPersistableImage = (image: string | null | undefined): boolean => {
	if (!image) return true;
	return image.length <= MAX_PERSISTED_IMAGE_CHARS;
};

const stripUnpersistableImages = (meals: Meal[]): Meal[] => meals.map((meal) => (isPersistableImage(meal.image) ? meal : { ...meal, image: null }));

const stripAllImagesFromPersistedValue = (value: string): string => {
	const parsed = JSON.parse(value) as { state?: { meals?: Meal[] } };
	if (parsed.state?.meals) {
		parsed.state.meals = parsed.state.meals.map((meal) => ({ ...meal, image: null }));
	}
	return JSON.stringify(parsed);
};

// localStorage wrapper: if a write hits the storage quota, retry once with
// every image field stripped so the meal data itself is never lost. If even
// the stripped write fails, keep the meal in memory and warn instead of
// throwing, so saving a meal never crashes the app.
const quotaSafeLocalStorage: StateStorage = {
	getItem: (name) => localStorage.getItem(name),
	setItem: (name, value) => {
		try {
			localStorage.setItem(name, value);
		} catch (quotaError) {
			try {
				localStorage.setItem(name, stripAllImagesFromPersistedValue(value));
				console.warn("Meal store hit the browser storage quota; photos were dropped from saved meals to keep meal data.", quotaError);
			} catch (retryError) {
				console.warn("Meal store could not be written to localStorage even without photos; meals stay available for this session only.", retryError);
			}
		}
	},
	removeItem: (name) => localStorage.removeItem(name),
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
			storage: createJSONStorage(() => quotaSafeLocalStorage),
			// Persist meal data without full-size photos; in-memory state keeps the
			// photo for the current session so the review screen still shows it.
			partialize: (state) => ({ meals: stripUnpersistableImages(state.meals) }),
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
