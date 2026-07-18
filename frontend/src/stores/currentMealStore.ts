import { create } from "zustand";
import { Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";
import type { Unit } from "../types/MealItem";
import { updateMealItemFii } from "../utils/fiiTrustBoundary";

export const REVIEW_RESOLVING_NUTRITION_FIELDS = [
	"kcalPerServing",
	"carbPerServing_g",
	"proteinPerServing_g",
	"fatPerServing_g",
	"satFatPerServing_g",
	"gi",
] as const satisfies readonly (keyof MealItem)[];

const reviewResolvingNutritionFields = new Set<keyof MealItem>(REVIEW_RESOLVING_NUTRITION_FIELDS);

const markAiProposalReviewed = (item: MealItem): MealItem =>
	item.draftProvenance === "ai_proposed" ? { ...item, draftProvenance: "user_reviewed" } : item;

export const updateDraftMealItem = (item: MealItem, field: keyof MealItem, value: unknown): MealItem => {
	const nextValue = field === "fii"
		? updateMealItemFii(item, value).fii
		: value;

	if (Object.is(item[field], nextValue)) return item;

	if (field === "name") {
		const renamedItem = markAiProposalReviewed({
			...item,
			name: String(value),
			needsReview: item.needsReview ?? { previousName: item.name },
		});
		delete renamedItem.fii;
		delete renamedItem.source;
		delete renamedItem.why;
		return renamedItem;
	}

	let updatedItem = field === "fii"
		? updateMealItemFii(item, value)
		: { ...item, [field]: value } as MealItem;
	updatedItem = markAiProposalReviewed(updatedItem);

	if (reviewResolvingNutritionFields.has(field)) {
		const resolvedItem = { ...updatedItem };
		delete resolvedItem.needsReview;
		return resolvedItem;
	}

	return updatedItem;
};

type CurrentMealStore = {
	meal: Meal;
	setMeal: (meal: Meal) => void;
	resetMeal: () => void;
	addMealItem: (item: MealItem) => void;
	addEmptyMealItem: () => void;
	updateMealItem: (id: string, field: keyof MealItem, value: unknown) => void;
	confirmMealItemReview: (id: string) => void;
	deleteMealItem: (id: string) => void;
	setNewMealId: () => void; // Generates a new ID for the meal
	setImage: (image: string | null) => void;
	setName: (name: string) => void;
	setTimestamp: (timestamp: number) => void;
};

export const useCurrentMealStore = create<CurrentMealStore>((set) => ({
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
			draftProvenance: "user_entered",
		};

		set((state) => ({
			meal: {
				...state.meal,
				items: [...state.meal.items, newItem],
			},
		}));
	},

	updateMealItem: (id: string, field: keyof MealItem, value: unknown) => {
		set((state) => ({
			meal: {
				...state.meal,
				items: state.meal.items.map((item) => item.id === id ? updateDraftMealItem(item, field, value) : item),
			},
		}));
	},

	confirmMealItemReview: (id: string) => {
		set((state) => ({
			meal: {
				...state.meal,
				items: state.meal.items.map((item) => {
					if (item.id !== id || !item.needsReview) return item;
					const confirmedItem = { ...markAiProposalReviewed(item) };
					delete confirmedItem.needsReview;
					return confirmedItem;
				}),
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
