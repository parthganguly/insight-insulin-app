import { create } from "zustand";
import { EditableMeal, Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";
import type { Unit } from "../types/MealItem";
import type { ReferenceDraft, ReferenceDraftItem } from "../types/experimentalReference";
import { updateMealItemFii } from "../utils/fiiTrustBoundary";
import {
	clearReferenceItemNutrition,
	confirmReferenceItemBasis,
	createEmptyReferenceItem,
	createReferenceDraft,
	isReferenceDraft,
	markSelectionsNeedingReview,
	selectReferenceSource,
	updateReferenceDraftItem,
} from "../utils/referenceDraft";

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

const emptyLegacyMeal = (): Meal => ({
	id: crypto.randomUUID(),
	image: null,
	name: "New Meal",
	timestamp: Date.now(),
	items: [],
	isAiDraft: false,
});

type CurrentMealStore = {
	meal: EditableMeal;
	/**
	 * Monotonic revisions owned here (freeze §C). Every material input,
	 * review or ordering change increments both; a title, time or photo change
	 * increments only the edit revision. A pure no-op setter increments
	 * neither, and UI picker search/open state is not an edit at all.
	 */
	materialRevision: number;
	editRevision: number;
	setMeal: (meal: EditableMeal) => void;
	resetMeal: () => void;
	/** Starts a fresh draft under the given contract with a new draft ID. */
	resetMealAs: (contract: "legacy" | "reference") => void;
	addMealItem: (item: MealItem) => void;
	addEmptyMealItem: () => void;
	updateMealItem: (id: string, field: keyof MealItem, value: unknown) => void;
	confirmMealItemReview: (id: string) => void;
	deleteMealItem: (id: string) => void;
	setNewMealId: () => void; // Generates a new ID for the meal
	setImage: (image: string | null) => void;
	setName: (name: string) => void;
	setTimestamp: (timestamp: number) => void;

	// Reference branch. Every action routes through the same shared mutation
	// path, so revision and ownership rules cannot diverge per caller.
	addEmptyReferenceItem: () => void;
	addReferenceItem: (item: ReferenceDraftItem) => void;
	updateReferenceItem: (id: string, field: string, value: unknown) => void;
	confirmReferenceBasis: (id: string) => void;
	clearReferenceNutrition: (id: string) => void;
	selectReferenceItemSource: (id: string, sourceId: string | null, catalogVersion: string) => void;
	deleteReferenceItem: (id: string) => void;
	setReviewedCatalogVersion: (catalogVersion: string | null) => void;
	markReferenceSelectionsNeedingReview: () => void;
};

/**
 * Reads the current draft as a legacy Meal. Callers that only support the
 * legacy contract use this instead of casting, so a reference draft surfaces
 * as a loud failure rather than a zero-filled projection.
 */
export const getLegacyCurrentMeal = (): Meal => {
	const meal = useCurrentMealStore.getState().meal;
	if (isReferenceDraft(meal)) throw new Error("The current draft uses the reference contract, not the legacy Meal contract");
	return meal;
};

export const useCurrentMealStore = create<CurrentMealStore>((set, get) => {
	// One shared mutation path for the editor, quick portion control, AI
	// import, reuse and restored drafts.
	const commit = (next: EditableMeal | null, material: boolean) => {
		if (next === null || next === get().meal) return;
		set((state) => ({
			meal: next,
			materialRevision: state.materialRevision + (material ? 1 : 0),
			editRevision: state.editRevision + 1,
		}));
	};

	const mapReferenceItems = (id: string, change: (item: ReferenceDraftItem) => ReferenceDraftItem): ReferenceDraft | null => {
		const meal = get().meal;
		if (!isReferenceDraft(meal)) return null;
		let changed = false;
		const items = meal.items.map((item) => {
			if (item.id !== id) return item;
			const next = change(item);
			if (next !== item) changed = true;
			return next;
		});
		return changed ? { ...meal, items } : null;
	};

	const legacyMeal = (): Meal | null => {
		const meal = get().meal;
		return isReferenceDraft(meal) ? null : meal;
	};

	return {
		meal: emptyLegacyMeal(),
		materialRevision: 0,
		editRevision: 0,

		setMeal: (meal: EditableMeal) => commit(meal, true),

		setNewMealId: () => {
			const meal = get().meal;
			commit({ ...meal, id: crypto.randomUUID() } as EditableMeal, true);
		},

		resetMeal: () => get().resetMealAs(isReferenceDraft(get().meal) ? "reference" : "legacy"),

		resetMealAs: (contract) => commit(contract === "reference" ? createReferenceDraft() : emptyLegacyMeal(), true),

		addMealItem: (item: MealItem) => {
			const meal = legacyMeal();
			if (!meal) return;
			commit({ ...meal, items: [...meal.items, item] }, true);
		},

		addEmptyMealItem: () => {
			const meal = legacyMeal();
			if (!meal) return;
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
			commit({ ...meal, items: [...meal.items, newItem] }, true);
		},

		updateMealItem: (id: string, field: keyof MealItem, value: unknown) => {
			const meal = legacyMeal();
			if (!meal) return;
			let changed = false;
			const items = meal.items.map((item) => {
				if (item.id !== id) return item;
				const next = updateDraftMealItem(item, field, value);
				if (next !== item) changed = true;
				return next;
			});
			if (changed) commit({ ...meal, items }, true);
		},

		confirmMealItemReview: (id: string) => {
			const meal = legacyMeal();
			if (!meal) return;
			let changed = false;
			const items = meal.items.map((item) => {
				if (item.id !== id || !item.needsReview) return item;
				const confirmedItem = { ...markAiProposalReviewed(item) };
				delete confirmedItem.needsReview;
				changed = true;
				return confirmedItem;
			});
			if (changed) commit({ ...meal, items }, true);
		},

		deleteMealItem: (id: string) => {
			const meal = legacyMeal();
			if (!meal) return;
			const items = meal.items.filter((item) => item.id !== id);
			if (items.length !== meal.items.length) commit({ ...meal, items }, true);
		},

		// Title, time and photo are edits, not scientific material.
		setImage: (image: string | null) => {
			const meal = get().meal;
			if (meal.image === image) return;
			commit({ ...meal, image } as EditableMeal, false);
		},

		setName: (name: string) => {
			const meal = get().meal;
			if (meal.name === name) return;
			commit({ ...meal, name } as EditableMeal, false);
		},

		setTimestamp: (timestamp: number) => {
			const meal = get().meal;
			if (meal.timestamp === timestamp) return;
			commit({ ...meal, timestamp } as EditableMeal, false);
		},

		addEmptyReferenceItem: () => get().addReferenceItem(createEmptyReferenceItem()),

		addReferenceItem: (item: ReferenceDraftItem) => {
			const meal = get().meal;
			if (!isReferenceDraft(meal)) return;
			commit({ ...meal, items: [...meal.items, item] }, true);
		},

		updateReferenceItem: (id, field, value) =>
			commit(mapReferenceItems(id, (item) => updateReferenceDraftItem(item, field, value)), true),

		confirmReferenceBasis: (id) => commit(mapReferenceItems(id, confirmReferenceItemBasis), true),

		clearReferenceNutrition: (id) => commit(mapReferenceItems(id, clearReferenceItemNutrition), true),

		selectReferenceItemSource: (id, sourceId, catalogVersion) =>
			commit(mapReferenceItems(id, (item) => selectReferenceSource(item, sourceId, catalogVersion)), true),

		deleteReferenceItem: (id) => {
			const meal = get().meal;
			if (!isReferenceDraft(meal)) return;
			const items = meal.items.filter((item) => item.id !== id);
			if (items.length !== meal.items.length) commit({ ...meal, items }, true);
		},

		setReviewedCatalogVersion: (catalogVersion) => {
			const meal = get().meal;
			if (!isReferenceDraft(meal) || meal.reviewedCatalogVersion === catalogVersion) return;
			commit({ ...meal, reviewedCatalogVersion: catalogVersion }, true);
		},

		markReferenceSelectionsNeedingReview: () => {
			const meal = get().meal;
			if (!isReferenceDraft(meal)) return;
			commit(markSelectionsNeedingReview(meal), true);
		},
	};
});
