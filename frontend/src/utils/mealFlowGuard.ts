import { Meal } from "../types/Meal";

export const MEAL_FLOW_PATHS = ["/meals/new", "/meals/new/ai", "/meals/estimate"] as const;

export const isInternalMealFlowPath = (pathname: string): boolean =>
	MEAL_FLOW_PATHS.some((path) => pathname === path);

export type MealFlowNavigationDecision = "allow" | "prompt-draft" | "prompt-estimate";

export const decideMealFlowNavigation = ({
	fromPath,
	toPath,
	isDirtyDraft,
	hasUnsavedEstimate,
	hasPendingSaveIntent = false,
}: {
	fromPath: string;
	toPath: string;
	isDirtyDraft: boolean;
	hasUnsavedEstimate: boolean;
	hasPendingSaveIntent?: boolean;
}): MealFlowNavigationDecision => {
	if (isInternalMealFlowPath(fromPath) && isInternalMealFlowPath(toPath)) return "allow";
	if (!isInternalMealFlowPath(fromPath)) return "allow";
	if (hasPendingSaveIntent) return "allow";
	if (hasUnsavedEstimate) return "prompt-estimate";
	if (isDirtyDraft) return "prompt-draft";
	return "allow";
};

export const getDraftFingerprint = (meal: Meal): string => JSON.stringify({
	image: meal.image,
	name: meal.name,
	items: meal.items,
	isAiDraft: meal.isAiDraft,
	estimate: meal.estimate,
	calorieSource: meal.calorie_source,
});

let expectedBypassDestination: string | null = null;

export const armMealFlowBypass = (destination: string): void => {
	expectedBypassDestination = destination;
};

export const consumeMealFlowBypass = (destination: string): boolean => {
	if (expectedBypassDestination !== destination) return false;
	expectedBypassDestination = null;
	return true;
};

export const clearMealFlowBypassForTests = (): void => {
	expectedBypassDestination = null;
};
