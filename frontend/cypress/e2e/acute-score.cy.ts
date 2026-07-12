/// <reference types="cypress" />

// Acute-score truth in presentation (issue #93): 100 is an uncalibrated
// internal reference, scores above 100 keep their raw number, and no active
// UI text implies a typical meal, a percentage, or a health risk.

import { assertNoForbiddenPhrases, assertNoHorizontalOverflow, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

const openSavedDetail = (mealId: string, mealName: string) => {
	visitFresh("/dashboard");
	cy.contains(mealName).click();
	cy.url().should("include", `/meals/saved/${mealId}`);
};

describe("Acute-score presentation", () => {
	it("uses internal-reference wording at exactly 100", () => {
		stubBackend({ meals: [syntheticBackendMeal("syn-100", "Synthetic Reference Meal", 100)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		openSavedDetail("syn-100", "Synthetic Reference Meal");

		cy.contains("Relative insulin-demand score").should("be.visible");
		cy.contains("Score: 100 · internal reference: 100").should("be.visible");
		cy.contains("has not yet been calibrated").should("be.visible");
		cy.contains("It is not a percentage and can exceed 100.").should("be.visible");
		assertNoForbiddenPhrases();
	});

	for (const score of [101, 189, 500, 1580]) {
		it(`keeps the raw number and above-reference wording at ${score}`, () => {
			stubBackend({ meals: [syntheticBackendMeal(`syn-${score}`, `Synthetic Meal ${score}`, score)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
			openSavedDetail(`syn-${score}`, `Synthetic Meal ${score}`);

			cy.contains(`Score: ${score} · above internal reference (100)`).should("be.visible");
			// The ring text shows the raw score, uncapped.
			cy.get(`[aria-label*="Estimated meal insulin demand score ${score}."]`).should("contain.text", String(score));
			assertNoForbiddenPhrases();
		});
	}

	it("exposes an accurate accessible meaning for an above-reference score", () => {
		stubBackend({ meals: [syntheticBackendMeal("syn-189", "Synthetic Meal 189", 189)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		openSavedDetail("syn-189", "Synthetic Meal 189");

		cy.get(
			'[aria-label="Estimated meal insulin demand score 189. This is above the internal reference of 100, which has not yet been calibrated. The score is not a percentage and can exceed 100; the ring caps at 100 and is a visual guide only."]',
		).should("exist");
	});

	for (const [width, height, label] of [
		[390, 844, "mobile-390"],
		[320, 568, "mobile-320"],
	] as Array<[number, number, string]>) {
		it(`keeps the above-reference presentation readable at ${label}`, () => {
			cy.viewport(width, height);
			stubBackend({ meals: [syntheticBackendMeal("syn-1580", "Synthetic Meal 1580", 1580)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
			openSavedDetail("syn-1580", "Synthetic Meal 1580");

			// Presence check: Cypress's visibility algorithm misreads Ionic's
			// fixed-layout scroll container at this width, but the wording and
			// the no-overflow invariant are what this test guards.
			cy.contains("Score: 1580 · above internal reference (100)").should("exist");
			assertNoHorizontalOverflow();
		});
	}
});
