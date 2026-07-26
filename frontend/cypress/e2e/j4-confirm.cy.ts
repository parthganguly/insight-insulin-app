/// <reference types="cypress" />

import {
	BACKEND_ORIGIN,
	assertNoHorizontalOverflow,
	stubBackend,
	syntheticBackendMeal,
	visitFresh,
} from "../support/insightStubs";

const savedMeal = syntheticBackendMeal("j4-saved-meal", "Synthetic journal supper", 42);

const openManualDraft = () => {
	visitFresh("/log-meal");
	cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
	cy.url().should("include", "/meals/new");
	cy.get(".confirmation-sheet").should("have.attr", "aria-busy", "false");
	cy.contains(".confirmation-kicker", "Draft — not saved").should("be.visible");
	cy.contains("h1", "Did we get your meal right?").should("be.visible");
};

const setIonInput = (scope: Cypress.Chainable<JQuery<HTMLElement>>, label: string, value: string) => {
	scope.find(`ion-input[label="${label}"] input`).first().type(`{selectall}${value}`).should("have.value", value);
};

const openFirstEditor = () => {
	cy.get("[data-component-card]").first().contains("ion-button", "Edit details").click({ force: true });
	cy.get("ion-modal:not(.overlay-hidden):visible").should("exist");
};

const closeEditor = () => {
	cy.get("ion-modal:not(.overlay-hidden):visible").contains("ion-button", "Done").click({ force: true });
	cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
};

const seedReviewedValues = () => {
	openFirstEditor();
	setIonInput(cy.get("ion-modal:not(.overlay-hidden):visible"), "Item name", "synthetic rice");
	cy.get("ion-modal:not(.overlay-hidden):visible details.advanced-details > summary").click({ force: true });
	setIonInput(cy.get("ion-modal:not(.overlay-hidden):visible"), "kcals per serving", "200");
	setIonInput(cy.get("ion-modal:not(.overlay-hidden):visible"), "Carb per serving (g)", "45");
	setIonInput(cy.get("ion-modal:not(.overlay-hidden):visible"), "Saturated Fat per serving (g)", "0.2");
	closeEditor();
	cy.get(".portion-adjust-row ion-input[label='Amount'] input").first().type("{selectall}1");
};

describe("Annotated Journal J4 confirm", () => {
	beforeEach(() => {
		stubBackend();
	});

	it("opens the journal sheet, edits its label, adds a missed item, and discards", () => {
		cy.viewport(390, 844);
		openManualDraft();
		setIonInput(cy.get(".confirmation-sheet"), "Meal name", "Synthetic journal supper");
		cy.contains("ion-button", "Add something we missed — oil, ghee, sides…").click({ force: true });
		cy.contains("ion-action-sheet:not(.overlay-hidden) button.action-sheet-button", "Manual").click({ force: true });
		cy.get("[data-component-card]").should("have.length", 2);
		assertNoHorizontalOverflow();
		cy.contains("ion-button", "Discard draft").click({ force: true });
		cy.url().should("include", "/log-meal");
	});

	it("resolves renamed carried values with These still fit", () => {
		openManualDraft();
		seedReviewedValues();
		openFirstEditor();
		setIonInput(cy.get("ion-modal:not(.overlay-hidden):visible"), "Item name", "synthetic brown rice");
		closeEditor();

		cy.get(".needs-review-card[role='status']")
			.should("contain.text", 'These values were for "synthetic rice". Check they still fit.')
			.and("contain.text", "200 kcal · 45 g carbs");
		cy.contains("[data-component-card]", "Values under review").should("exist");
		cy.get("[aria-label='Save meal']").should("have.attr", "disabled");
		cy.get(".needs-review-card").contains("ion-button", "These still fit").click({ force: true });
		cy.get(".needs-review-card").should("not.exist");
		cy.get("[aria-label='Save meal']").should("not.have.attr", "disabled");
	});

	it("resolves renamed carried values by editing nutrition", () => {
		openManualDraft();
		seedReviewedValues();
		openFirstEditor();
		setIonInput(cy.get("ion-modal:not(.overlay-hidden):visible"), "Item name", "synthetic red rice");
		closeEditor();
		cy.get(".needs-review-card").contains("ion-button", "Edit values").click({ force: true });
		cy.get("ion-modal:not(.overlay-hidden):visible details.advanced-details > summary").click({ force: true });
		setIonInput(cy.get("ion-modal:not(.overlay-hidden):visible"), "Carb per serving (g)", "48");
		closeEditor();
		cy.get(".needs-review-card").should("not.exist");
	});

	it("saves through the fixed dock and lands on the saved result", () => {
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, { statusCode: 200, body: savedMeal }).as("saveMeal");
		openManualDraft();
		seedReviewedValues();
		setIonInput(cy.get(".confirmation-sheet"), "Meal name", "Synthetic journal supper");
		cy.get("[aria-label='Save meal']").first().click({ force: true });
		cy.wait("@saveMeal");
		cy.url().should("include", "/meals/saved/j4-saved-meal");
		// J5 replaced the saved-result toolbar title with the journal hero; the
		// sealed saved-status pill is the landing landmark.
		cy.contains("Saved to history").should("exist");
	});
});
