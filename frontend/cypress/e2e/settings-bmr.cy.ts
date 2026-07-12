/// <reference types="cypress" />

// Settings BMR/TDEE (issue #80's accepted test case, guarded here after the
// gender-constant fix in #87): Mifflin-St Jeor for male 30y/70kg/175cm
// sedentary is BMR 1648.75 (TDEE 1979); the female counterpart is 1482.75
// (TDEE 1779). Profile values are seeded synthetically via the persisted
// settings store.

import { stubBackend, visitFresh } from "../support/insightStubs";

const settingsSeed = (gender: "male" | "female") => ({
	"app-settings": {
		state: { darkMode: true, gender, age: 30, weight: 70, height: 175, activityLevel: "sedentary" },
		version: 0,
	},
});

describe("Settings BMR/TDEE", () => {
	it("shows the published male values for the accepted test case", () => {
		stubBackend();
		visitFresh("/settings", settingsSeed("male"));

		cy.contains("Calculated Data").should("be.visible");
		cy.contains("1648.75 kcal").should("be.visible");
		cy.contains("1979 kcal").should("be.visible");
	});

	it("shows the published female values for the accepted test case", () => {
		stubBackend();
		visitFresh("/settings", settingsSeed("female"));

		cy.contains("Calculated Data").should("be.visible");
		cy.contains("1482.75 kcal").should("be.visible");
		cy.contains("1779 kcal").should("be.visible");
	});
});
