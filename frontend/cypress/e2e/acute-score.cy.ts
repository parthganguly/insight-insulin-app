/// <reference types="cypress" />

// Acute-score truth in presentation (issue #93): 100 is an uncalibrated
// internal reference, scores above 100 keep their raw number, and no active
// UI text implies a typical meal, a percentage, or a health risk.

import { assertNoForbiddenPhrases, assertNoHorizontalOverflow, shouldBeRendered, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

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

			// J5 retired the circular meter on this page: the raw, uncapped score
			// now reads directly from the sealed score line instead of a ring.
			cy.contains(`Score: ${score} · above internal reference (100)`).should("be.visible");
			cy.get(".result-score-line").should("contain.text", String(score));
			assertNoForbiddenPhrases();
		});
	}

	it("carries the score's meaning in visible text, with no capped ring to explain away", () => {
		stubBackend({ meals: [syntheticBackendMeal("syn-189", "Synthetic Meal 189", 189)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		openSavedDetail("syn-189", "Synthetic Meal 189");

		// The sealed detail line and scale explainer are the accessible meaning;
		// they are ordinary text, so screen readers and sighted users get the
		// same wording rather than a separate ring-only aria-label.
		shouldBeRendered(".result-score-line", "Score: 189 · above internal reference (100)");
		shouldBeRendered(".result-score-caption", "This score compares estimated meal insulin demand with an internal reference set to 100.");
		shouldBeRendered(".result-score-caption", "It is not a percentage and can exceed 100.");

		// No ring, gauge or capped visual survives on the saved result. The
		// assertion is scoped to this page: the History list still renders the
		// old score circle until J6 retires it, and Ionic keeps that parked
		// page in the DOM behind the result route.
		cy.get(".result-page [role='img'][aria-label*='score']").should("not.exist");
		cy.get(".result-page svg").should("not.exist");
		cy.get(".result-page [aria-label*='the ring caps at 100']").should("not.exist");
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
