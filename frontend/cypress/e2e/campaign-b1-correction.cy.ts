/// <reference types="cypress" />

import { assertNoHorizontalOverflow, stubBackend, visitFresh } from "../support/insightStubs";

const VIEWPORTS: Array<[number, number, string]> = [
	[390, 844, "390x844"],
	[320, 700, "320x700"],
];

const getConfirmationContent = () =>
	cy.get("ion-content.confirmation-page:visible").should("have.length", 1);

const getVisibleModal = () =>
	cy.get("ion-modal:not(.overlay-hidden):visible").should("have.length", 1);

const clickExactVisibleElement = (
	scope: () => Cypress.Chainable<JQuery<HTMLElement>>,
	selector: string,
	description: string,
) => scope().find(selector).then(($elements) => {
	expect($elements, description).to.have.length(1);
	const element = $elements.get(0);
	assert.exists(element, description);
	(element as HTMLElement).click();
});

const clickExactActionableElement = (
	scope: () => Cypress.Chainable<JQuery<HTMLElement>>,
	selector: string,
	description: string,
) => scope().find(selector).then(($elements) => {
	const actionable = $elements.filter((_index, element) => {
		const rect = element.getBoundingClientRect();
		const style = element.ownerDocument.defaultView?.getComputedStyle(element);
		const disabled = ("disabled" in element && Boolean((element as HTMLButtonElement).disabled))
			|| element.getAttribute("aria-disabled") === "true";
		return element.getClientRects().length > 0
			&& rect.width > 0
			&& rect.height > 0
			&& style?.display !== "none"
			&& style?.visibility !== "hidden"
			&& !disabled;
	});
	expect(actionable, `${description} actionable matches`).to.have.length(1);
	const element = actionable.get(0);
	assert.exists(element, description);
	(element as HTMLElement).click();
});

const openAdvancedDetails = () =>
	clickExactVisibleElement(
		getVisibleModal,
		"details.advanced-details:visible > summary",
		"visible Advanced details summary",
	);

const getComponentCard = (name: string) =>
	getConfirmationContent()
		.find("[data-component-card]")
		.should("have.length", 1)
		.and("contain.text", name);

const getNeedsReviewCard = (name: string) =>
	getConfirmationContent()
		.find(".needs-review-card")
		.should("have.length", 1)
		.and("contain.text", name);

const resolveExactIonButtonHost = ($buttons: JQuery<HTMLElement>, label: string): HTMLElement => {
	const matches = $buttons.filter((_index, button) => button.textContent?.replace(/\s+/g, " ").trim() === label);
	expect(matches, `exact ${label} ion-button host`).to.have.length(1);
	const button = matches.get(0);
	assert.exists(button, `${label} ion-button host`);
	return button as HTMLElement;
};

const clickExactIonButton = (
	scope: () => Cypress.Chainable<JQuery<HTMLElement>>,
	selector: string,
	label: string,
) => scope().find(selector).then(($buttons) => {
	resolveExactIonButtonHost($buttons, label).click();
});

const setIonInput = (scope: () => Cypress.Chainable<JQuery<HTMLElement>>, label: string, value: string) => {
	scope()
		.find(`ion-input[label="${label}"]`)
		.should("have.length", 1)
		.find("input")
		.should("have.length", 1)
		.type(`{selectall}${value}`)
		.should("have.value", value);
};

const openManualDraftWithReviewedComponent = () => {
	visitFresh("/log-meal");
	cy.contains("ion-button.log-meal-option", "Enter manually")
		.then(($buttons) => {
			expect($buttons.length, "manual-entry chooser hosts").to.be.greaterThan(0);
			const button = $buttons.get($buttons.length - 1);
			assert.exists(button, "last manual-entry chooser host");
			button.click();
		});
	cy.url().should("include", "/meals/new");
	getConfirmationContent().should("exist");

	setIonInput(getConfirmationContent, "Meal name", "Chicken biryani dinner");
	clickExactIonButton(() => getComponentCard("New Item"), ".component-edit-button", "Edit details");
	setIonInput(getVisibleModal, "Item name", "chicken biryani");
	openAdvancedDetails();
	setIonInput(getVisibleModal, "kcals per serving", "420");
	setIonInput(getVisibleModal, "Carb per serving (g)", "58");
	setIonInput(getVisibleModal, "Protein per serving (g)", "24");
	setIonInput(getVisibleModal, "Fat per serving (g)", "12");
	setIonInput(getVisibleModal, "Saturated Fat per serving (g)", "3");
	setIonInput(getVisibleModal, "FII", "79");
	setIonInput(getVisibleModal, "Glycemic Index", "62");
	getVisibleModal()
		.contains("This item uses an insulin-index value you entered. The app has not verified that value.")
		.should("exist");
	clickExactActionableElement(getVisibleModal, "button[aria-label='Close item editor']", "Close item editor button");
	cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
	setIonInput(getConfirmationContent, "Amount", "1");
	getConfirmationContent().find(".needs-review-card").should("not.exist");
};

const openEditorAndRename = (currentName: string, nextName: string) => {
	clickExactIonButton(() => getComponentCard(currentName), ".component-edit-button", "Edit details");
	setIonInput(getVisibleModal, "Item name", nextName);
	clickExactActionableElement(getVisibleModal, "button[aria-label='Close item editor']", "Close item editor button");
	cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
};

describe("Campaign B B1-1 consequential component correction", () => {
	for (const [width, height, label] of VIEWPORTS) {
		it(`keeps correction consequential and usable at ${label}`, () => {
			cy.viewport(width, height);
			cy.window().then((autWindow) => {
				expect(autWindow.innerWidth).to.equal(width);
				expect(autWindow.innerHeight).to.equal(height);
			});
			stubBackend();
			openManualDraftWithReviewedComponent();

			getConfirmationContent()
				.find(".meal-name-helper")
				.should("have.length", 1)
				.and("have.text", "The name is a label. The items below are what the estimate uses.");
			getComponentCard("chicken biryani").contains("Entered by you").should("exist");
			getConfirmationContent().should(($page) => {
				const activeText = $page.text();
				expect(activeText).not.to.contain("Wrong type? Choose the closest name:");
				expect(activeText).not.to.contain("Keema");
				expect($page.find(".subtype-choice, .subtype-chip-row"), "no subtype or quick chip UI").to.have.length(0);
			});
			assertNoHorizontalOverflow();

			openEditorAndRename("chicken biryani", "vegetable biryani");
			getNeedsReviewCard("vegetable biryani")
				.should("contain.text", 'These values were for "chicken biryani". Check they still fit.');
			getNeedsReviewCard("vegetable biryani")
				.find(".carried-nutrition-summary")
				.should("contain.text", "420 kcal · 58 g carbs · 24 g protein · 12 g fat");
			getConfirmationContent().find("[aria-label='Save meal']").should("have.attr", "disabled");
			getConfirmationContent().find(".review-validation-error").should("contain.text", "vegetable biryani");
			getNeedsReviewCard("vegetable biryani").find(".needs-review-actions > ion-button").then(($buttons) => {
				const button = resolveExactIonButtonHost($buttons, "These still fit");
				const buttonRect = button.getBoundingClientRect();
				const cardRect = button.closest(".needs-review-card")!.getBoundingClientRect();
				expect(buttonRect.height, "confirmation action is touchable").to.be.at.least(43);
				expect(buttonRect.left, "confirmation action starts inside review card").to.be.at.least(cardRect.left);
				expect(buttonRect.right, "confirmation action ends inside review card").to.be.at.most(cardRect.right);
			});
			assertNoHorizontalOverflow();
			getNeedsReviewCard("vegetable biryani").then(($card) => $card[0].scrollIntoView({ block: "center" }));
			cy.screenshot(`${label}-needs-review`, { capture: "viewport" });

			clickExactIonButton(() => getNeedsReviewCard("vegetable biryani"), ".needs-review-actions > ion-button", "These still fit");
			getConfirmationContent().find(".needs-review-card").should("not.exist");
			getConfirmationContent().find("[aria-label='Save meal']").should("not.have.attr", "disabled");
			clickExactIonButton(() => getComponentCard("vegetable biryani"), ".component-edit-button", "Edit details");
			openAdvancedDetails();
			getVisibleModal().find('ion-input[label="FII"] input').should("have.value", "");
			getVisibleModal()
				.should("not.contain.text", "Source:")
				.and("not.contain.text", "This item uses an insulin-index value you entered.");

			// Focus and scroll through the real sheet at the narrow viewport: the
			// keyboard target and bottom actions must both remain reachable.
			getVisibleModal().find('ion-input[label="Protein per serving (g)"] input').focus().should("be.focused");
			getVisibleModal().find(".item-editor-actions").then(($actions) => $actions[0].scrollIntoView({ block: "end" }));
			cy.window().then((autWindow) =>
				getVisibleModal().find(".item-editor-actions").should(($actions) => {
					const actions = $actions[0].getBoundingClientRect();
					expect(actions.top, "editor actions enter the viewport after scroll").to.be.lessThan(autWindow.innerHeight);
					expect(actions.bottom, "editor actions remain below the viewport top").to.be.greaterThan(0);
				}),
			);
			assertNoHorizontalOverflow();
			clickExactActionableElement(getVisibleModal, "button[aria-label='Close item editor']", "Close item editor button");
			cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
			cy.screenshot(`${label}-review-confirmed`, { capture: "viewport" });

			openEditorAndRename("vegetable biryani", "lentil biryani");
			getNeedsReviewCard("lentil biryani")
				.should("contain.text", 'These values were for "vegetable biryani". Check they still fit.');
			clickExactIonButton(() => getComponentCard("lentil biryani"), ".component-edit-button", "Edit details");
			openAdvancedDetails();
			setIonInput(getVisibleModal, "Carb per serving (g)", "60");
			getVisibleModal().should("not.contain.text", "These values were for");
			clickExactActionableElement(getVisibleModal, "button[aria-label='Close item editor']", "Close item editor button");
			cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
			getConfirmationContent().find(".needs-review-card").should("not.exist");

			setIonInput(getConfirmationContent, "Meal name", "Descriptive dinner label only");
			getConfirmationContent().find(".needs-review-card").should("not.exist");
			getConfirmationContent().find("[aria-label='Save meal']").should("not.have.attr", "disabled");
			assertNoHorizontalOverflow();
			cy.screenshot(`${label}-nutrition-edit-resolved`, { capture: "viewport" });
		});
	}
});
