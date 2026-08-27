/// <reference types="cypress" />

// Saved-result acute-score truth in presentation (issues #93/#125): the raw
// value remains visible, reference 100 is confined to deep disclosure, and no
// active UI interprets magnitude as a category, target, or biological result.

import { assertNoForbiddenPhrases, assertNoHorizontalOverflow, shouldBeRendered, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

const openSavedDetail = (mealId: string, mealName: string) => {
	visitFresh("/dashboard");
	cy.contains(mealName).click();
	cy.url().should("include", `/meals/saved/${mealId}`);
};

describe("Acute-score presentation", () => {
	it("does not make exactly 100 special on the primary result", () => {
		stubBackend({ meals: [syntheticBackendMeal("syn-100", "Synthetic Reference Meal", 100)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		openSavedDetail("syn-100", "Synthetic Reference Meal");

		cy.contains("Estimated meal insulin demand").should("be.visible");

		// The sealed score block sits below the scroll fold at Cypress's desktop
		// viewport, and Ionic sets `position: fixed` on <body>, so Cypress
		// applies its "covered by another element" check to every element and
		// reports whatever paints at the centre point — the tab bar once the
		// block is off-screen. `be.visible` therefore measures viewport
		// occlusion in a scrollable mobile shell rather than the product
		// guarantee. `shouldBeRendered` checks more of what matters: non-empty
		// text, a real painted box, and no display/visibility/opacity hiding.
		// This is the same treatment the ring-removal case below already uses
		// for these two elements.
		shouldBeRendered(".result-score-line", "Relative score: 100");
		shouldBeRendered(".result-score-caption", "Not a percentage, target, health category, bodily measurement, or prediction of your body’s response.");
		cy.get(".result-score").should("not.contain.text", "reference");
		cy.get("details.result-score-method").should("not.have.attr", "open");
		assertNoForbiddenPhrases();
	});

	for (const score of [101, 189, 500, 1580]) {
		it(`keeps the raw number with neutral semantics at ${score}`, () => {
			stubBackend({ meals: [syntheticBackendMeal(`syn-${score}`, `Synthetic Meal ${score}`, score)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
			openSavedDetail(`syn-${score}`, `Synthetic Meal ${score}`);

			// The raw, uncapped score reads directly from the neutral score line.
			// Rendered-check for the same below-the-fold reason as above; these
			// cases only passed by the accident of a shorter meal name leaving
			// the block a few pixels higher in the layout.
			shouldBeRendered(".result-score-line", `Relative score: ${score}`);
			cy.get(".result-score-line").should("contain.text", String(score));
			cy.get(".result-score").should("not.contain.text", "reference").and("not.contain.text", "above");
			assertNoForbiddenPhrases();
		});
	}

	it("carries the score's meaning in visible text, with no capped ring to explain away", () => {
		stubBackend({ meals: [syntheticBackendMeal("syn-189", "Synthetic Meal 189", 189)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		openSavedDetail("syn-189", "Synthetic Meal 189");

		shouldBeRendered(".result-score-line", "Relative score: 189");
		shouldBeRendered(".result-score-caption", "Not a percentage, target, health category, bodily measurement, or prediction of your body’s response.");
		cy.get(".result-score")
			.should("have.attr", "role", "group")
			.and("have.attr", "aria-label", "Relative model score 189. Not a percentage, target, health category, bodily measurement, or prediction of your body’s response.");

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
		it(`keeps the neutral relative-score presentation readable at ${label}`, () => {
			cy.viewport(width, height);
			stubBackend({ meals: [syntheticBackendMeal("syn-1580", "Synthetic Meal 1580", 1580)], chronic: { loggedDays: 7, rollingDii: 0.15 } });
			openSavedDetail("syn-1580", "Synthetic Meal 1580");

			// Presence check: Cypress's visibility algorithm misreads Ionic's
			// fixed-layout scroll container at this width, but the wording and
			// the no-overflow invariant are what this test guards.
			cy.contains("Relative score: 1580").should("exist");
			cy.get(".result-score").should("not.contain.text", "reference");
			assertNoHorizontalOverflow();
		});
	}
});
