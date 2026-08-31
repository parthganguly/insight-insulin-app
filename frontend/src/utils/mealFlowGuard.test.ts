import { describe, expect, it } from "vitest";

import { armMealFlowBypass, consumeMealFlowBypass, decideMealFlowNavigation } from "./mealFlowGuard";

describe("B2-2 meal-flow navigation decisions", () => {
	it("allows Confirm → Estimate and Estimate → Adjust without a prompt", () => {
		expect(decideMealFlowNavigation({ fromPath: "/meals/new", toPath: "/meals/estimate", isDirtyDraft: true, hasUnsavedEstimate: false })).toBe("allow");
		expect(decideMealFlowNavigation({ fromPath: "/meals/estimate", toPath: "/meals/new", isDirtyDraft: true, hasUnsavedEstimate: true })).toBe("allow");
	});

	it("prompts once for genuine dirty-draft or unsaved-estimate abandonment", () => {
		expect(decideMealFlowNavigation({ fromPath: "/meals/new", toPath: "/dashboard", isDirtyDraft: true, hasUnsavedEstimate: false })).toBe("prompt-draft");
		expect(decideMealFlowNavigation({ fromPath: "/meals/estimate", toPath: "/meals", isDirtyDraft: false, hasUnsavedEstimate: true })).toBe("prompt-estimate");
	});

	it.each(["inFlight", "ambiguous", "rejected", "conflicted"])("allows leaving when the estimate has a keyed %s save intent", () => {
		expect(decideMealFlowNavigation({
			fromPath: "/meals/estimate",
			toPath: "/dashboard",
			isDirtyDraft: true,
			hasUnsavedEstimate: true,
			hasPendingSaveIntent: true,
		})).toBe("allow");
	});

	it("consumes a bypass only for its destination", () => {
		armMealFlowBypass("/meals/saved/x");
		expect(consumeMealFlowBypass("/dashboard")).toBe(false);
		expect(consumeMealFlowBypass("/meals/saved/x")).toBe(true);
		expect(consumeMealFlowBypass("/meals/saved/x")).toBe(false);
	});
});
