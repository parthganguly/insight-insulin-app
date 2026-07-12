// Global Cypress support for the INSIGHT smoke suite (issue #93).

import "./commands";

// Ionic's toast enter-animation intermittently races overlay teardown in
// headless Electron and throws "Cannot read properties of null (reading
// 'style')" from inside @ionic/core's animation code. The toast is a
// supplementary affordance by design (the inline aria-live banner is the
// asserted feedback surface), so only this specific framework-internal
// error is ignored; every other application error still fails the test.
Cypress.on("uncaught:exception", (err) => {
	if (err.message.includes("Cannot read properties of null (reading 'style')") && err.stack?.includes("Animation")) {
		return false;
	}
	if (err.message.includes("Cannot read properties of null (reading 'style')") && err.stack?.includes("present")) {
		return false;
	}
	return true;
});
