/// <reference types="cypress" />

// Saved-meal detail (issues #89/#93): Dashboard Recents opens the canonical
// read-only record with score and evidence, offers no duplicate save
// control, and deletion stays backend-first and safe.

import { shouldBeRendered, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

const seededMeal = syntheticBackendMeal("syn-1", "Synthetic Rice Bowl", 189);

describe("Saved-meal detail", () => {
	beforeEach(() => {
		stubBackend({ meals: [seededMeal], chronic: { loggedDays: 7, rollingDii: 0.15 } });
		visitFresh("/dashboard");
		cy.contains("Synthetic Rice Bowl").click();
		cy.url().should("include", "/meals/saved/syn-1");
	});

	it("shows the canonical score, quality, drivers, and per-item evidence", () => {
		// shouldBeRendered asserts the element is actually laid out and painted
		// (non-empty text, non-zero box, not hidden) — a real rendering guard
		// that does not rely on Cypress's `be.visible` heuristic, which reports
		// false negatives inside Ionic's fixed-layout scroll container.
		// J5 made the meal name the page heading and replaced the driver chips
		// with an inline drivers line; the values themselves are unchanged.
		shouldBeRendered("span", "Saved to history");
		shouldBeRendered("h1", "Synthetic Rice Bowl");
		shouldBeRendered("p", "Score: 189 · above internal reference (100)");
		shouldBeRendered("span", "Data quality: High");
		shouldBeRendered(".result-driver", "steamed rice");
		shouldBeRendered(".result-evidence-why", "Used a direct Food Insulin Index match and scaled it by eaten energy.");

		// Per-item FII/source evidence lives behind the collapsed "Advanced
		// details" disclosure (UX v1 §10) — closed by default, rendered once
		// opened, with the same helper-produced source wording as before.
		cy.contains("p", "Source: Direct FII match").should("not.be.visible");
		cy.contains("summary", "Advanced details").click();
		shouldBeRendered("p", "Source: Direct FII match");
	});

	it("offers no save control and no editable inputs", () => {
		cy.get("[aria-label='Save meal']").should("not.exist");
		cy.get("[aria-label='Add meal item']").should("not.exist");
		cy.get("ion-content input").should("not.exist");
	});

	it("deletes backend-first after confirmation and removes the meal", () => {
		cy.intercept("DELETE", "**/meals/syn-1", { statusCode: 204, body: null }).as("deleteMeal");

		cy.get(".result-delete-button").click();
		cy.get("ion-alert").should("contain.text", "Delete saved meal?");
		cy.get("ion-alert button").contains("Delete").click();
		cy.wait("@deleteMeal");

		cy.url().should("not.include", "/meals/saved/");
		cy.contains("Synthetic Rice Bowl").should("not.exist");
	});

	it("keeps the meal when deletion is cancelled", () => {
		cy.get(".result-delete-button").click();
		cy.contains("ion-alert button", "Cancel").click();

		// Still on the detail page with the saved record intact.
		cy.url().should("include", "/meals/saved/syn-1");
		cy.contains("Saved to history").should("exist");
		cy.get(".result-delete-button").should("exist");
	});

	it("keeps the meal and reports failure when the backend delete fails", () => {
		cy.intercept("DELETE", "**/meals/syn-1", { statusCode: 500, body: { detail: "Internal server error" } }).as("deleteFail");

		cy.get(".result-delete-button").click();
		cy.contains("ion-alert button", "Delete").click();
		cy.wait("@deleteFail");

		cy.contains("Couldn't delete this meal, so it is still saved.").should("exist");
		// Still on the detail page; the saved record was not removed.
		cy.url().should("include", "/meals/saved/syn-1");
		cy.contains("Saved to history").should("exist");
	});
});
