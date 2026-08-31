import { describe, expect, it } from "vitest";

import { buildCreateMealPayload, MealSaveRequestPayload } from "../api/api";
import { PendingSaveIntent } from "../stores/pendingSaveStore";
import { Meal } from "../types/Meal";
import { Unit } from "../types/MealItem";
import { armMealFlowBypass, consumeMealFlowBypass, decideMealFlowNavigation, doesPendingSaveCoverCurrentDraft } from "./mealFlowGuard";

const meal: Meal = {
	id: "draft-x",
	image: null,
	name: "Breakfast X",
	timestamp: 1,
	items: [{ id: "oats", name: "oats", servingSize: 1, servingUnit: Unit.Servings, amount: 1, kcalPerServing: 200, carbPerServing_g: 30, satFatPerServing_g: 1, gi: 55 }],
};

const request: MealSaveRequestPayload = {
	...buildCreateMealPayload(meal),
	client_request_id: "request-x",
};

const intent: PendingSaveIntent = { draftId: meal.id, request, phase: "inFlight", lastError: null };

describe("B2-2 meal-flow navigation decisions", () => {
	it("allows Confirm → Estimate and Estimate → Adjust without a prompt", () => {
		expect(decideMealFlowNavigation({ fromPath: "/meals/new", toPath: "/meals/estimate", isDirtyDraft: true, hasUnsavedEstimate: false })).toBe("allow");
		expect(decideMealFlowNavigation({ fromPath: "/meals/estimate", toPath: "/meals/new", isDirtyDraft: true, hasUnsavedEstimate: true })).toBe("allow");
	});

	it("prompts once for genuine dirty-draft or unsaved-estimate abandonment", () => {
		expect(decideMealFlowNavigation({ fromPath: "/meals/new", toPath: "/dashboard", isDirtyDraft: true, hasUnsavedEstimate: false })).toBe("prompt-draft");
		expect(decideMealFlowNavigation({ fromPath: "/meals/estimate", toPath: "/meals", isDirtyDraft: false, hasUnsavedEstimate: true })).toBe("prompt-estimate");
	});

	it.each(["inFlight", "ambiguous", "rejected", "conflicted"])("allows leaving when the estimate has a covering %s save intent", () => {
		expect(decideMealFlowNavigation({
			fromPath: "/meals/estimate",
			toPath: "/dashboard",
			isDirtyDraft: true,
			hasUnsavedEstimate: true,
			pendingSaveCoversCurrentDraft: true,
		})).toBe("allow");
	});

	it("does not let an old pending save suppress abandonment protection after a material edit", () => {
		const editedMeal = structuredClone(meal);
		editedMeal.items[0].amount = 2;
		expect(doesPendingSaveCoverCurrentDraft({
			meal: editedMeal,
			estimateDraftId: meal.id,
			saveRequestId: request.client_request_id,
			intent,
		})).toBe(false);
		expect(decideMealFlowNavigation({
			fromPath: "/meals/new",
			toPath: "/dashboard",
			isDirtyDraft: true,
			hasUnsavedEstimate: true,
			pendingSaveCoversCurrentDraft: false,
		})).toBe("prompt-estimate");
	});

	it("consumes a bypass only for its destination", () => {
		armMealFlowBypass("/meals/saved/x");
		expect(consumeMealFlowBypass("/dashboard")).toBe(false);
		expect(consumeMealFlowBypass("/meals/saved/x")).toBe(true);
		expect(consumeMealFlowBypass("/meals/saved/x")).toBe(false);
	});
});
