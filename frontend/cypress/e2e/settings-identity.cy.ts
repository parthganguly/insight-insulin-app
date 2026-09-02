/// <reference types="cypress" />

import {
	AI_EXTRACTION_PRIVACY_DISCLOSURE,
	APP_DISCLAIMER,
	SETTINGS_DELETE_DISCLOSURE,
	SETTINGS_IMAGE_DISCLOSURE,
	SETTINGS_SAVED_MEALS_DISCLOSURE,
} from "../../src/utils/safetyCopy";
import { stubBackend, visitFresh } from "../support/insightStubs";

const seed = (darkMode: boolean | null, version = 1) => ({
	"app-settings": {
		state: { darkMode, gender: "female", age: 30, weight: 70, height: 175, activityLevel: "sedentary" },
		version,
	},
});

const selectAppearance = (value: "system" | "paper" | "ink") => {
	cy.get(`ion-radio[value="${value}"]`).click();
	cy.get("ion-radio-group").should("have.prop", "value", value);
};

const capture = (name: string) => cy.screenshot(`settings-identity/${name}`, { capture: "viewport", overwrite: true });

describe("Settings / identity", () => {
	it("renders the frozen contract, migrates legacy state, and switches appearance immediately", () => {
		stubBackend();
		cy.viewport(390, 844);
		visitFresh("/settings", seed(false, 0));

		cy.get(".settings-section").should("have.length", 3);
		cy.get(".settings-section h2").then(($headings) => {
			expect([...$headings].map((heading) => heading.textContent)).to.deep.equal(["Appearance", "About INSIGHT", "Data & privacy"]);
		});
		cy.get("ion-radio").should("have.length", 3);
		cy.get("ion-radio-group").should("have.attr", "aria-label", "Appearance");
		cy.get("ion-radio-group").should("have.prop", "value", "paper");
		cy.get('ion-radio[value="paper"]').should("have.attr", "role", "radio").and("have.attr", "aria-checked", "true");
		cy.get('ion-radio[value="paper"]').focus().should("be.focused").then(($radio) => {
			expect(getComputedStyle($radio[0]).outlineStyle).not.to.equal("none");
		});
		cy.contains(APP_DISCLAIMER).should("exist");
		cy.contains(AI_EXTRACTION_PRIVACY_DISCLOSURE).should("exist");
		cy.contains(SETTINGS_SAVED_MEALS_DISCLOSURE).should("exist");
		cy.contains(SETTINGS_IMAGE_DISCLOSURE).should("exist");
		cy.contains(SETTINGS_DELETE_DISCLOSURE).should("exist");
		cy.contains(/Gender|Age|Weight|Height|Activity Level|Calculated Data|BMR|TDEE/).should("not.exist");
		cy.window().its("localStorage").invoke("getItem", "app-settings").then((value) => {
			expect(JSON.parse(value ?? "").state).to.deep.equal({ darkMode: false });
		});
		capture("paper-390x844");

		selectAppearance("ink");
		cy.get('ion-radio[value="ink"]').should("have.attr", "aria-checked", "true");
		cy.get("html").should("have.class", "app-appearance-ink");
		capture("ink-390x844");

		selectAppearance("system");
		cy.window().its("localStorage").invoke("getItem", "app-settings").then((value) => {
			expect(JSON.parse(value ?? "").state).to.deep.equal({ darkMode: null });
		});
		capture("system-390x844");
	});

	it("remains readable and operable across the required responsive states", () => {
		stubBackend();
		cy.viewport(320, 700);
		visitFresh("/settings", seed(false));
		cy.document().then((document) => expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth));
		cy.get("ion-radio:visible").each(($radio) => expect($radio[0].getBoundingClientRect().height).to.be.at.least(44));
		capture("paper-320x700");

		cy.viewport(390, 844);
		cy.document().then((document) => { document.documentElement.style.fontSize = "133%"; });
		cy.document().then((document) => expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth));
		capture("paper-390x844-text-133");

		cy.document().then((document) => { document.documentElement.style.fontSize = ""; });
		cy.viewport(844, 390);
		cy.document().then((document) => expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth));
		capture("paper-landscape-844x390");
	});
});
