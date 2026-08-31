/// <reference types="cypress" />

import {
	BACKEND_ORIGIN,
	stubBackend,
	syntheticBackendMeal,
	syntheticPreviewFromSaved,
	visitFresh,
} from "../support/insightStubs";

const canonicalBreakfast = syntheticBackendMeal("b2-breakfast", "Synthetic breakfast X", 42);
const ambiguousSaveMessage = "The save may still have reached History. Retry this same attempt to check safely.";

const openValidManualDraft = () => {
	visitFresh("/log-meal");
	cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
	cy.url().should("include", "/meals/new");
	cy.contains("ion-input", "Meal name").find("input").first().type("{selectall}Synthetic breakfast X");
	cy.get(".portion-adjust-row ion-input[label='Amount'] input").first().type("{selectall}1");
};

describe("Campaign B B2-2 pending-save navigation", () => {
	it("keeps keyed in-flight and ambiguous status across tabs without blocking a new meal", () => {
		stubBackend();
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals/preview`, {
			statusCode: 200,
			body: syntheticPreviewFromSaved(canonicalBreakfast),
		}).as("previewMeal");
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, {
			statusCode: 500,
			delay: 3000,
			body: { detail: "Synthetic private diagnostic that must not render" },
		}).as("saveMeal");

		openValidManualDraft();
		cy.get("[aria-label='Calculate estimate']").first().click({ force: true });
		cy.wait("@previewMeal");
		cy.url().should("include", "/meals/estimate");
		cy.contains("Estimate only — not saved").should("exist");

		cy.get("[aria-label='Save to History']").first().click({ force: true });
		cy.get("[aria-label='Meal save status']")
			.should("contain.text", "Synthetic breakfast X")
			.and("contain.text", "Saving this meal in the background…");

		cy.get("ion-tab-button[aria-label='Home']").click({ force: true });
		cy.url().should("include", "/dashboard");
		cy.get("[aria-label='Meal save status']").should("contain.text", "Saving this meal in the background…");

		cy.wait("@saveMeal");
		cy.get("[aria-label='Meal save status']")
			.should("contain.text", ambiguousSaveMessage)
			.and("not.contain.text", "Synthetic private diagnostic that must not render");

		cy.get("ion-tab-button[aria-label='Log Meal']").click({ force: true });
		cy.url().should("include", "/log-meal");
		cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
		cy.url().should("include", "/meals/new");
		cy.contains("Draft item — tap to add food details").should("exist");
		cy.get("[aria-label='Meal save status']")
			.should("contain.text", "Synthetic breakfast X")
			.and("contain.text", "Retry this save");
	});
});
