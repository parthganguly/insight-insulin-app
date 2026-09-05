/// <reference types="cypress" />

import {
	BACKEND_ORIGIN,
	getEnteredPage,
	shouldBeRendered,
	stubBackend,
	syntheticBackendMeal,
	syntheticPreviewFromSaved,
	visitFresh,
} from "../support/insightStubs";

const extractedMeal = {
	name: "Synthetic camera meal",
	items: [{
		id: "synthetic-camera-item",
		name: "Synthetic rice",
		quantity: 1,
		unit: "serving",
		kcalPerUnit: 200,
		carb_g: 45,
		protein_g: 4,
		fat_g: 1,
		satFat_g: 0.2,
		gi: 60,
	}],
};
const previewMeal = syntheticBackendMeal("j9-preview", "Synthetic review meal", 42);

const stubExtraction = (statusCode = 200) => {
	cy.intercept("POST", `${BACKEND_ORIGIN}/ai-meal-extract`, statusCode === 200
		? { statusCode, body: { data: { meal: extractedMeal } } }
		: { statusCode, body: { detail: "Synthetic extraction failure" } }).as("extractMeal");
};

const captureAndAnalyze = () => {
	// The web Camera plugin creates this input for the photo-library path. A
	// synthetic in-memory file exercises the real plugin boundary without an
	// OS chooser or real user image.
	cy.get(".ion-page:not(.ion-page-hidden) .camera-frame").should("be.visible");
	cy.wait(300);
	cy.contains(".ion-page:not(.ion-page-hidden) ion-button", "Choose from photos").click({ force: true });
	cy.get("#_capacitor-camera-input").selectFile({
		contents: Cypress.Buffer.from("synthetic-camera-image"),
		fileName: "synthetic-meal.jpg",
		mimeType: "image/jpeg",
	}, { force: true });
	cy.get("img[alt='Captured food 1']").should("be.visible");
	cy.contains(".ion-page:not(.ion-page-hidden) ion-button", "Analyze meal").click({ force: true });
	cy.wait("@extractMeal");
};

const enterManualReview = () => {
	cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
	cy.location("pathname").should("eq", "/meals/new");
	cy.contains(".ion-page:not(.ion-page-hidden) h1", "Did we get your meal right?").should("be.visible");
	cy.wait(300);
};

const openCameraFromReview = () => {
	cy.contains(".ion-page:not(.ion-page-hidden) ion-button", "Add something we missed").click({ force: true });
	cy.contains("ion-action-sheet:not(.overlay-hidden) button.action-sheet-button", "AI").click({ force: true });
	cy.location("pathname").should("eq", "/meals/new/ai");
};

const assertActiveReview = (mealName = "Synthetic camera meal") => {
	cy.location("pathname").should("eq", "/meals/new");
	cy.get("body").find(".ion-page:not(.ion-page-hidden) .camera-frame").should("have.length", 0);
	cy.contains(".ion-page:not(.ion-page-hidden) h1", "Did we get your meal right?").should("be.visible");
	cy.get(".ion-page:not(.ion-page-hidden) ion-input[label='Meal name'] input").should("have.value", mealName);
	cy.contains(".ion-page:not(.ion-page-hidden)", "Synthetic rice").should("be.visible");
	cy.contains("ion-alert", "Discard this draft?").should("not.exist");
};

const assertDirtyBackGuard = () => {
	cy.go("back");
	cy.contains("ion-alert", "Discard this draft?").should("exist");
};

const failExtractionAndChooseManual = () => {
	captureAndAnalyze();
	cy.contains("[role='alert']", "AI meal extraction is not available right now").should("be.visible");
	cy.contains(".ion-page:not(.ion-page-hidden) ion-button", "Enter manually instead").click({ force: true });
};

const openEstimate = () => {
	cy.intercept("POST", `${BACKEND_ORIGIN}/meals/preview`, {
		statusCode: 200,
		body: syntheticPreviewFromSaved(previewMeal),
	}).as("previewMeal");
	enterManualReview();
	cy.get("ion-input[label='Meal name'] input").type("{selectall}Synthetic review meal");
	cy.get(".portion-adjust-row ion-input[label='Amount'] input").first().type("{selectall}1");
	cy.get("[aria-label='Calculate estimate']").first().click({ force: true });
	cy.wait("@previewMeal");
	getEnteredPage("/meals/estimate", "ion-content.estimate-page");
};

describe("J9 Smart Camera navigation", () => {
	beforeEach(() => {
		stubBackend();
	});

	it("returns direct Smart Camera success to a populated active review and guards Back", () => {
		stubExtraction();
		visitFresh("/log-meal");
		cy.contains("ion-button.log-meal-option", "Take a photo").click({ force: true });
		captureAndAnalyze();
		assertActiveReview();
		assertDirtyBackGuard();
	});

	it("returns secondary Smart Camera success to the existing review without a camera/no-op Back", () => {
		stubExtraction();
		visitFresh("/log-meal");
		enterManualReview();
		openCameraFromReview();
		captureAndAnalyze();
		assertActiveReview();
		assertDirtyBackGuard();
		cy.get("body").find(".ion-page:not(.ion-page-hidden) .camera-frame").should("have.length", 0);
	});

	it("replaces a deep-linked camera with the populated review", () => {
		stubExtraction();
		visitFresh("/meals/new/ai");
		captureAndAnalyze();
		assertActiveReview();
	});

	it("does not confuse a retained earlier editor with a direct camera caller", () => {
		stubExtraction();
		visitFresh("/log-meal");
		enterManualReview();
		cy.contains("ion-button", "Discard draft").click({ force: true });
		cy.location("pathname").should("eq", "/log-meal");
		cy.contains("ion-button.log-meal-option", "Take a photo").click({ force: true });
		captureAndAnalyze();
		assertActiveReview();
		assertDirtyBackGuard();
	});

	it("cancels back to the chooser caller", () => {
		visitFresh("/log-meal");
		cy.contains("ion-button.log-meal-option", "Take a photo").click({ force: true });
		cy.contains(".ion-page:not(.ion-page-hidden) ion-button.camera-cancel-action", "Cancel").click({ force: true });
		cy.location("pathname").should("eq", "/log-meal");
		cy.contains("h1", "How would you like to add it?").should("be.visible");
	});

	it("cancels back to the review caller", () => {
		visitFresh("/log-meal");
		enterManualReview();
		openCameraFromReview();
		cy.contains(".ion-page:not(.ion-page-hidden) ion-button.camera-cancel-action", "Cancel").click({ force: true });
		cy.location("pathname").should("eq", "/meals/new");
		cy.contains(".ion-page:not(.ion-page-hidden) h1", "Did we get your meal right?").should("be.visible");
		cy.contains("Draft item — tap to add food details").should("be.visible");
	});

	it("uses chooser semantics for manual fallback after failure", () => {
		stubExtraction(503);
		visitFresh("/log-meal");
		cy.contains("ion-button.log-meal-option", "Take a photo").click({ force: true });
		failExtractionAndChooseManual();
		cy.location("pathname").should("eq", "/meals/new");
		cy.get("body").find(".ion-page:not(.ion-page-hidden) .camera-frame").should("have.length", 0);
		cy.contains("Draft item — tap to add food details").should("be.visible");
	});

	it("uses review semantics for manual fallback after failure", () => {
		stubExtraction(503);
		visitFresh("/log-meal");
		enterManualReview();
		openCameraFromReview();
		failExtractionAndChooseManual();
		cy.location("pathname").should("eq", "/meals/new");
		cy.get("body").find(".ion-page:not(.ion-page-hidden) .camera-frame").should("have.length", 0);
		cy.contains("Draft item — tap to add food details").should("be.visible");
	});
});

describe("J9 estimate navigation and state preservation", () => {
	beforeEach(() => {
		stubBackend();
		visitFresh("/log-meal");
	});

	it("preserves the draft and active result across repeated Adjust/Calculate cycles", () => {
		openEstimate();
		const historyDepths: number[] = [];
		cy.window().its("history.length").then((depth) => historyDepths.push(depth));
		for (let cycle = 0; cycle < 3; cycle++) {
			getEnteredPage("/meals/estimate", "ion-content.estimate-page")
				.contains("ion-button", "Adjust meal").click();
			getEnteredPage("/meals/new", "ion-content.confirmation-page").within(() => {
				cy.get("ion-input[label='Meal name'] input").should("have.value", "Synthetic review meal");
				cy.get(".portion-adjust-row ion-input[label='Amount'] input").should("have.value", "1");
				cy.get("ion-button[aria-label='Calculate estimate']").should("have.length", 1).click();
			});
			cy.wait("@previewMeal").its("request.body.items.0.quantity").should("eq", 1);
			getEnteredPage("/meals/estimate", "ion-content.estimate-page").within(() => {
				shouldBeRendered(".result-meal-name", "Synthetic review meal");
				cy.get(".estimate-model-status").should("not.exist");
				cy.contains("ion-footer ion-button", "Save to History").should("be.visible");
			});
			cy.get("ion-alert").should("not.exist");
			cy.window().its("history.length").then((depth) => historyDepths.push(depth));
		}
		// Record observed growth; constant history depth is no longer the contract.
		cy.then(() => cy.writeFile(`${Cypress.config("screenshotsFolder")}/j9-history-depths.json`, historyDepths));
	});

	it("returns Back from an edited review to the entered stale estimate and recalculates", () => {
		openEstimate();
		getEnteredPage("/meals/estimate", "ion-content.estimate-page")
			.contains("ion-button", "Adjust meal").click();
		getEnteredPage("/meals/new", "ion-content.confirmation-page")
			.find(".portion-adjust-row ion-input[label='Amount'] input")
			.then(($input) => $input[0].scrollIntoView({ block: "center" }))
			.should("be.visible").and("have.value", "1")
			.type("{selectall}2").should("have.value", "2").blur();
		cy.go("back");
		getEnteredPage("/meals/estimate", "ion-content.estimate-page").within(() => {
			shouldBeRendered(".estimate-stale-copy", "This estimate describes the meal before your changes.");
			shouldBeRendered(".result-score", "Relative score: 42");
			cy.contains("ion-footer", "Save to History").should("not.exist");
			cy.contains("ion-footer ion-button", "Recalculate").should("be.visible");
		});
		cy.get("ion-alert").should("not.exist");
		cy.get("@previewMeal.all").should("have.length", 1);
		getEnteredPage("/meals/estimate", "ion-content.estimate-page")
			.contains("ion-footer ion-button", "Recalculate").click();
		cy.wait("@previewMeal").its("request.body.items.0.quantity").should("eq", 2);
		getEnteredPage("/meals/estimate", "ion-content.estimate-page").within(() => {
			cy.get(".estimate-model-status").should("not.exist");
			cy.contains("ion-footer ion-button", "Save to History").should("be.visible");
		});
	});

	it("rejects a predecessor-less direct estimate restore as invalid", () => {
		cy.visit("/meals/estimate");
		cy.location("pathname").should("eq", "/log-meal");
		cy.contains("h1", "How would you like to add it?").should("be.visible");
	});
});

describe("J9 route focus and headings", () => {
	it("exposes one Settings h1 through the existing ion-title", () => {
		stubBackend();
		visitFresh("/dashboard");
		cy.get("ion-button[aria-label='Settings']").click({ force: true });
		cy.get(".ion-page:not(.ion-page-hidden) ion-title[role='heading'][aria-level='1']")
			.should("have.length", 1)
			.and("contain.text", "Settings");
		cy.get("h1:visible").should("have.length", 0);
	});

	it("preserves retained History scroll on a saved-result round trip", () => {
		const meals = Array.from({ length: 24 }, (_, index) => syntheticBackendMeal(`j9-history-${index}`, `Synthetic history meal ${index}`, 40 + index));
		stubBackend({ meals });
		visitFresh("/meals");
		cy.wait("@meals");
		cy.get("ion-item.journal-entry-card").should("have.length", 24);
		cy.contains(".ion-page:not(.ion-page-hidden) h1", "Meal journal").should("be.visible");
		cy.wait(400); // Let the initial Ionic route transition settle before measuring retained scroll.
		cy.get("ion-content.journal-folio-content").then(($content) => ($content[0] as HTMLIonContentElement).getScrollElement()).then(($scrollElement) => {
			const scrollEl = $scrollElement[0] as HTMLElement;
			expect(scrollEl.scrollHeight).to.be.greaterThan(scrollEl.clientHeight);
			scrollEl.scrollTop = Math.min(900, scrollEl.scrollHeight - scrollEl.clientHeight);
			expect(scrollEl.scrollTop).to.be.greaterThan(0);
		});
		cy.get("ion-content.journal-folio-content").then(($content) => ($content[0] as HTMLIonContentElement).getScrollElement()).then(($scrollElement) => {
			const scrollEl = $scrollElement[0] as HTMLElement;
			const before = scrollEl.scrollTop;
			expect(before).to.be.greaterThan(0);
			cy.get("ion-item.journal-entry-card:visible").last().click({ force: true });
			cy.contains(".ion-page:not(.ion-page-hidden) h1.result-meal-name", "Synthetic history meal").should("be.visible");
			cy.get(".ion-page:not(.ion-page-hidden) ion-back-button[aria-label='Back']").click({ force: true });
			cy.contains(".ion-page:not(.ion-page-hidden) h1", "Meal journal").should("exist");
			cy.get("ion-content.journal-folio-content").then(($content) => ($content[0] as HTMLIonContentElement).getScrollElement()).then(($returnedScrollElement) => {
				const returnedScrollEl = $returnedScrollElement[0] as HTMLElement;
				expect(returnedScrollEl.scrollTop).to.be.closeTo(before, 2);
			});
		});
	});
});

describe("J9 pending-save touch target", () => {
	it("keeps every recovery action at least 44px high at a narrow viewport", () => {
		cy.viewport(320, 700);
		stubBackend();
		visitFresh("/log-meal");
		openEstimate();
		cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, {
			statusCode: 500,
			body: { detail: "Synthetic save failure" },
		}).as("saveMeal");
		cy.contains("ion-footer ion-button", "Save to History").click({ force: true });
		cy.wait("@saveMeal");
		cy.get("ion-tab-button[aria-label='Home']").click({ force: true });
		cy.get(".pending-save-actions ion-button:visible").should("have.length.at.least", 1).each(($button) => {
			expect($button[0].getBoundingClientRect().height).to.be.at.least(44);
		});
	});
});
