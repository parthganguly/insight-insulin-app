/// <reference types="cypress" />

import {
	BACKEND_ORIGIN,
	assertNoHorizontalOverflow,
	getEnteredPage,
	shouldBeRendered,
	stubBackend,
	syntheticBackendMeal,
	syntheticPreviewFromSaved,
	visitFresh,
} from "../support/insightStubs";

const LONG_MEAL_NAME = "Synthetic toasted oats with orchard fruit and cultured yogurt";
const freshMeal = syntheticBackendMeal("j8-fresh", LONG_MEAL_NAME, 67);
const ambiguousSaveMessage = "The save may still have reached History. Retry this same attempt to check safely.";

type OpenEstimateOptions = {
	meal?: typeof freshMeal;
	ink?: boolean;
};

const openEstimate = ({ meal = freshMeal, ink = false }: OpenEstimateOptions = {}) => {
	stubBackend();
	cy.intercept("POST", `${BACKEND_ORIGIN}/meals/preview`, {
		statusCode: 200,
		body: syntheticPreviewFromSaved(meal),
	}).as("previewMeal");

	const settings = { "app-settings": { state: { darkMode: ink }, version: 0 } };
	visitFresh("/log-meal", settings);
	cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
	cy.contains("ion-input", "Meal name").find("input").first().type(`{selectall}${meal.meal_name}`);
	cy.get(".portion-adjust-row ion-input[label='Amount'] input").first().type("{selectall}1");
	cy.get("[aria-label='Calculate estimate']").first().click({ force: true });
	cy.wait("@previewMeal");
	getEnteredPage("/meals/estimate", "ion-content.estimate-page");
	shouldBeRendered(".ion-page:not(.ion-page-hidden) .result-meal-name", meal.meal_name);
};

const assertFreshPorcelain = () => {
	cy.contains(".result-sheet", LONG_MEAL_NAME).should("exist");
	cy.contains(".result-sheet ion-button", "Adjust meal").should("exist");
	cy.contains("ion-footer ion-button", "Save to History").should("have.length", 1);
	cy.contains("Estimate only — not saved").should("not.exist");
	cy.contains("ion-footer", "Discard").should("not.exist");
	cy.contains("ion-footer", "Adjust meal").should("not.exist");
	cy.get("ion-content.estimate-page").then(($content) => {
		cy.get("ion-footer.estimate-dock").then(($footer) => {
			expect($content[0].getBoundingClientRect().bottom, "content ends above footer").to.be.at.most($footer[0].getBoundingClientRect().top + 1);
		});
	});
	assertNoHorizontalOverflow();
};

describe("J8 unsaved estimate Porcelain treatment", () => {
	it("captures fresh Paper, narrow, and large-text layouts", () => {
		cy.viewport(390, 844);
		openEstimate();
		assertFreshPorcelain();
		cy.screenshot("j8-01-fresh-paper-390x844", { capture: "viewport" });

		cy.viewport(320, 700);
		assertFreshPorcelain();
		cy.screenshot("j8-07-fresh-paper-320x700", { capture: "viewport" });

		cy.viewport(390, 844);
		cy.get("html").invoke("attr", "style", "font-size: 133%;");
		assertFreshPorcelain();
		cy.screenshot("j8-08-fresh-paper-large-text-133", { capture: "viewport" });
	});

	it("captures the fresh Ink treatment", () => {
		cy.viewport(390, 844);
		openEstimate({ ink: true });
		cy.get("ion-app").should("have.attr", "data-appearance", "ink");
		assertFreshPorcelain();
		cy.screenshot("j8-02-fresh-ink-390x844", { capture: "viewport" });
	});

	it("keeps the prior result readable through stale, failed recalculation, and successful retry states", () => {
		const activePage = ".ion-page:not(.ion-page-hidden)";
		cy.viewport(390, 844);
		openEstimate();
		cy.contains(`${activePage} ion-footer ion-button`, "Save to History").should("be.visible");
		cy.contains(`${activePage} .result-sheet ion-button`, "Adjust meal").click();
		getEnteredPage("/meals/new", "ion-content.confirmation-page").find("ion-content")
			.then(($content) => ($content[0] as HTMLIonContentElement).scrollToTop(0));
		cy.contains(`${activePage} h1`, "Did we get your meal right?").should("be.visible");
		cy.get(`${activePage} .portion-adjust-row ion-input[label='Amount'] input`)
			.should("have.length", 1)
			.then(($input) => $input[0].scrollIntoView({ block: "center" }))
			.should("be.visible")
			.and("have.value", "1")
			.type("{selectall}2")
			.should("have.value", "2")
			.blur();
		cy.go("back");
		getEnteredPage("/meals/estimate", "ion-content.estimate-page");
		cy.get("ion-alert").should("not.exist");
		shouldBeRendered(`${activePage} .estimate-stale-copy`, "This estimate describes the meal before your changes. Recalculate before saving.");
		shouldBeRendered(`${activePage} .result-score`, "Relative score: 67");
		cy.contains(`${activePage} ion-footer ion-button`, "Recalculate").should("be.visible");
		cy.contains(`${activePage} ion-footer`, "Save to History").should("not.exist");
		cy.get("@previewMeal.all").should("have.length", 1);
		cy.screenshot("j8-03-stale-recalculate-paper-390x844", { capture: "viewport" });

		cy.intercept("POST", `${BACKEND_ORIGIN}/meals/preview`, {
			statusCode: 500,
			body: { detail: "Synthetic diagnostic that must not render" },
		}).as("failedRecalculation");
		cy.contains(`${activePage} ion-footer ion-button`, "Recalculate").click();
		cy.wait("@failedRecalculation").its("request.body.items.0.quantity").should("eq", 2);
		getEnteredPage("/meals/estimate", "ion-content.estimate-page");
		shouldBeRendered(`${activePage} .estimate-model-error`, "Couldn't update this estimate. Try again.");
		shouldBeRendered(`${activePage} .result-score`, "Relative score: 67");
		cy.contains("Synthetic diagnostic that must not render").should("not.exist");
		cy.contains(`${activePage} ion-footer ion-button`, "Recalculate").should("be.visible");
		cy.contains(`${activePage} ion-footer`, "Save to History").should("not.exist");
		cy.screenshot("j8-04-recalculation-failure-paper-390x844", { capture: "viewport" });

		cy.intercept("POST", `${BACKEND_ORIGIN}/meals/preview`, {
			statusCode: 200,
			body: syntheticPreviewFromSaved(syntheticBackendMeal("j8-updated", LONG_MEAL_NAME, 83)),
		}).as("successfulRecalculation");
		cy.contains(`${activePage} ion-footer ion-button`, "Recalculate").click();
		cy.wait("@successfulRecalculation").its("request.body.items.0.quantity").should("eq", 2);
		getEnteredPage("/meals/estimate", "ion-content.estimate-page");
		shouldBeRendered(`${activePage} .result-score`, "Relative score: 83");
		cy.get(`${activePage} .estimate-model-status`).should("not.exist");
		cy.contains(`${activePage} ion-footer ion-button`, "Recalculate").should("not.exist");
		cy.contains(`${activePage} ion-footer ion-button`, "Save to History").should("be.visible").and("not.have.attr", "disabled");
		cy.contains("Synthetic diagnostic that must not render").should("not.exist");
		cy.get("ion-alert").should("not.exist");
	});

	it("captures insufficient-data dignity with ordinary Save to History", () => {
		cy.viewport(390, 844);
		const insufficient = syntheticBackendMeal("j8-insufficient", LONG_MEAL_NAME, 67, {
			estimate_quality: "low",
			estimate_status: "insufficient_data",
			items: [{ ...freshMeal.items[0], fii_source: "unknown" }],
		});
		openEstimate({ meal: insufficient });
		cy.contains("Hard to estimate from this meal").should("exist");
		cy.get(".result-score").should("not.exist");
		cy.contains("ion-footer ion-button", "Save to History").should("exist");
		cy.contains("Save as note").should("not.exist");
		cy.screenshot("j8-05-insufficient-data-paper-390x844", { capture: "viewport" });
	});

	it("captures truthful ambiguous persistence recovery without a duplicate global banner", () => {
		cy.viewport(390, 844);
		openEstimate();
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, {
			statusCode: 500,
			body: { detail: "Synthetic diagnostic that must not render" },
		}).as("ambiguousSave");
		cy.contains("ion-footer ion-button", "Save to History").click({ force: true });
		cy.wait("@ambiguousSave");
		cy.contains("ion-footer", ambiguousSaveMessage).should("exist");
		cy.contains("ion-footer ion-button", "Retry this save").should("exist");
		cy.get("[aria-label='Meal save status']").should("not.exist");
		cy.contains("Synthetic diagnostic that must not render").should("not.exist");
		cy.screenshot("j8-06-ambiguous-retry-paper-390x844", { capture: "viewport" });
	});
});
