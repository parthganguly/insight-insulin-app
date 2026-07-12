/// <reference types="cypress" />

// Manual meal draft flow (issue #93): the draft opens editable, invalid
// saves are rejected with visible feedback, and a valid synthetic save posts
// to the (intercepted) backend and shows the canonical scored result.

import { BACKEND_ORIGIN, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

const savedResponse = syntheticBackendMeal("syn-saved-1", "Synthetic Manual Meal", 42, {
	items: [
		{
			name: "plain yogurt",
			quantity: 2,
			unit: "serving",
			kcalPerUnit: 100,
			carb_g: 8,
			satFat_g: 1,
			gi: 35,
			kcal_item: 200,
			insulin_load: 12.6,
			confidence: 0.7,
			fii_source: "exact_fii",
			why: "Used a direct Food Insulin Index match and scaled it by eaten energy.",
		},
	],
});

// FAB buttons sit in Ionic's fixed overlay layer, which Cypress's
// actionability check misreads as covered; the follow-up banner/text
// assertions verify the click actually worked.
const clickFab = (ariaLabel: string) => cy.get(`[aria-label='${ariaLabel}']`).first().click({ force: true });

const addManualItem = () => {
	cy.get("#open-meal-item-action-sheet").click();
	// Wait for the sheet to actually present, then click the button element
	// itself (its inner span has pointer-events: none by Ionic design).
	cy.get("ion-action-sheet:not(.overlay-hidden)").should("exist");
	cy.get("ion-action-sheet:not(.overlay-hidden)").contains("button.action-sheet-button", "Manual").click();
	cy.contains("Draft item — tap to add food details").should("exist");
};

const setItemPortion = (amount: string, kcal: string) => {
	cy.contains("Draft item — tap to add food details").click({ force: true });
	cy.contains("Edit: New Item").should("exist");
	cy.contains("ion-input", "Amount").find("input").first().clear().type(amount);
	cy.contains("ion-input", "kcals per serving").find("input").first().clear().type(kcal);
	// Ionic reflects aria-label onto the shadow button too; click one node.
	cy.get("[aria-label='Done editing item']").first().click({ force: true });
	cy.get("ion-modal.show-modal").should("not.exist");
};

const saveMeal = () => {
	clickFab("Meal actions");
	clickFab("Save meal");
};

describe("Manual meal draft", () => {
	beforeEach(() => {
		stubBackend();
		visitFresh("/meals");
		// FAB on the Meals tab starts a fresh editable draft.
		cy.get("ion-fab-button").first().click({ force: true });
		cy.url().should("include", "/meals/new");
	});

	it("opens as an editable draft", () => {
		cy.contains("Editable draft — not saved yet").should("exist");
		cy.contains("This meal is an editable draft").should("exist");
		cy.get("input").should("exist"); // the dish-name input is editable
	});

	it("rejects saving an empty draft with visible feedback", () => {
		saveMeal();

		cy.get(".save-feedback-banner").should("contain.text", "This meal is still empty. Tap + to add at least one item, then save.");
	});

	it("rejects an item without a positive amount", () => {
		addManualItem();

		// Invalid: the fresh item has amount 0.
		saveMeal();
		cy.get(".save-feedback-banner").should("contain.text", "needs an amount greater than 0");
	});

	it("saves a valid synthetic meal and shows the canonical scored result", () => {
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, { statusCode: 200, body: savedResponse }).as("saveMeal");

		addManualItem();
		setItemPortion("2", "100");

		// Valid save posts to the backend and shows the canonical result.
		saveMeal();
		cy.wait("@saveMeal");

		cy.get(".save-feedback-banner").should("contain.text", "Meal saved to your history");
		cy.contains("Saved to history").should("exist");
		cy.contains("Score: 42 · internal reference: 100").should("exist");
	});

	it("shows the sanitized backend error without leaking internals when the save fails", () => {
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, { statusCode: 500, body: { detail: "Internal server error" } }).as("saveMealFail");

		addManualItem();
		setItemPortion("1", "100");
		saveMeal();
		cy.wait("@saveMealFail");

		cy.get(".save-feedback-banner").should("contain.text", "Internal server error");
		cy.get("ion-app").invoke("text").should("not.contain", "Traceback");
	});
});
