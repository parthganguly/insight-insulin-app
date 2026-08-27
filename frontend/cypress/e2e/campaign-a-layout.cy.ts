/// <reference types="cypress" />

// Campaign A release polish (PR #95), updated for the J7 neutral provenance
// contract. These tests guard the portion quick-adjust row and a saved result
// with three separately laid-out evidence rows at both target viewports.

import { BACKEND_ORIGIN, assertNoHorizontalOverflow, shouldBeRendered, stubBackend, syntheticBackendMeal, visitFresh } from "../support/insightStubs";

const driverWhy = "Used a direct Food Insulin Index match and scaled it by eaten energy.";

const threeDriverResponse = syntheticBackendMeal("syn-drivers-1", "Synthetic lentil rice bowl", 63, {
	items: [
		{ name: "synthetic red lentils", quantity: 150, unit: "g", kcalPerUnit: 1.16, carb_g: 30, satFat_g: 0.1, gi: 32, kcal_item: 174, insulin_load: 8.4, confidence: 0.7, fii_source: "exact_fii", why: driverWhy },
		{ name: "steamed basmati rice", quantity: 180, unit: "g", kcalPerUnit: 1.3, carb_g: 50, satFat_g: 0.1, gi: 58, kcal_item: 234, insulin_load: 9.1, confidence: 0.7, fii_source: "exact_fii", why: driverWhy },
		{ name: "extra-virgin olive oil", quantity: 10, unit: "g", kcalPerUnit: 8.84, carb_g: 0, satFat_g: 1.4, gi: 0, kcal_item: 88, insulin_load: 1.2, confidence: 0.7, fii_source: "exact_fii", why: driverWhy },
	],
	main_insulin_drivers: ["synthetic red lentils", "steamed basmati rice", "extra-virgin olive oil"],
});

const VIEWPORTS: Array<[number, number, string]> = [
	[390, 844, "390x844"],
	[320, 700, "320x700"],
];

// Builds a three-component manual draft through the real journey: chooser →
// Enter manually (one seeded item) → "Add something we missed" twice.
const buildThreeComponentDraft = () => {
	visitFresh("/log-meal");
	cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
	cy.url().should("include", "/meals/new");
	cy.contains("Draft item — tap to add food details").should("exist");
	// Wait for Ionic to finish parking the chooser page: an action sheet
	// presented while the route transition is still running gets torn down
	// with the transition context before its buttons can be clicked.
	cy.get("div.ion-page.ion-page-hidden").should("exist");

	for (let extra = 0; extra < 2; extra += 1) {
		cy.contains("ion-button", "Add something we missed").click({ force: true });
		cy.contains("ion-action-sheet:not(.overlay-hidden) button.action-sheet-button", "Manual").click({ force: true });
		cy.get("ion-action-sheet:not(.overlay-hidden)").should("not.exist");
		cy.get(".portion-adjust-row").should("have.length", 2 + extra);
	}

	// Give the meal an honest synthetic name and each component a portion.
	// {selectall} replaces the controlled value atomically — a separate
	// clear() lets React restore the old value between commands.
	cy.contains("ion-input", "Meal name").find("input").first().type("{selectall}Synthetic lentil rice bowl");
	const amounts = ["150", "180", "10"];
	amounts.forEach((amount, index) => {
		cy.get(".portion-adjust-row").eq(index).contains("ion-input", "Amount").find("input").first().type(`{selectall}${amount}`);
		cy.get(".portion-adjust-row").eq(index).contains("ion-input", "Amount").find("input").first().should("have.value", amount);
	});
};

const assertPortionRowIsOneControl = () => {
	cy.get(".portion-adjust-row").each(($row) => {
		const row = $row[0];
		const rowRect = row.getBoundingClientRect();
		expect(getComputedStyle(row).display, "portion row lays out as a grid").to.equal("grid");
		expect(row.scrollWidth, "portion row does not overflow its card").to.be.at.most(row.clientWidth + 1);

		// The stepper buttons stay comfortably touchable and inside the row.
		for (const button of Array.from(row.querySelectorAll("ion-button"))) {
			const rect = button.getBoundingClientRect();
			expect(rect.height, "stepper touch height").to.be.at.least(43);
			expect(rect.width, "stepper touch width").to.be.at.least(43);
			expect(rect.left, "stepper starts inside the row").to.be.at.least(rowRect.left - 1);
			expect(rect.right, "stepper ends inside the row").to.be.at.most(rowRect.right + 1);
		}
	});
};

const assertEvidenceRowsReadCleanly = () => {
	const expectedNames = ["synthetic red lentils", "steamed basmati rice", "extra-virgin olive oil"];
	cy.get(".result-evidence-rows").should(($container) => {
		const container = $container[0];
		const rows = Array.from(container.querySelectorAll(".result-evidence-row"));
		expect(rows.length, "all three evidence rows render").to.equal(3);
		expect(rows.map((row) => row.querySelector(".result-evidence-name")?.textContent), "stored item order is preserved").to.deep.equal(expectedNames);

		const containerRect = container.getBoundingClientRect();
		for (const row of rows) {
			const rect = row.getBoundingClientRect();
			expect(rect.width, "evidence row is laid out").to.be.greaterThan(0);
			expect(rect.left, "evidence row starts inside the container").to.be.at.least(containerRect.left - 1);
			expect(rect.right, "evidence row ends inside the container").to.be.at.most(containerRect.right + 1);
		}
	});
	cy.get(".result-evidence-why").should("have.length", 3).each(($copy) => expect($copy.text()).to.equal("Matched in INSIGHT’s current food table"));
	cy.get(".result-evidence").should("not.contain.text", "Main drivers").and("not.contain.text", driverWhy);
};

describe("Campaign A layout polish", () => {
	for (const [width, height, label] of VIEWPORTS) {
		it(`keeps the three-component portion controls coherent at ${label}`, () => {
			cy.viewport(width, height);
			stubBackend();
			buildThreeComponentDraft();

			assertPortionRowIsOneControl();
			assertNoHorizontalOverflow();
			// Native scrollIntoView reaches Ionic's shadow-DOM scroll container,
			// which Cypress's own scrollIntoView does not.
			cy.get("[aria-label='Meal components']").then(($region) => $region[0].scrollIntoView({ block: "start" }));
			cy.screenshot(`fable-final/${label}-confirmation-three-components`, { capture: "viewport" });
		});

		it(`renders three neutral result evidence rows cleanly at ${label}`, () => {
			cy.viewport(width, height);
			stubBackend();
			cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, { statusCode: 200, body: threeDriverResponse }).as("saveMeal");
			buildThreeComponentDraft();

			cy.get("[aria-label='Save meal']").first().click({ force: true });
			cy.wait("@saveMeal");
			cy.url().should("include", "/meals/saved/syn-drivers-1");

			shouldBeRendered("h1", "Synthetic lentil rice bowl");
			cy.contains("How this estimate was built").should("exist");
			// Let the replace-navigation transition and the transient save toast
			// settle so the evidence screenshot shows only the result screen.
			cy.contains("Did we get your meal right?").should("not.exist");
			cy.get("ion-toast:not(.overlay-hidden)").should("not.exist");
			assertEvidenceRowsReadCleanly();
			assertNoHorizontalOverflow();
			cy.get(".result-evidence-rows").then(($rows) => $rows[0].scrollIntoView({ block: "center" }));
			cy.screenshot(`fable-final/${label}-result-three-evidence-rows`, { capture: "viewport" });
		});
	}
});
