/// <reference types="cypress" />

// Manual meal journey (Campaign A, docs/product/ux/insight-ux-v1.md §§7, 9,
// 11): "Enter manually" opens an editable confirmation draft with one item
// ready, invalid saves are rejected with visible feedback, and a valid
// synthetic save posts to the (intercepted) backend and lands on the
// canonical /meals/saved/:id result screen.

import { BACKEND_ORIGIN, shouldBeRendered, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";
import { MEAL_SAVE_FAILURE } from "../../src/utils/mealDraftUx";

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

// The chooser's "Enter manually" option resets the draft and seeds one
// editable item before opening the confirmation screen.
const openManualDraft = () => {
	visitFresh("/log-meal");
	cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
	cy.url().should("include", "/meals/new");
	cy.contains("Draft item — tap to add food details").should("exist");
};

// Types a portion into the item card's inline quick-adjust amount field.
const setInlineAmount = (amount: string) => {
	cy.get(".portion-adjust-row").first().contains("ion-input", "Amount").find("input").first().clear();
	cy.get(".portion-adjust-row").first().contains("ion-input", "Amount").find("input").first().type(amount);
};

// The Calculate & save primary action (aria-label "Save meal") sits in
// Ionic's scroll container, which Cypress's actionability check misreads as
// covered; follow-up assertions verify the click actually worked.
const saveMeal = () => cy.get("[aria-label='Save meal']").first().click({ force: true });

describe("Manual meal draft", () => {
	beforeEach(() => {
		stubBackend();
	});

	it("opens as an editable confirmation draft with one item ready", () => {
		openManualDraft();

		// Real rendering guards (see shouldBeRendered): the draft status must
		// actually be painted, not merely present in the DOM.
		shouldBeRendered("p.confirmation-kicker", "Draft — not saved");
		cy.contains("Did we get your meal right?").should("exist");
		cy.get("[aria-label='Meal components']").should("exist");
		cy.get("input").should("exist"); // the dish-name input is editable
	});

	it("rejects saving an empty draft with visible feedback", () => {
		openManualDraft();

		// Remove the seeded item so the draft is genuinely empty.
		cy.get(".component-edit-button").first().click({ force: true });
		cy.get("ion-modal:not(.overlay-hidden):visible").contains("ion-button", "Remove item").click({ force: true });
		cy.contains("Add something below before calculating and saving.").should("exist");

		saveMeal();
		cy.get(".save-feedback-banner").should("contain.text", "This meal is still empty. Tap + to add at least one item, then save.");
	});

	it("rejects an item without a positive amount", () => {
		openManualDraft();

		// Invalid: the seeded item still has amount 0.
		saveMeal();
		cy.get(".save-feedback-banner").should("contain.text", "needs an amount greater than 0");
	});

	it("saves a valid synthetic meal and lands on the canonical result screen", () => {
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, { statusCode: 200, body: savedResponse }).as("saveMeal");

		openManualDraft();
		setInlineAmount("2");

		// Valid save posts to the backend and navigates to the saved result.
		saveMeal();
		cy.wait("@saveMeal");

		cy.url().should("include", "/meals/saved/syn-saved-1");
		// J5 replaced the saved-result toolbar title with the journal hero, so
		// the meal name is the page heading and the status pill marks arrival.
		shouldBeRendered("span", "Saved to history");
		shouldBeRendered("h1", "Synthetic Manual Meal");
		shouldBeRendered("p", "Score: 42 · internal reference: 100");
	});

	it("shows the sanitized backend error without leaking internals when the save fails", () => {
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, { statusCode: 500, body: { detail: "Internal server error" } }).as("saveMealFail");

		openManualDraft();
		setInlineAmount("1");
		saveMeal();
		cy.wait("@saveMealFail");

		// The failed save keeps the user on the editable draft.
		cy.url().should("include", "/meals/new");
		cy.get(".save-feedback-banner").should("contain.text", MEAL_SAVE_FAILURE);
		cy.get("ion-app").invoke("text")
			.should("not.contain", "Internal server error")
			.and("not.contain", "Traceback");
	});
});
