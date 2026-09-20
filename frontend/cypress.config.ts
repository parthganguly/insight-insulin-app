import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		baseUrl: "http://localhost:5173",
		// Ionic renders overlay text (toasts, alerts) inside shadow roots;
		// without this, cy.contains cannot see it.
		includeShadowDom: true,
		video: false,
		// The enabled reference run needs its own flagged build and a live
		// backend, so it never joins the intercepted legacy smoke suite.
		// It runs from cypress.config.r3b.ts instead.
		excludeSpecPattern: ["cypress/e2e/r3b-reference-enabled.cy.ts", "cypress/e2e/r3b-reference-off-backend.cy.ts"],
	},
});
