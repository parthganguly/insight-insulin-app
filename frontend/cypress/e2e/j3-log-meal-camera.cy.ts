/// <reference types="cypress" />

// Slice J3: Log Meal chooser and Smart Camera, redesigned as a restrained
// Porcelain folio and a viewfinder-first hierarchy (issue #111). Captures the
// states that are reliably automatable in a real browser without a photo
// capture: the chooser, and the camera's empty state (framing hint + Cancel
// in top chrome, collapsed privacy disclosure, disabled Analyze meal).
//
// Captured / loading / failure / privacy-reveal / Cancel-navigation states
// are exercised in the focused unit suite in
// src/pages/meal/AiMealAdd.campaignA.test.tsx with a mocked Camera plugin.
// A real end-to-end Cypress capture of those states was attempted here and
// abandoned: @capacitor/camera's web fallback for CameraSource.Photos calls
// the hidden `<input type="file">`'s own native `.click()`, which opens a
// genuine OS file-chooser dialog in headed Chrome. That races Chrome's CDP
// file-chooser interception in a way that could not be made deterministic
// (documented as a deviation in the J3 implementation report) — it is an
// automation-environment limitation, not a defect in the redesign.

import { assertNoHorizontalOverflow, stubBackend, visitFresh } from "../support/insightStubs";

type Appearance = "paper" | "ink";
type Viewport = [number, number];

const VIEWPORTS: Record<string, Viewport> = {
	"390x844": [390, 844],
	"320x700": [320, 700],
};

const persistedAppearance = (appearance: Appearance) => ({ state: { darkMode: appearance === "ink" }, version: 0 });

const assertMinimumTarget = (selector: string) => {
	cy.get(selector).should(($targets) => {
		for (const target of $targets) {
			const { width, height } = target.getBoundingClientRect();
			expect(width, `${selector} width`).to.be.at.least(44);
			expect(height, `${selector} height`).to.be.at.least(44);
		}
	});
};

for (const [label, [width, height]] of Object.entries(VIEWPORTS)) {
	for (const appearance of ["paper", "ink"] as Appearance[]) {
		describe(`J3 Log Meal chooser (${label}, ${appearance})`, () => {
			it("shows a restrained folio with three quiet choices", () => {
				cy.viewport(width, height);
				stubBackend({});
				visitFresh("/log-meal", { "app-settings": persistedAppearance(appearance) });

				cy.get("ion-app").should("have.attr", "data-appearance", appearance);
				cy.contains("How would you like to add it?").should("be.visible");
				for (const title of ["Take a photo", "Enter manually", "Log a previous meal again"]) {
					cy.contains("ion-button.log-meal-option", title).should("be.visible");
				}
				assertNoHorizontalOverflow();
				cy.get("ion-app").screenshot(`j3/chooser-${label}-${appearance}`, { overwrite: true });
			});
		});
	}
}

for (const [label, [width, height]] of Object.entries(VIEWPORTS)) {
	for (const appearance of ["paper", "ink"] as Appearance[]) {
		describe(`J3 Smart Camera (${label}, ${appearance})`, () => {
			it("empty: framing hint + Cancel in top chrome, collapsed privacy, Analyze disabled", () => {
				cy.viewport(width, height);
				stubBackend({});
				visitFresh("/meals/new/ai", { "app-settings": persistedAppearance(appearance) });

				cy.get("ion-app").should("have.attr", "data-appearance", appearance);
				cy.contains("Frame the whole meal").should("be.visible");
				cy.contains("Cancel").should("be.visible");
				cy.get("details.camera-privacy").should("not.have.attr", "open");
				cy.contains("Analyze meal").closest("ion-button").should("have.attr", "disabled");
				assertMinimumTarget("ion-button.camera-cancel-action");
				assertMinimumTarget("ion-button.camera-library-button");
				assertMinimumTarget("ion-button.camera-shutter-button");
				assertMinimumTarget("ion-button.camera-analyze-button");
				assertMinimumTarget("details.camera-privacy summary");
				assertMinimumTarget("ion-textarea.camera-note");
				assertNoHorizontalOverflow();
				cy.get("ion-app").screenshot(`j3/camera-empty-${label}-${appearance}`, { overwrite: true });
			});
		});
	}
}

for (const appearance of ["paper", "ink"] as Appearance[]) {
	describe(`J3 Smart Camera large text (320x700, ${appearance})`, () => {
		it("keeps empty controls reachable without horizontal overflow", () => {
			cy.viewport(320, 700);
			stubBackend({});
			visitFresh("/meals/new/ai", { "app-settings": persistedAppearance(appearance) });

			cy.document().then((document) => {
				document.documentElement.style.fontSize = "125%";
			});
			assertNoHorizontalOverflow();
			cy.contains("Take a photo").scrollIntoView().should("be.visible");
			cy.get("ion-textarea.camera-note textarea").focus().should("be.focused");
			cy.contains("Analyze meal").scrollIntoView().should("be.visible");
			cy.get("ion-app").screenshot(`j3/camera-empty-320x700-large-text-${appearance}`, { overwrite: true });
		});
	});
}
