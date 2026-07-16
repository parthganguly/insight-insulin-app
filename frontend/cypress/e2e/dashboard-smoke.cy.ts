/// <reference types="cypress" />

// First-load and failure-handling browser smoke (issue #93). All backend
// calls are intercepted with synthetic data — no live backend, no OpenAI.

import { assertNoForbiddenPhrases, assertNoHorizontalOverflow, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

const VIEWPORTS: Array<[number, number, string]> = [
	[1280, 800, "desktop"],
	[390, 844, "mobile-390"],
	[320, 568, "mobile-320"],
];

describe("Home first load", () => {
	for (const [width, height, label] of VIEWPORTS) {
		it(`renders without crashing and shows the empty state at ${label}`, () => {
			cy.viewport(width, height);
			stubBackend();
			visitFresh("/dashboard");

			// Campaign A empty Home (docs/product/ux/insight-ux-v1.md §5): the
			// honest product promise plus one primary "Check a meal" action.
			cy.contains("Understand and compare the estimated insulin demand of meals.").should("be.visible");
			cy.contains("Check a meal").should("be.visible");
			assertNoHorizontalOverflow();
		});
	}

	it("renders seeded meals with disclaimers visible", () => {
		stubBackend({
			meals: [syntheticBackendMeal("syn-1", "Synthetic Rice Bowl", 189)],
			chronic: { loggedDays: 7, rollingDii: 0.15 },
		});
		visitFresh("/dashboard");

		// Presence checks (Cypress's visibility algorithm misreads Ionic's
		// fixed-layout scroll container for list content).
		cy.contains("Synthetic Rice Bowl").should("exist");
		// Chronic-trend disclaimer is on the Dashboard hero card.
		cy.contains("It is not a measure of insulin resistance or metabolic health.").should("exist");
		assertNoForbiddenPhrases();
	});
});

describe("Failure handling", () => {
	it("does not blank-crash when the meals fetch fails", () => {
		stubBackend({ mealsFail: true });
		visitFresh("/dashboard");

		// With nothing hydrated, Home falls back to the empty state.
		cy.contains("Understand and compare the estimated insulin demand of meals.").should("be.visible");
		cy.contains("Check a meal").should("be.visible");
	});

	it("shows the trend failure state, not internal text, when the chronic fetch fails", () => {
		stubBackend({
			meals: [syntheticBackendMeal("syn-1", "Synthetic Rice Bowl", 189)],
			chronicFail: true,
		});
		visitFresh("/dashboard");

		cy.contains("7-Day Logged Meal Trend").should("be.visible");
		// The sanitized backend detail is the most the UI may show; injected
		// internals (paths, keys, stack traces) must never appear.
		cy.contains("Internal server error").should("be.visible");
		cy.get("ion-app").invoke("text").should("not.contain", "Traceback");
		cy.get("ion-app").invoke("text").should("not.contain", "sk-");
	});
});
