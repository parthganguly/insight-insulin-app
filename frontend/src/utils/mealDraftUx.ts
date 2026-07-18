import { Meal } from "../types/Meal";
import { MealItem } from "../types/MealItem";
import { calculateTotalItemCalories, calculateTotalItemCarbohydrates, calculateTotalItemSaturatedFat } from "../utils";

// Manual meal draft/save UX helpers (issue #75). Presentation and copy only:
// the rejection conditions in validateMealBeforeSave are the same ones the
// review screen has always enforced — an empty meal, an unnamed item, or a
// non-positive quantity is rejected. Only the wording is friendlier.

export const DRAFT_MEAL_STATUS = "Editable draft — not saved yet";
export const SAVED_MEAL_STATUS = "Saved to history";
export const DRAFT_ITEM_ROW_HINT = "Draft item — tap to add food details";
export const ITEM_LIST_EDIT_HELPER = "Tap any item to edit its name, portion, and nutrition.";
export const ADVANCED_DETAILS_LABEL = "Advanced details";
export const MEAL_NAME_HELPER = "The name is a label. The items below are what the estimate uses.";
export const AI_PROVENANCE_COPY = "Suggested from your photo";
export const REUSE_PROVENANCE_COPY = "Copied from your saved meal — adjust anything that's different today.";

export const getDraftProvenanceCopy = (item: MealItem, isReusedDraft: boolean): string | null => {
	if (item.draftProvenance === "ai_proposed") return AI_PROVENANCE_COPY;
	if (isReusedDraft && item.draftProvenance === "user_entered") return REUSE_PROVENANCE_COPY;
	if (item.draftProvenance === "user_reviewed") return "Reviewed by you";
	if (item.draftProvenance === "user_entered") return "Entered by you";
	return null;
};

export const getSaveSuccessMessage = (photoKept: boolean): string =>
	photoKept
		? "Meal saved to your history. Its estimated insulin demand is shown above."
		: "Meal saved to your history. Its estimated insulin demand is shown above. The photo was not kept on this device, to save storage.";

// A draft item is one the user has not filled in yet: every nutrition total
// is still zero. Same condition the review screen previously checked inline.
export const isDraftMealItem = (item: MealItem): boolean =>
	calculateTotalItemCalories(item) === 0 && calculateTotalItemCarbohydrates(item) === 0 && calculateTotalItemSaturatedFat(item) === 0;

const describeItem = (item: MealItem, index: number): string => (item.name?.trim() ? `“${item.name.trim()}”` : `Item ${index + 1}`);

export const validateMealBeforeSave = (draftMeal: Meal): string | null => {
	if (draftMeal.items.length === 0) {
		return "This meal is still empty. Tap + to add at least one item, then save.";
	}

	const unresolvedItems = draftMeal.items.filter((item) => item.needsReview);
	if (unresolvedItems.length > 0) {
		const affected = unresolvedItems.map((item, index) => describeItem(item, index)).join(unresolvedItems.length === 2 ? " and " : ", ");
		return `Review the carried nutrition for ${affected} before calculating and saving. Edit a nutrition value or choose “These still fit”.`;
	}

	for (let i = 0; i < draftMeal.items.length; i += 1) {
		const item = draftMeal.items[i];
		if (!item.name?.trim()) {
			return `Item ${i + 1} still needs a name. Tap the item to add one.`;
		}

		const quantity = Number(item.amount);
		if (!Number.isFinite(quantity) || quantity <= 0) {
			return `${describeItem(item, i)} needs an amount greater than 0. Tap the item to set its portion.`;
		}
	}

	return null;
};
