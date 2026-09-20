/// <reference types="cypress" />

/**
 * R3B genuine OFF-backend pairing: the SAME enabled bundle
 * (VITE_REFERENCE_PREVIEW=1) against the REAL production app with the
 * reference router unmounted (no INSIGHT_REFERENCE_PREVIEW flag).
 *
 * No fault injection here: catalog/preview/detail answers are the backend's
 * own generic FastAPI 404s. Run it with `frontend/cypress.config.r3b.ts`
 * overridden to this spec, against:
 *   backend  real main:app WITHOUT the flag, temp working dir  (port 8099)
 *   frontend vite preview --port 5199                          (enabled bundle)
 *
 * The isolated synthetic in-suite equivalent (injected 404) lives in
 * r3b-reference-enabled.cy.ts as T9a and is labeled fault simulation there.
 */

const HARNESS = Cypress.env("harnessOrigin") ?? "http://127.0.0.1:8099";

describe("R3B enabled frontend against an actual OFF backend", () => {
	it("T9 — fails closed with no legacy fallback and no reference traffic", () => {
		// The router is really unmounted: prove it at the HTTP layer first.
		cy.request({ url: `${HARNESS}/reference-meals/catalog`, failOnStatusCode: false }).then((response) => {
			expect(response.status, "reference router unmounted").to.eq(404);
			expect(response.body).to.deep.eq({ detail: "Not Found" });
		});

		// Legacy escape hatches must never fire, even when reference calls fail.
		let legacyCalls = 0;
		cy.intercept("POST", `${HARNESS}/meals`, () => {
			legacyCalls += 1;
			throw new Error("reference mode must never fall back to the legacy save route");
		});
		cy.intercept("POST", `${HARNESS}/meals/preview`, () => {
			legacyCalls += 1;
			throw new Error("reference mode must never fall back to the legacy preview route");
		});
		let referenceCalls = 0;
		cy.intercept({ method: "POST", url: `${HARNESS}/reference-meals*` }, (req) => {
			referenceCalls += 1;
			req.continue();
		});

		cy.clearLocalStorage();
		cy.clearAllSessionStorage();
		cy.visit("/log-meal");
		cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
		cy.location("pathname").should("eq", "/meals/new");
		// The genuine unavailable-router state renders its honest copy.
		cy.contains("The published reference catalog isn't available right now", { timeout: 15000 }).should("exist");
		cy.get(".reference-draft-item").first().contains("ion-button", "Choose a published reference").should("have.class", "button-disabled");
		// No legacy headline flashes anywhere in this state.
		cy.get("ion-app").invoke("text").should("not.match", /Relative score|7-day index/);
		cy.wait(1000).then(() => {
			expect(legacyCalls, "no legacy fallback route is ever called").to.eq(0);
			expect(referenceCalls, "no reference evaluation is attempted without a catalog").to.eq(0);
		});
	});
});
