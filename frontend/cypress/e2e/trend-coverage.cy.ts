/// <reference types="cypress" />

// 7-Day Logged Meal Trend coverage states (issue #93): no-data shows no
// score (never 0), partial and full coverage are labelled, the retired
// "Chronic Score" name never appears, and identical logged eating shows the
// same per-logged-day value at 1/7 and 7/7 coverage.

import { stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

const seededMeal = syntheticBackendMeal("syn-1", "Synthetic Rice Bowl", 189);

describe("7-Day Logged Meal Trend", () => {
	it("shows the renamed trend with full coverage", () => {
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		visitFresh("/dashboard");

		cy.contains("7-Day Logged Meal Trend").should("be.visible");
		cy.contains("7 of 7 days logged").should("be.visible");
		cy.get("[aria-label*='7-day logged meal trend 15']").should("contain.text", "15");
		cy.get("ion-app").invoke("text").should("not.contain", "Chronic Score");
	});

	it("shows the same trend value at 1-of-7 coverage — only the coverage changes", () => {
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 1, rollingDii: 0.15 } });
		visitFresh("/dashboard");

		cy.contains("1 of 7 days logged").should("be.visible");
		// Identical per-logged-day value as full coverage; the old zero-fill
		// behaviour would have shown 2 here instead of 15.
		cy.get("[aria-label*='7-day logged meal trend 15']").should("exist");
	});

	it("shows a no-data state instead of a zero score when nothing is logged in the window", () => {
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 0, rollingDii: null } });
		visitFresh("/dashboard");

		cy.contains("0 of 7 days logged").should("be.visible");
		cy.contains("No meals logged in the last 7 days, so there is no trend to show yet.").should("be.visible");
		cy.get("[aria-label*='7-day logged meal trend not available']")
			.should("exist")
			.invoke("text")
			.should("contain", "--")
			.and("not.match", /\b0\b/);
	});

	it("exposes coverage and the non-clinical boundary in the accessible description", () => {
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 4, rollingDii: 0.15 } });
		visitFresh("/dashboard");

		cy.get("[aria-label*='7-day logged meal trend 15']")
			.should("have.attr", "aria-label")
			.and("contain", "energy-normalized insulin-demand index")
			.and("contain", "4 of the last 7 days")
			.and("contain", "Days without logged meals are excluded")
			.and("contain", "ring caps at 100 and is a visual guide only")
			.and("contain", "not a measure of insulin resistance or metabolic health");
	});

	it("keeps an above-100 index as a raw uncapped number (the ring alone caps)", () => {
		// A potato-only day (FII 121, a real row in the live dataset) yields an
		// index of 121 — the number must not be capped or called a percentage.
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 7, rollingDii: 1.21 } });
		visitFresh("/dashboard");

		cy.get("[aria-label*='7-day logged meal trend 121']")
			.should("contain.text", "121")
			.and("have.attr", "aria-label")
			.and("contain", "not a percentage and can exceed 100");
	});

	it("never describes the index as total or average daily insulin demand", () => {
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		visitFresh("/dashboard");

		cy.get("ion-app")
			.invoke("text")
			.then((text) => {
				const lowered = text.toLowerCase();
				for (const forbidden of ["estimated insulin demand per logged day", "total daily insulin demand", "average insulin demand per day", "chronic score", "metabolic score"]) {
					expect(lowered, `trend copy must not claim "${forbidden}"`).to.not.contain(forbidden);
				}
			});
	});
});
