import { defineConfig } from "cypress";

// R3B enabled acceptance only. This config deliberately never runs the legacy
// intercepted specs: the app under test is a separate production build made
// with VITE_REFERENCE_PREVIEW=1, served on its own port, talking to a real
// FastAPI process started by backend/tests/r3b_harness.py. Changing the flag
// after the Vite build would not change the bundle, so the build and the run
// are pinned together here.
export default defineConfig({
	e2e: {
		baseUrl: "http://127.0.0.1:5199",
		specPattern: "cypress/e2e/r3b-reference-enabled.cy.ts",
		supportFile: "cypress/support/e2e.ts",
		includeShadowDom: true,
		video: false,
		// Deliberately OUTSIDE cypress/screenshots: the legacy suite uses the
		// default screenshots folder and trashes it at the start of every run,
		// which would silently delete this run's acceptance captures.
		screenshotsFolder: "cypress/r3b-captures",
		env: {
			harnessOrigin: "http://127.0.0.1:8099",
		},
	},
});
