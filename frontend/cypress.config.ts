import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		baseUrl: "http://localhost:5173",
		// Ionic renders overlay text (toasts, alerts) inside shadow roots;
		// without this, cy.contains cannot see it.
		includeShadowDom: true,
		video: false,
	},
});
