/// <reference types="cypress" />

// 7-Day Logged Meal Trend coverage states (issue #93, Campaign A §5): below
// 3 logged days Home shows the building-history line instead of a ring (so
// no zero ever reads as a score), at or above the gate coverage is labelled
// and identical logged eating shows the same per-logged-day value at 3/7 and
// 7/7 coverage, and the retired "Chronic Score" name never appears.

import { BACKEND_ORIGIN, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

const seededMeal = syntheticBackendMeal("syn-1", "Synthetic Rice Bowl", 189);

describe("7-Day Logged Meal Trend", () => {
	it("shows the renamed trend with full coverage", () => {
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		visitFresh("/dashboard");

		cy.contains("7 of 7 days logged").should("be.visible");
		cy.get("[aria-label*='7-day logged meal trend 15']").should("contain.text", "15");
		cy.get(".home-trend-sentence").should("contain.text", "7-day index 15");
		cy.get(".hero-ring,.hero-bezel,.CircularProgressbar").should("not.exist");
		cy.get("ion-app").invoke("text").should("not.contain", "Chronic Score");
	});

	it("shows the same trend value at 3-of-7 coverage — only the coverage changes", () => {
		// 3 logged days is the Campaign A display gate (UX v1 §5); at and above
		// it the existing trend card renders unchanged. Identical per-logged-day
		// value as full coverage; the old zero-fill behaviour would have shown a
		// diluted number here instead of 15.
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 3, rollingDii: 0.15 } });
		visitFresh("/dashboard");

		cy.contains("3 of 7 days logged").should("be.visible");
		cy.get("[aria-label*='7-day logged meal trend 15']").should("exist");
	});

	it("replaces the ring with the building-history line below 3 logged days", () => {
		// Campaign A (UX v1 §5): below the 3-logged-day threshold Home shows a
		// compact coverage line instead of a low-coverage ring. Trend maths and
		// the trendDisplay helper copy are untouched — this is display gating on
		// the existing logged_days_last_7 coverage field only.
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 1, rollingDii: 0.15 } });
		visitFresh("/dashboard");

		cy.contains("Your 7-day trend appears after you log meals on 3 different days (1 of 3 so far).").should("be.visible");
		cy.get("[aria-label*='7-day logged meal trend']").should("not.exist");
	});

	it("shows the building-history line, not a zero score, when nothing is logged in the window", () => {
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 0, rollingDii: null } });
		visitFresh("/dashboard");

		cy.contains("Your 7-day trend appears after you log meals on 3 different days (0 of 3 so far).").should("be.visible");
		// The building-history line states a logged-day count, never a score —
		// no trend ring renders below the coverage threshold, so no bare "0"
		// can read as a score.
		cy.get("[aria-label*='7-day logged meal trend']").should("not.exist");
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

	// The three absent-value states must stay distinct to a screen reader: a
	// pending or failed request knows nothing about whether meals were logged.
	it("announces loading and failure without falsely claiming no meals were logged", () => {
		// Failure: uses the existing chronicFail interception.
		stubBackend({ meals: [seededMeal], chronicFail: true });
		visitFresh("/dashboard");
		cy.get("[aria-label*='7-day logged meal trend unavailable']")
			.should("have.attr", "aria-label", "7-day logged meal trend unavailable because the data could not be loaded.")
			.and("not.contain", "no meals");

		// Loading: hold the response open so the in-flight state is observable.
		cy.intercept("GET", `${BACKEND_ORIGIN}/metrics/chronic*`, (req) => {
			req.on("response", (res) => res.setDelay(4000));
		}).as("slowChronic");
		visitFresh("/dashboard");
		cy.get("[aria-label='7-day logged meal trend loading.']").should("exist").and("not.contain", "no meals");
	});

	it("announces a confirmed zero-logged-days response distinctly from loading and failure", () => {
		// A confirmed zero-coverage response gets the honest building-history
		// announcement (role="status"), never the loading or unavailable text —
		// only a successful response may claim that no days were logged.
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 0, rollingDii: null } });
		visitFresh("/dashboard");

		cy.get("[role='status']")
			.should("contain.text", "Your 7-day trend appears after you log meals on 3 different days (0 of 3 so far).")
			.invoke("text")
			.should("not.contain", "unavailable")
			.and("not.contain", "Loading");
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
