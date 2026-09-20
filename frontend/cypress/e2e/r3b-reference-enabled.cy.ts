/// <reference types="cypress" />

/**
 * R3B enabled acceptance: real browser -> real FastAPI route table -> real
 * temporary SQLite -> fresh read.
 *
 * Nothing in the successful vertical path is intercepted. The only stubbing
 * is `cy.intercept` used to FAIL or DELAY a request on purpose, plus the
 * harness's own `/__harness/` controls, which exist solely in the test
 * launcher and never in production `main.py`.
 *
 * Run it with `frontend/cypress.config.r3b.ts`, against:
 *   backend  python -m tests.r3b_harness --port 8099   (INSIGHT_REFERENCE_PREVIEW=1)
 *   frontend vite preview --port 5199                  (VITE_REFERENCE_PREVIEW=1)
 */

import { assertNoHorizontalOverflow, getEnteredPage, shouldBeRendered, visitFresh } from "../support/insightStubs";

const HARNESS = Cypress.env("harnessOrigin") ?? "http://127.0.0.1:8099";
const CATALOG_PIN = "r2_sha256_6db5357ae368981b1e2781a2a2402d60d63850e7b59c63e757b654a39bdc51d9";

type HarnessCounts = { meals: number; meal_items: number; with_reference_evidence: number };
type HarnessRow = {
	id: string;
	meal_name: string;
	client_request_id: string | null;
	client_request_fingerprint: string | null;
	evidence_type: string;
	reference_result_json: string | null;
};

const control = (path: string) => cy.request(`${HARNESS}/__harness/${path}`);
const resetServer = () => control("reset");
const counts = () => control("counts").its("body") as Cypress.Chainable<HarnessCounts>;
const rows = () => control("rows").its("body") as Cypress.Chainable<HarnessRow[]>;
const setFault = (name: string, value: boolean) => control(`fault?name=${name}&value=${value ? "1" : "0"}`);

/**
 * `cy.request` is not re-issued by a retried assertion, so a count read right
 * after an async UI action can be read before the server has settled. These
 * helpers re-read until the expectation holds.
 */
const expectCounts = (expected: Partial<HarnessCounts>, message: string, attemptsLeft = 24) => {
	counts().then((value) => {
		const satisfied = Object.entries(expected).every(([key, want]) => value[key as keyof HarnessCounts] === want);
		if (satisfied) return;
		if (attemptsLeft === 0) {
			throw new Error(message + ": expected " + JSON.stringify(expected) + ", server reported " + JSON.stringify(value));
		}
		cy.wait(250, { log: false }).then(() => expectCounts(expected, message, attemptsLeft - 1));
	});
};

const expectRows = (predicate: (value: HarnessRow[]) => boolean, message: string, attemptsLeft = 24): Cypress.Chainable<HarnessRow[]> =>
	rows().then((value) => {
		if (predicate(value)) return cy.wrap(value, { log: false });
		if (attemptsLeft === 0) throw new Error(message + ": " + JSON.stringify(value));
		return cy.wait(250, { log: false }).then(() => expectRows(predicate, message, attemptsLeft - 1));
	}) as Cypress.Chainable<HarnessRow[]>;


// ---------------------------------------------------------------- UI helpers

const MEAL_NAME = "R3B synthetic meal";

const setMealName = (name: string) =>
	cy.contains("ion-input", "Meal name").find("input").first().clear({ force: true }).type(name, { force: true });

// The page heading is the MEAL name; item names appear on their own rows.
const openManualReferenceDraft = (mealName = MEAL_NAME) => {
	visitFresh("/log-meal");
	cy.contains("ion-button.log-meal-option", "Enter manually").click({ force: true });
	cy.location("pathname").should("eq", "/meals/new");
	shouldBeRendered("p.confirmation-kicker", "Experimental reference preview — draft, not saved");
	setMealName(mealName);
};

// Ionic keeps a dismissed modal in the DOM and animates the next one in, so
// the editor is addressed only once it has actually finished presenting.
const openItemEditor = (index = 0) => {
	cy.get(".reference-draft-item").eq(index).contains("ion-button", "Edit item").click({ force: true });
	cy.get("ion-modal:not(.overlay-hidden)", { timeout: 12000 }).should("be.visible");
	cy.get("ion-modal:not(.overlay-hidden):visible", { timeout: 12000 }).contains("ion-input", "Item name").should("exist");
};

const editorField = (label: string) =>
	cy.get("ion-modal:not(.overlay-hidden):visible", { timeout: 12000 }).contains("ion-input", label).find("input").first();

const typeField = (label: string, value: string) => {
	editorField(label).clear({ force: true });
	if (value !== "") editorField(label).type(value, { force: true });
};

const closeEditor = () => {
	cy.get("ion-modal:not(.overlay-hidden):visible").contains("ion-button", "Done").click({ force: true });
	cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
};

/** 150 g eaten of a food whose label reads "per 100 g: 200 kcal, 20 g carbohydrate". */
const fillReviewedItem = (name = "Low-fat vanilla ice cream") => {
	openItemEditor();
	typeField("Item name", name);
	typeField("Amount eaten (g)", "150");
	typeField("Nutrition is measured per this many g", "100");
	typeField("kcal per 100 g", "200");
	typeField("Carbohydrate (g) per 100 g", "20");
	closeEditor();
};

const selectPublishedReference = (sourceId = "BAO2011-002", index = 0) => {
	cy.get(".reference-draft-item").eq(index).contains("ion-button", "Choose a published reference").click({ force: true });
	cy.get("ion-modal:not(.overlay-hidden)", { timeout: 12000 }).should("be.visible");
	cy.get("ion-modal:not(.overlay-hidden):visible").find("input[type='search']").first().type(sourceId, { force: true });
	cy.get("ion-modal:not(.overlay-hidden):visible").contains("button", "Select reference").click({ force: true });
	cy.get(".reference-draft-item").eq(index).should("contain.text", `Selected reference: ${sourceId}`);
	cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
};

const skipReference = (index = 0) =>
	cy.get(".reference-draft-item").eq(index).contains("ion-button", "Continue without a reference").click({ force: true });

// Deliberate captures for the rendered-evidence bundle. Cypress only saves
// screenshots on failure by default, so each reviewed surface is captured
// explicitly at the reviewed phone width.
const capture = (name: string) => {
	// Ionic keeps the outgoing page mounted while it animates the next one in,
	// so a screenshot taken mid-transition double-exposes two screens. Wait for
	// the entering page to finish before capturing.
	cy.get(".ion-page-invisible").should("not.exist");
	cy.wait(450, { log: false });
	return cy.screenshot(name, { overwrite: true, capture: "viewport" });
};

/**
 * Applies a browser text-scaling factor the way a person raising their system
 * or browser font size would, then restores it.
 */
const withTextScale = (percent: number, body: () => void) => {
	cy.document().then((doc) => {
		doc.documentElement.style.fontSize = `${percent}%`;
	});
	body();
	cy.document().then((doc) => {
		doc.documentElement.style.removeProperty("font-size");
	});
};

// R08: the principal journey uses ORDINARY clicks. force:true exercises a
// state transition while bypassing Cypress's actionability check, so it
// cannot show that the control is visible, enabled and not covered.
// Both live in an always-visible dock (a `slot="fixed"` region and an
// IonFooter sibling), so scrolling them into view is meaningless and breaks
// the hit-test coordinates. An ordinary click still proves actionability:
// Cypress checks the control is visible, enabled and not covered.
// R08: the principal journey uses ORDINARY clicks, so Cypress's full
// actionability check (visible, not covered, not disabled, not animating) has
// to pass. Target the `ion-button` HOST, not the shadow `button.button-native`
// it renders: the aria-label is mirrored onto both, and hit-testing a shadow
// child retargets to its host, which Cypress then reports as the child being
// "covered by" its own parent. Clicking the host is the real user's target.
const CALCULATE = "ion-button[aria-label='Calculate estimate']";
const calculate = () => cy.get(CALCULATE).filter(":visible").first().click();
const saveToHistory = () => cy.contains("ion-footer ion-button", "Save to History").click();

const waitForCatalog = () =>
	cy.get(".reference-draft-item").first().contains("ion-button", "Choose a published reference").should("not.have.class", "button-disabled");

// CDP dispatch uses Chromium's native focus traversal/default activation,
// unlike a synthetic keydown or Cypress .type('{tab}'). No plugin needed.
const nativeKey = (value: "Tab" | "Enter" | " " | "Escape", shift = false) => {
	const codes = { Tab: 9, Enter: 13, " ": 32, Escape: 27 };
	const params = { key: value, code: value === " " ? "Space" : value, windowsVirtualKeyCode: codes[value], nativeVirtualKeyCode: codes[value], modifiers: shift ? 8 : 0 };
	return cy.then(() => Cypress.automation("remote:debugger:protocol", {
		command: "Input.dispatchKeyEvent", params: { ...params, type: "keyDown", ...(value === " " ? { text: " " } : value === "Enter" ? { text: "\r" } : {}) },
	})).then(() => Cypress.automation("remote:debugger:protocol", {
		command: "Input.dispatchKeyEvent", params: { ...params, type: "keyUp" },
	}));
};

// ---------------------------------------------------------------- T1

describe("R3B enabled reference preview", () => {
	beforeEach(() => {
		resetServer();
	});

	it("T1 — complete meal: reviewed 300 kcal, server load 207, one saved row, identical fresh read", () => {
		openManualReferenceDraft();
		waitForCatalog();
		cy.viewport(390, 844);
		fillReviewedItem();
		capture("01-review-per-100g-basis");
		cy.get(".reference-draft-item").first().contains("ion-button", "Choose a published reference").click({ force: true });
		cy.get("ion-modal:not(.overlay-hidden)", { timeout: 12000 }).should("be.visible");
		cy.get("ion-modal:not(.overlay-hidden):visible").find("input[type='search']").first().type("BAO2011-002", { force: true });
		capture("02-source-search-and-selection");
		cy.get("ion-modal:not(.overlay-hidden):visible").contains("button", "Select reference").click({ force: true });
		cy.get(".reference-draft-item").first().should("contain.text", "Selected reference: BAO2011-002");
		cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");

		// The preview request carries the per-unit conversion, done once.
		cy.intercept("POST", `${HARNESS}/reference-meals/preview`).as("preview");
		calculate();
		cy.wait("@preview").then(({ request }) => {
			const item = request.body.items[0];
			expect(item.quantity, "consumed units").to.equal(150);
			expect(item.kcal_per_unit, "200 kcal per 100 g becomes 2 per g").to.equal(2);
			expect(item.kcal_per_unit_unit).to.equal("g");
			expect(item.carb_g, "20 g per 100 g becomes 0.2 per g").to.equal(0.2);
			expect(item.source_record_id).to.equal("BAO2011-002");
			expect(item.expected_catalog_version ?? request.body.expected_catalog_version).to.equal(CATALOG_PIN);
			// No published FII ever rides in a legacy request field.
			expect(JSON.stringify(request.body)).to.not.match(/"fii"|fii_value/);
		});

		cy.location("pathname").should("eq", "/meals/estimate");
		// The stored value is 206.99999999999997; D1 display renders 207 and
		// the payload itself is never rounded.
		shouldBeRendered(".result-sheet", "Reference load:");
		cy.contains(".result-sheet p", "Reference load:").should("contain.text", "207");
		cy.contains("Reviewed nutrition").should("exist");
		cy.contains("dd", "300 kcal").should("exist");
		cy.contains("dd", "30 g").should("exist");
		capture("03-experimental-result-207");
		cy.contains("summary", "Source details for").click({ force: true });
		capture("04-source-evidence-and-sem");

		// A preview writes nothing.
		expectCounts({ meals: 0 }, "preview must not persist");

		saveToHistory();
		cy.location("pathname").should("match", /^\/meals\/saved\//);
		expectCounts({ meals: 1, with_reference_evidence: 1 }, "one saved row with evidence");

		// Clear the browser cache entirely and read the meal back from the server.
		rows().then((stored) => {
			const savedId = stored[0].id;
			const storedEvidence = stored[0].reference_result_json;
			cy.clearLocalStorage();
			visitFresh(`/meals/saved/${savedId}`);
			shouldBeRendered("h1", MEAL_NAME);
			capture("05-saved-detail-after-fresh-read");
			cy.contains("h3", "Low-fat vanilla ice cream").should("exist");
			cy.contains(".result-sheet p", "Reference load:").should("contain.text", "207");
			cy.contains("dd", "300 kcal").should("exist");
			cy.contains("dd", "30 g").should("exist");
			// Saving and re-reading changed no stored byte.
			rows().should((after) => {
				expect(after[0].id).to.equal(savedId);
				expect(after[0].reference_result_json).to.equal(storedEvidence);
			});
			expectCounts({ meals: 1 }, "reading a meal back creates nothing");
		});
	});

	it("T2 — an unavailable assessment is still savable and never coerces a source", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();

		// Second item: deliberately no reference and no energy.
		cy.contains("ion-button", "Add another item").click({ force: true });
		cy.get(".reference-draft-item").should("have.length", 2);
		openItemEditor(1);
		typeField("Item name", "Unreferenced side");
		typeField("Amount eaten (g)", "40");
		closeEditor();
		skipReference(1);

		calculate();
		cy.location("pathname").should("eq", "/meals/estimate");
		shouldBeRendered("h2", "Experimental estimate unavailable");
		capture("06-unavailable-but-savable");
		cy.contains("A complete estimate is unavailable for this meal.").should("exist");
		cy.contains("No published reference was selected.").should("exist");
		// No partial or substitute total.
		cy.get(".result-sheet").invoke("text").should("not.match", /Reference load:\s*0\b/);

		saveToHistory();
		cy.location("pathname").should("match", /^\/meals\/saved\//);
		expectCounts({ meals: 1 }, "an unavailable assessment is savable");
		cy.contains("h2", "Experimental estimate unavailable").should("exist");
	});

	it("T2b — an all-zero meal stays savable as no_consumed_items", () => {
		openManualReferenceDraft();
		waitForCatalog();
		openItemEditor();
		typeField("Item name", "Nothing eaten");
		typeField("Amount eaten (g)", "0");
		closeEditor();
		skipReference();

		calculate();
		cy.location("pathname").should("eq", "/meals/estimate");
		cy.contains("No positive-quantity items were entered.").should("exist");
		saveToHistory();
		expectCounts({ meals: 1 }, "an all-zero meal is savable");
	});

	it("T2c — an ineligible published record stays inspectable but cannot be selected", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		cy.get(".reference-draft-item").first().contains("ion-button", "Choose a published reference").click({ force: true });
		cy.get("ion-modal:not(.overlay-hidden):visible").find("input[type='search']").first().type("BELL2016-S1-001", { force: true });
		cy.get("ion-modal:not(.overlay-hidden):visible").within(() => {
			cy.contains("BELL2016-S1-001").should("exist");
			cy.contains("Reference only — not selectable").should("exist");
			cy.contains("button", "Select reference").should("not.exist");
			// The record's study and eligibility remain readable.
			cy.contains("summary", "Study and eligibility for BELL2016-S1-001").should("exist");
		});
		capture("07-ineligible-record-inspectable-not-selectable");
	});

	it("T3 — edit authority: title-only keeps the result, a rename clears the selection", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		// N1: synchronize with the entered estimate page before Adjust. The
		// location alone changes at transition start; interacting mid-flight
		// confuses the Ionic view stack (the next push lands on a stale view).
		// A real user cannot act until the page finishes entering.
		getEnteredPage("/meals/estimate", "main.result-sheet");

		// A title-only edit keeps the ready result and enters the first save.
		getEnteredPage("/meals/estimate", "main.result-sheet").contains("ion-button", "Adjust meal").click();
		getEnteredPage("/meals/new", "main.confirmation-sheet");
		cy.contains("ion-input", "Meal name").find("input").first().clear({ force: true }).type("Renamed before saving", { force: true });
		calculate();
		getEnteredPage("/meals/estimate", "main.result-sheet");
		cy.intercept("POST", `${HARNESS}/reference-meals`).as("save");
		saveToHistory();
		cy.wait("@save").then(({ request }) => {
			expect(request.body.meal_name, "latest title is frozen at first save").to.equal("Renamed before saving");
		});

		// A food-identity change clears source approval.
		resetServer();
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		openItemEditor();
		typeField("Item name", "A completely different food");
		closeEditor();
		cy.get(".reference-draft-item").first().should("contain.text", "No published reference selected");
		calculate();
		// Carried nutrition now needs explicit review; confirming it must not
		// restore the cleared selection.
		cy.get("#reference-validation-error").should("contain.text", "Review the carried nutrition");
		cy.get(".reference-draft-item").first().contains("ion-button", "These still fit").click({ force: true });
		cy.get(".reference-draft-item").first().should("contain.text", "No published reference selected");
	});

	it("T3b — a blank amount is not zero and blocks calculation with explicit copy", () => {
		openManualReferenceDraft();
		waitForCatalog();
		openItemEditor();
		typeField("Item name", "Missing portion");
		typeField("Amount eaten (g)", "");
		closeEditor();
		calculate();
		cy.get("#reference-validation-error").should("contain.text", "needs an amount eaten");
		cy.get("#reference-validation-error").should("contain.text", "Enter 0 if you did not eat any");
		expectCounts({ meals: 0 }, "a blocked draft writes nothing");
	});

	it("T3c — a failed recalculation stays readable with retry and gated Save", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		getEnteredPage("/meals/estimate", "main.result-sheet");
		// A material edit stales the ready result; browser back returns to it
		// without recalculating.
		getEnteredPage("/meals/estimate", "main.result-sheet").contains("ion-button", "Adjust meal").click();
		getEnteredPage("/meals/new", "main.confirmation-sheet");
		openItemEditor();
		typeField("Amount eaten (g)", "300");
		closeEditor();
		cy.go("back");
		getEnteredPage("/meals/estimate", "main.result-sheet");
		cy.contains("This estimate describes the meal before your changes.").should("be.visible");
		cy.contains("ion-footer ion-button", "Calculate again").should("be.visible");
		cy.get("ion-app").invoke("text").should("not.contain", "Save to History");

		// The recalculation fails: route, draft and retry survive, Save stays gated.
		let failPreview = true;
		cy.intercept("POST", `${HARNESS}/reference-meals/preview`, (req) => {
			if (failPreview) req.reply({ statusCode: 200, body: { malformed: true } });
			else req.continue();
		}).as("recalc");
		cy.contains("ion-footer ion-button", "Calculate again").click();
		cy.wait("@recalc");
		cy.contains("didn't answer in a usable way").should("be.visible");
		cy.location("pathname").should("eq", "/meals/estimate");
		cy.contains("ion-footer ion-button", "Calculate again").should("be.visible");
		cy.get("ion-app").invoke("text").should("not.contain", "Save to History");
		capture("23-recalculation-failure");

		// Retry succeeds; the save is gated on the fresh result only.
		cy.then(() => {
			failPreview = false;
		});
		cy.contains("ion-footer ion-button", "Calculate again").click();
		cy.wait("@recalc");
		getEnteredPage("/meals/estimate", "main.result-sheet");
		saveToHistory();
		cy.location("pathname").should("match", /^\/meals\/saved\//);
		expectCounts({ meals: 1 }, "retry saves exactly one row");
	});

	it("T4 — a stale catalog pin is rejected with no write", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();

		// The server names a different pin; the client must not adopt it.
		cy.intercept("POST", `${HARNESS}/reference-meals/preview`, {
			statusCode: 409,
			body: { detail: { code: "stale_catalog_version", catalog_version: `r2_sha256_${"a".repeat(64)}` } },
		}).as("stale");
		calculate();
		cy.wait("@stale");
		cy.location("pathname").should("eq", "/meals/new");
		cy.get(".reference-draft-item").first().should("contain.text", "needs review after a catalog change");
		capture("08-stale-catalog-needs-review");
		expectCounts({ meals: 0 }, "a stale pin writes nothing");

		// Calculating again while the selection is unreviewed stays blocked.
		calculate();
		cy.get("#reference-validation-error").should("contain.text", "needs review after a catalog change");
		expectCounts({ meals: 0 }, "an unreviewed selection writes nothing");
	});

	it("T4b — reusing a request UUID with different inputs is a request_id_conflict with no new row", () => {
		// First, a real committed save.
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		saveToHistory();
		cy.location("pathname").should("match", /^\/meals\/saved\//);

		expectRows((value) => value.length === 1, "one saved row before the conflict check").then((stored) => {
			const requestId = stored[0].client_request_id as string;
			// Same UUID, materially different inputs, straight at the server.
			cy.request({
				method: "POST",
				url: `${HARNESS}/reference-meals`,
				failOnStatusCode: false,
				body: {
					meal_name: "Conflicting attempt",
					expected_catalog_version: CATALOG_PIN,
					client_request_id: requestId,
					created_at: "2026-09-19T12:00:00Z",
					items: [{
						name: "Different food", quantity: 999, unit: "g",
						kcal_per_unit: 2, kcal_per_unit_unit: "g", nutrition_origin: "manual",
						carb_g: null, protein_g: null, fat_g: null, sat_fat_g: null, gi: null,
						source_record_id: "BAO2011-002",
					}],
				},
			}).then((response) => {
				expect(response.status).to.equal(409);
				expect(response.body.detail.code).to.equal("request_id_conflict");
			});
			expectCounts({ meals: 1 }, "no new row from a conflicting key");
		});
	});

	it("T5 — a committed save whose response is dropped: restart, no auto-POST, exact retry without the catalog", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();

		setFault("drop_next_save_response", true);
		saveToHistory();

		// The client never sees a response; the row still committed.
		cy.contains("The save may still have reached History", { timeout: 40000 }).should("exist");
		expectCounts({ meals: 1 }, "the write committed before the drop");

		rows().then((stored) => {
			const savedId = stored[0].id;
			const storedEvidence = stored[0].reference_result_json;
			const requestId = stored[0].client_request_id as string;

			// Restart the browser on the same storage.
			cy.reload();
			cy.location("pathname").should("not.eq", "/meals/saved/" + savedId);
			// No automatic POST on startup.
			cy.wait(1500);
			cy.contains("The save may still have reached History", { timeout: 20000 }).should("exist");
			capture("09-restart-retry-banner");
			expectCounts({ meals: 1 }, "no startup POST");

			// The journal entry survives the restart and is ambiguous again.
			cy.window().then((win) => {
				const key = `insight-reference-pending:v1:${requestId}`;
				const raw = win.localStorage.getItem(key);
				expect(raw, "journal entry survives restart").to.be.a("string");
				const entry = JSON.parse(raw as string);
				expect(entry.version).to.equal(1);
				expect(entry.intent.requestId).to.equal(requestId);
				expect(JSON.parse(entry.intent.wireJson).client_request_id).to.equal(requestId);
			});

			// Make the current catalog unavailable: an exact replay must still work.
			setFault("catalog_unavailable", true);
			cy.request({ url: `${HARNESS}/reference-meals/catalog`, failOnStatusCode: false })
				.its("status").should("equal", 503);

			cy.intercept("POST", `${HARNESS}/reference-meals`).as("retry");
			cy.get("[aria-label='Meal save status']").contains("ion-button", "Retry this save").click({ force: true });
			cy.wait("@retry").then(({ request, response }) => {
				expect(request.body.client_request_id, "identical UUID").to.equal(requestId);
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.legacy_compatibility.id, "original saved ID").to.equal(savedId);
			});

			// One durable result, unchanged stored bytes, journal cleared.
			expectCounts({ meals: 1 }, "an exact retry adds no row");
			expectRows((after) => after[0].reference_result_json === storedEvidence, "stored evidence unchanged by retry");
			cy.window().then((win) => {
				expect(win.localStorage.getItem(`insight-reference-pending:v1:${requestId}`)).to.equal(null);
			});
			setFault("catalog_unavailable", false);
		});
	});

	it("T6 — a journal write failure dispatches nothing and keeps the draft", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();

		cy.intercept("POST", `${HARNESS}/reference-meals`, () => {
			throw new Error("no POST may be dispatched without a journal entry");
		}).as("forbiddenSave");

		cy.window().then((win) => {
			const realSetItem = win.localStorage.setItem.bind(win.localStorage);
			cy.stub(win.localStorage, "setItem").callsFake((key: string, value: string) => {
				if (key.startsWith("insight-reference-pending:")) throw new DOMException("QuotaExceededError", "QuotaExceededError");
				realSetItem(key, value);
			});
		});

		saveToHistory();
		cy.wait(1200);
		expectCounts({ meals: 0 }, "no POST without a journal entry");
		// The draft and its ready estimate are still here.
		cy.location("pathname").should("eq", "/meals/estimate");
		cy.contains("ion-footer ion-button", "Save to History").should("exist");
	});

	it("T7 — mixed valid, legacy and corrupt history: one bad row hides nothing", () => {
		// Three real saves through the real route.
		for (const name of ["Healthy one", "Legacy one", "Corrupt one"]) {
			openManualReferenceDraft(name);
			waitForCatalog();
			fillReviewedItem();
			selectPublishedReference();
			calculate();
			saveToHistory();
			cy.location("pathname").should("match", /^\/meals\/saved\//);
		}
		expectCounts({ meals: 3 }, "three saved rows");

		expectRows((value) => value.length === 3, "three rows readable").then((stored) => {
			const legacyRow = stored.find((row) => row.meal_name === "Legacy one") as HarnessRow;
			const corruptRow = stored.find((row) => row.meal_name === "Corrupt one") as HarnessRow;
			cy.request(`${HARNESS}/__harness/corrupt?meal_id=${legacyRow.id}&mode=legacy`);
			cy.request(`${HARNESS}/__harness/corrupt?meal_id=${corruptRow.id}&mode=text`);

			cy.clearLocalStorage();
			visitFresh("/meals");
			capture("10-mixed-history");
			// Every entry is still listed.
			cy.contains("Healthy one").should("exist");
			cy.contains("Legacy one").should("exist");
			cy.contains("Corrupt one").should("exist");

			visitFresh(`/meals/saved/${legacyRow.id}`);
			shouldBeRendered("h2", "No experimental assessment saved");
			cy.contains("not recomputed from the current catalog").should("exist");

			visitFresh(`/meals/saved/${legacyRow.id}`);
			capture("11-no-assessment-saved");
			visitFresh(`/meals/saved/${corruptRow.id}`);
			shouldBeRendered("h2", "Saved experimental evidence can’t be verified");
			capture("12-evidence-cannot-be-verified");
			cy.contains("No replacement estimate is calculated").should("exist");
			// The corrupt row never borrows the healthy row's number.
			cy.get(".result-sheet").invoke("text").should("not.contain", "Reference load:");
		});
	});

	it("T7b — a slow first detail read shows loading, never Meal Not Found", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		saveToHistory();

		expectRows((value) => value.length === 1, "one saved row before the slow-read check").then((stored) => {
			const savedId = stored[0].id;
			cy.clearLocalStorage();
			// A generous hold so the loading window is unambiguous even while the
			// Ionic route is still transitioning.
			cy.intercept("GET", `${HARNESS}/reference-meals/${savedId}`, (req) => {
				req.on("response", (res) => res.setDelay(6000));
			}).as("slowDetail");
			visitFresh(`/meals/saved/${savedId}`);
			cy.location("pathname").should("eq", `/meals/saved/${savedId}`);
			cy.contains("Loading this saved meal…", { timeout: 15000 }).should("exist");
			cy.contains("Meal Not Found").should("not.exist");
			cy.wait("@slowDetail", { timeout: 20000 });
			cy.contains("h1", MEAL_NAME, { timeout: 15000 }).should("exist");
			shouldBeRendered("h1", MEAL_NAME);
		});
	});

	it("T8 — reuse copies suggestions, never a selection or an attached result", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		saveToHistory();

		expectRows((value) => value.length === 1, "one saved row to reuse").then((stored) => {
			const originalEvidence = stored[0].reference_result_json;
			visitFresh("/meals/previous");
			cy.contains(MEAL_NAME).click({ force: true });
			cy.location("pathname").should("eq", "/meals/new");
			// Reviewed values carry over for review; the source is a suggestion.
		cy.get(".reference-draft-item").first().should("contain.text", "suggested from the saved meal — review before it counts");
		// M03: a reuse must never be mislabelled as a catalog change.
		cy.get(".reference-draft-item").first().should("not.contain.text", "catalog change");
			// M03: amount eaten and the per-unit denominator render as a grouped
		// definition list (dt/dd), so their textContent has no ": " separator.
		// Assert both parts instead of the pre-M03 single-line wording.
		cy.get(".reference-draft-item").first().should("contain.text", "Amount eaten").and("contain.text", "150 g");
		cy.get(".reference-draft-item").first().should("contain.text", "Nutrition values are per").and("contain.text", "1 g");
			capture("13-reuse-suggestion-not-selection");
			// The original stored bytes are untouched.
			expectRows((after) => after[0].reference_result_json === originalEvidence, "reuse leaves the original untouched");
			expectCounts({ meals: 1 }, "reuse creates no row");
		});
	});

	it("T8b — deletion is blocked while a retry record is unresolved, then works", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		setFault("drop_next_save_response", true);
		saveToHistory();
		cy.contains("The save may still have reached History", { timeout: 40000 }).should("exist");
		expectCounts({ meals: 1 }, "the blocked-delete case needs a committed row");

		expectRows((value) => value.length === 1, "one saved row").then((stored) => {
			const savedId = stored[0].id;
			cy.visit(`/meals/saved/${savedId}`);
			cy.contains("Resolve pending saves before deleting a saved meal.").should("exist");
			capture("14-delete-blocked-by-unresolved-retry");
			cy.get("[aria-label='Delete saved meal']").first().click({ force: true });
			cy.contains("Resolve pending saves before deleting a saved meal.").should("exist");
			cy.get("ion-alert").contains("button", "OK").click({ force: true });
			expectCounts({ meals: 1 }, "nothing was deleted while a retry is unresolved");

			// Resolve the retry, then delete for real.
			cy.get("[aria-label='Meal save status']").contains("ion-button", "Retry this save").click({ force: true });
			// The retry entry is resolved; a completion notice may remain.
			cy.contains("ion-button", "Retry this save").should("not.exist");
			cy.contains("Resolve pending saves before deleting").should("not.exist");
			cy.visit(`/meals/saved/${savedId}`);
			cy.get("[aria-label='Delete saved meal']").first().click({ force: true });
			cy.get("ion-alert").contains("button", "Delete").click({ force: true });
			expectCounts({ meals: 0 }, "deletion works once the retry is resolved");
		});
	});

	it("T9a — injected generic catalog 404 is handled as unavailable (fault simulation)", () => {
		// Fault simulation only: a generic 404 with no protocol body is
		// injected for the catalog. The genuine configured OFF-backend pairing
		// (real main:app without the flag) is covered separately by
		// r3b-reference-off-backend.cy.ts against the same enabled bundle.
		cy.intercept("GET", `${HARNESS}/reference-meals/catalog`, { statusCode: 404, body: { detail: "Not Found" } }).as("offCatalog");
		cy.intercept("POST", `${HARNESS}/meals`, () => {
			throw new Error("reference mode must never fall back to the legacy save route");
		});
		cy.intercept("POST", `${HARNESS}/meals/preview`, () => {
			throw new Error("reference mode must never fall back to the legacy preview route");
		});

		openManualReferenceDraft();
		cy.wait("@offCatalog");
		cy.contains("The published reference catalog isn't available right now").should("exist");
		capture("15-backend-unavailable-fails-closed");
		cy.get(".reference-draft-item").first().contains("ion-button", "Choose a published reference").should("have.class", "button-disabled");
		// No legacy headline flashes anywhere in this state.
		cy.get("ion-app").invoke("text").should("not.match", /Relative score|7-day index/);
	});

	it("T9b — reference mode never requests the legacy chronic trend", () => {
		let chronicCalls = 0;
		cy.intercept("GET", `${HARNESS}/metrics/chronic*`, (req) => {
			chronicCalls += 1;
			req.reply({ statusCode: 200, body: {} });
		}).as("chronic");

		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		saveToHistory();

		visitFresh("/dashboard");
		cy.contains(MEAL_NAME).should("exist");
		capture("16-home-without-trend");
		cy.wait(1200).then(() => {
			expect(chronicCalls, "/metrics/chronic must never be called in reference mode").to.equal(0);
		});
		cy.get("ion-app").invoke("text").should("not.contain", "7-day index");
	});

	it("T10 — a malformed 200 is ambiguous, not a confirmed save", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();

		cy.intercept("POST", `${HARNESS}/reference-meals`, {
			statusCode: 200,
			body: { assessment_state: "sideways", assessment: null, reasons: [], legacy_compatibility: {} },
		}).as("malformed");
		saveToHistory();
		cy.wait("@malformed");
		cy.contains("The save may still have reached History").should("exist");
		cy.location("pathname").should("eq", "/meals/estimate");
	});

	it("T10b — a plain HTML 503 keeps its status and never becomes an unavailable result", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();

		cy.intercept("POST", `${HARNESS}/reference-meals/preview`, {
			statusCode: 503,
			headers: { "content-type": "text/html" },
			body: "<html><body>Service Unavailable</body></html>",
		}).as("html503");
		calculate();
		cy.wait("@html503");
		cy.location("pathname").should("eq", "/meals/new");
		// A transport/protocol failure is never a fabricated unavailable result.
		cy.get("ion-app").invoke("text").should("not.contain", "Experimental estimate unavailable");
		expectCounts({ meals: 0 }, "an HTML 503 writes nothing");
	});

	it("T11 — rendered display boundaries and a dock that stays reachable", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();

		for (const [width, height] of [[320, 700], [390, 844], [844, 390], [1280, 800]] as const) {
			cy.viewport(width, height);
			shouldBeRendered(".result-sheet", "Reference load:");
			assertNoHorizontalOverflow();
			cy.contains("ion-footer ion-button", "Save to History").should(($button) => {
				const rect = $button[0].getBoundingClientRect();
				expect(rect.height, "save target height").to.be.at.least(44);
				expect(rect.width, "save target width").to.be.at.least(44);
			});
			capture(`18-result-${width}x${height}`);
		}

		// Enlarged text on a dense state: the dock must stay reachable and
		// nothing may start scrolling sideways.
		cy.viewport(390, 844);
		for (const percent of [133, 200]) {
			withTextScale(percent, () => {
				cy.contains("summary", "What this doesn").click({ force: true });
				shouldBeRendered(".result-sheet", "Reference load:");
				assertNoHorizontalOverflow();
				cy.contains("ion-footer ion-button", "Save to History").should(($button) => {
					const rect = $button[0].getBoundingClientRect();
					expect(rect.height, "save target height at enlarged text").to.be.at.least(44);
					expect(rect.top, "the dock stays on screen at enlarged text").to.be.lessThan(844);
					expect(rect.bottom, "the dock is not pushed off the bottom").to.be.at.most(845);
				});
				capture(`19-result-text-${percent}pct`);
			});
		}
	});

	it("T11b — the review screen survives enlarged text with its dock reachable", () => {
		openManualReferenceDraft();
		waitForCatalog();
		cy.viewport(320, 700);
		fillReviewedItem();
		selectPublishedReference();
		for (const percent of [133, 200]) {
			withTextScale(percent, () => {
				assertNoHorizontalOverflow();
				cy.get(CALCULATE).first().should(($button) => {
					const rect = $button[0].getBoundingClientRect();
					expect(rect.height, "calculate target height").to.be.at.least(44);
					expect(rect.bottom, "the dock is not pushed off the bottom").to.be.at.most(701);
				});
				capture(`20-review-text-${percent}pct`);
			});
		}
	});

	it("T12 — an unsupported journal version is retained, surfaced and never auto-posted", () => {
		const orphan = "11111111-2222-4333-8444-555555555555";
		cy.intercept("POST", `${HARNESS}/reference-meals`, () => {
			throw new Error("an unreadable journal entry must never be dispatched");
		});

		visitFresh("/dashboard", {});
		cy.window().then((win) => {
			win.localStorage.setItem(`insight-reference-pending:v1:${orphan}`, JSON.stringify({
				version: 99,
				intent: { contract: "reference", requestId: orphan },
			}));
		});
		cy.reload();

		cy.contains("Retry record can't be read").should("exist");
		cy.contains("remove it explicitly to continue").should("exist");
		capture("17-unreadable-retry-record");
		cy.wait(1200);
		expectCounts({ meals: 0 }, "no auto-POST from a bad entry");

		// The entry stays on disk until it is removed explicitly.
		cy.window().then((win) => {
			expect(win.localStorage.getItem(`insight-reference-pending:v1:${orphan}`)).to.be.a("string");
		});
		cy.contains("ion-button", "Remove this retry record").click({ force: true });
		cy.window().then((win) => {
			expect(win.localStorage.getItem(`insight-reference-pending:v1:${orphan}`)).to.equal(null);
		});
	});

	// ---------------------------------------------------------------- R08 gaps

	it("G1 — cache quota failure AFTER a confirmed server save reports honestly and does not re-POST", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();

		let saveCount = 0;
		cy.intercept("POST", `${HARNESS}/reference-meals`, (req) => {
			saveCount += 1;
			req.continue();
		}).as("save");

		// The server save succeeds; only the local cache write fails.
		cy.window().then((win) => {
			const realSetItem = win.localStorage.setItem.bind(win.localStorage);
			cy.stub(win.localStorage, "setItem").callsFake((key: string, value: string) => {
				if (key === "insight-meals") throw new DOMException("QuotaExceededError", "QuotaExceededError");
				realSetItem(key, value);
			});
		});

		saveToHistory();
		cy.wait("@save");
		expectCounts({ meals: 1 }, "the server save really committed");
		// Honest: saved on the server, no offline copy — and NOT a duplicate POST.
		cy.contains("offline copy unavailable", { timeout: 15000 }).should("exist");
		cy.wait(1000).then(() => expect(saveCount, "no duplicate POST after a cache failure").to.equal(1));
		expectCounts({ meals: 1 }, "still exactly one saved row");
	});

	it("G2 — journal removal failure keeps a confirmed save and pauses retry/delete", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();

		// Let the save succeed, then refuse to delete its journal entry.
		let blockRemoval = true;
		cy.window().then((win) => {
			const realRemove = win.localStorage.removeItem.bind(win.localStorage);
			cy.stub(win.localStorage, "removeItem").callsFake((key: string) => {
				if (blockRemoval && key.startsWith("insight-reference-pending:")) return;
				realRemove(key);
			});
		});
		// No background retry may ever dispatch: count every save POST.
		let postCount = 0;
		cy.intercept("POST", `${HARNESS}/reference-meals`, (req) => {
			postCount += 1;
			req.continue();
		}).as("countedSaves");

		saveToHistory();
		cy.wait("@countedSaves");
		expectCounts({ meals: 1 }, "the save committed");
		// Confirmed in memory, cleanup still required — and saving/deleting paused.
		cy.contains("Saved on server", { timeout: 15000 }).should("exist");
		cy.contains("clear the retry record").should("exist");
		cy.contains("ion-button", "Clear retry record").should("exist");

		let deleteCount = 0;
		cy.intercept("DELETE", `${HARNESS}/reference-meals/*`, (req) => { deleteCount += 1; req.continue(); });
		cy.contains("ion-button", "Open saved meal").click();
		// The persistent recovery banner covers the lower dock; keyboard access
		// still reaches Delete and must invoke the same blocked action.
		cy.get("ion-button[aria-label='Delete saved meal']").shadow().find("button").focus();
		nativeKey("Enter");
		cy.get("ion-alert:not(.overlay-hidden)").should("contain.text", "Resolve pending saves");
		cy.get("ion-alert:not(.overlay-hidden)").contains("button", "Delete").should("not.exist");
		cy.get("ion-alert:not(.overlay-hidden)").contains("button", "OK").click();
		cy.then(() => expect(deleteCount, "blocked deletion dispatches no DELETE").to.equal(0));
		capture("g2-blocked-delete-and-cleanup");

		// Attempt the blocked cleanup: it dispatches nothing and clears nothing.
		cy.contains("ion-button", "Clear retry record").click();
		cy.contains("clear the retry record").should("exist");
		expectCounts({ meals: 1 }, "still exactly one saved row");
		cy.wait(1000).then(() => expect(postCount, "no retry POST while blocked").to.equal(1));

		// Storage recovers: the same cleanup now succeeds and the banner leaves.
		cy.then(() => {
			blockRemoval = false;
		});
		expectRows((value) => value.length === 1, "one saved row").then((stored) => {
			const savedId = stored[0].id;
			cy.contains("ion-button", "Clear retry record").click();
			// The cleanup control itself leaves; the dismissible notice may
			// remain until dismissed and carries no action.
			cy.contains("ion-button", "Clear retry record").should("not.exist");
			// Resumption: deleting the saved meal works again, with no extra save traffic.
			cy.visit(`/meals/saved/${savedId}`);
			cy.get("ion-button[aria-label='Delete saved meal']").click();
			cy.get("ion-alert:not(.overlay-hidden)").contains("button", "Delete").click();
			expectCounts({ meals: 0 }, "resumed deletion removes the row");
			cy.then(() => expect(postCount, "no save POST beyond the original").to.equal(1));
		});
	});

	it("G2b — failed cache replacement preserves raw bytes, then explicit retry resumes persistence", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		saveToHistory();
		expectRows((value) => value.length === 1, "one saved row").then((stored) => {
			let failWrites = true;
			let posts = 0;
			cy.intercept("POST", `${HARNESS}/reference-meals`, (req) => { posts += 1; req.continue(); });
			cy.visit("/meals", { onBeforeLoad(win) {
				win.localStorage.setItem("insight-meals", "{broken");
				const set = win.Storage.prototype.setItem;
				win.Storage.prototype.setItem = function (key, value) {
					if (key === "insight-meals" && failWrites) throw new win.DOMException("QuotaExceededError", "QuotaExceededError");
					return set.call(this, key, value);
				};
			} });
			cy.get("ion-item.journal-entry-card:visible").should("have.length", 1);
			cy.contains("ion-button", "Replace this device's saved copy").click();
			cy.contains("could not be replaced").should("be.visible");
			cy.window().should((win) => expect(win.localStorage.getItem("insight-meals")).to.equal("{broken"));
			capture("g2b-cache-replacement-failed");
			cy.then(() => { failWrites = false; });
			cy.contains("ion-button", "Replace this device's saved copy").click();
			cy.window().should((win) => {
				const meals = JSON.parse(win.localStorage.getItem("insight-meals")!).state.meals;
				expect(meals.map((meal: { id: string }) => meal.id)).to.deep.equal([stored[0].id]);
			});
			cy.reload();
			cy.get("ion-item.journal-entry-card:visible").should("have.length", 1);
			cy.contains("Replace this device's saved copy").should("not.exist");
			cy.then(() => expect(posts, "cache recovery never saves a duplicate").to.equal(0));
			capture("g2b-cache-replacement-recovered");
		});
	});

	it("G3 — offline saved detail: with a valid cache, and with no usable cache", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		saveToHistory();

		expectRows((value) => value.length === 1, "one saved row").then((stored) => {
			const savedId = stored[0].id;

			// (a) A valid cached attachment exists, but the server is unreachable.
			cy.intercept("GET", `${HARNESS}/reference-meals/${savedId}`, { forceNetworkError: true }).as("offlineDetail");
			cy.visit(`/meals/saved/${savedId}`);
			cy.contains("Showing this device's saved copy", { timeout: 15000 }).should("exist");
			capture("21-offline-with-valid-cache");

			// (b) No usable cache at all: the copy claim must NOT appear.
			cy.clearLocalStorage();
			visitFresh(`/meals/saved/${savedId}`);
			cy.contains("no saved evidence for this meal", { timeout: 15000 }).should("exist");
			cy.get("ion-app").invoke("text").should("not.contain", "Showing this device's saved copy");
			capture("22-offline-without-cache");
		});
	});

	it("G4 — a stale detail failure cannot delete a record a newer read already settled", { defaultCommandTimeout: 15000 }, () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();
		saveToHistory();
		expectRows((value) => value.length === 1, "one saved row").then((stored) => {
			const savedId = stored[0].id;
			// Establish the history page before arranging the race. From here
			// all navigation is SPA navigation in this same window/store.
			cy.visit("/meals");
			cy.get("ion-item.journal-entry-card:visible").should("have.length", 1);
			let appWindow: Window;
			let started = 0;
			cy.window().then((win) => {
				appWindow = win;
				const fetch = win.fetch.bind(win);
				win.fetch = (...args) => {
					if (args[0] === `${HARNESS}/reference-meals/${savedId}`) started += 1;
					return fetch(...args);
				};
			});
			cy.then(() => Cypress.automation("remote:debugger:protocol", { command: "Network.setCacheDisabled", params: { cacheDisabled: true } }));
			let calls = 0;
			let releaseOld: () => void;
			const held = new Promise<void>((resolve) => { releaseOld = resolve; });
			const completed: string[] = [];
			cy.intercept("GET", `${HARNESS}/reference-meals/${savedId}`, (req) => {
				calls += 1;
				if (calls === 1) {
					req.alias = "olderDetail";
					req.on("after:response", () => { completed.push("older"); });
					return held.then(() => req.reply({ statusCode: 404, body: { detail: { code: "meal_not_found" } } }));
				}
				req.alias = "newerDetail";
				req.on("after:response", () => { completed.push("newer"); });
				req.continue();
			});
			cy.get("ion-item.journal-entry-card:visible").first().click();
			cy.wrap(null).should(() => expect(calls, "older read started").to.equal(1));
			getEnteredPage(`/meals/saved/${savedId}`, ".result-sheet").find("h1").should("have.text", MEAL_NAME);
			cy.go("back");
			cy.location("pathname").should("eq", "/meals");
			// A popped Ionic view must actually unmount before opening it again.
			cy.get(".result-sheet").should("not.exist");
			cy.get("ion-item.journal-entry-card:visible").first().click();
			cy.wrap(null).should(() => expect(started, "two same-ID application fetches started").to.equal(2));
			cy.wait("@newerDetail").its("response.statusCode").should("eq", 200);
			const assertCurrent = () => {
				cy.window().should((win) => {
					expect(win === appWindow, "same application lifetime").to.equal(true);
					const saved = JSON.parse(win.localStorage.getItem("insight-meals") ?? "null");
					const meal = saved.state.meals.find((m: { id: string }) => m.id === savedId);
					expect(meal.referenceAttachment.state).to.equal("evaluated");
				});
				cy.location("pathname").should("eq", `/meals/saved/${savedId}`);
				getEnteredPage(`/meals/saved/${savedId}`, ".result-sheet").find("h1").should("have.text", MEAL_NAME);
				getEnteredPage(`/meals/saved/${savedId}`, ".result-sheet").contains("h2", "Experimental meal insulin-demand estimate").should("be.visible");
				getEnteredPage(`/meals/saved/${savedId}`, ".result-sheet").contains("p", "Reference load:").should("contain.text", "207");
				getEnteredPage(`/meals/saved/${savedId}`, ".result-sheet").should("not.contain.text", "Meal Not Found").and("not.contain.text", "Cached on this device");
			};
			assertCurrent();
			cy.then(() => {
				expect(calls).to.equal(2);
				expect(completed).to.deep.equal(["newer"]);
				releaseOld();
			});
			cy.wait("@olderDetail").its("response.statusCode").should("eq", 404);
			cy.wrap(null).should(() => expect(completed).to.deep.equal(["newer", "older"]));
			assertCurrent();
			capture("g4-newer-evidence-survives-older-absence");
			expectCounts({ meals: 1 }, "the server row is untouched by a stale error");
			cy.then(() => Cypress.automation("remote:debugger:protocol", { command: "Network.setCacheDisabled", params: { cacheDisabled: false } }));
		});
	});

	// G5 (camera recovery) is deliberately NOT a browser scenario: camera
	// recovery only engages on a native platform, so a Cypress run cannot
	// exercise it honestly. Its round-trip is covered at the real boundary in
	// src/utils/referenceCorrections.test.ts instead.

	it("G6 — the principal journey uses ordinary interaction throughout", () => {
		// No forced input on this path: every step uses the same actionability
		// a person gets (entered pages, visible controls, real clicks/typing).
		// Shared forced helpers stay untouched for the other scenarios.
		visitFresh("/log-meal");
		cy.contains("ion-button.log-meal-option", "Enter manually").click();
		getEnteredPage("/meals/new", "main.confirmation-sheet");
		cy.contains("ion-input", "Meal name").find("input").first().clear().type(MEAL_NAME);
		cy.get(".reference-draft-item").first().contains("ion-button", "Choose a published reference").should("not.have.class", "button-disabled");
		// Editor: ordinary open, ordinary typing, ordinary Done.
		cy.get(".reference-draft-item").first().contains("ion-button", "Edit item").click();
		cy.get("ion-modal:not(.overlay-hidden):visible").should("be.visible");
		const typeFieldOrdinary = (label: string, value: string) => {
			cy.get("ion-modal:not(.overlay-hidden):visible").contains("ion-input", label).find("input").first().clear();
			if (value !== "") cy.get("ion-modal:not(.overlay-hidden):visible").contains("ion-input", label).find("input").first().type(value);
		};
		typeFieldOrdinary("Item name", "Low-fat vanilla ice cream");
		typeFieldOrdinary("Amount eaten (g)", "150");
		typeFieldOrdinary("Nutrition is measured per this many g", "100");
		typeFieldOrdinary("kcal per 100 g", "200");
		typeFieldOrdinary("Carbohydrate (g) per 100 g", "20");
		cy.get("ion-modal:not(.overlay-hidden):visible").contains("ion-button", "Done").click();
		cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
		// Picker: ordinary open, ordinary search, ordinary native-button select.
		cy.get(".reference-draft-item").first().contains("ion-button", "Choose a published reference").click();
		cy.get("ion-modal:not(.overlay-hidden)", { timeout: 12000 }).should("be.visible");
		cy.get("ion-modal:not(.overlay-hidden):visible").find("input[type='search']").first().type("BAO2011-002");
		cy.get("ion-modal:not(.overlay-hidden):visible").contains("button", "Select reference").click();
		cy.get(".reference-draft-item").first().should("contain.text", "Selected reference: BAO2011-002");
		cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
		// calculate()/saveToHistory() use real actionability checks.
		calculate();
		getEnteredPage("/meals/estimate", "main.result-sheet");
		saveToHistory();
		cy.location("pathname").should("match", /^\/meals\/saved\//);
		expectCounts({ meals: 1 }, "an ordinary path saves exactly one row");
	});

	it("G7 — paper and ink both render the result with adequate contrast", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();

		const luminance = (color: string): number => {
			const [r, g, b] = (color.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
			const channel = (value: number) => {
				const srgb = value / 255;
				return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
			};
			return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
		};

		for (const appearance of ["paper", "ink"] as const) {
			cy.document().then((doc) => {
				doc.documentElement.classList.remove("app-appearance-paper", "app-appearance-ink");
				doc.documentElement.classList.add(`app-appearance-${appearance}`);
			});
			cy.contains(".result-sheet p", "Reference load:").should(($el) => {
				const style = window.getComputedStyle($el[0]);
				let node: HTMLElement | null = $el[0];
				let background = "rgba(0, 0, 0, 0)";
				while (node) {
					const candidate = window.getComputedStyle(node).backgroundColor;
					if (candidate && !candidate.includes("rgba(0, 0, 0, 0)")) { background = candidate; break; }
					node = node.parentElement;
				}
				const light = Math.max(luminance(style.color), luminance(background));
				const dark = Math.min(luminance(style.color), luminance(background));
				const ratio = (light + 0.05) / (dark + 0.05);
				expect(ratio, `${appearance} result text contrast`).to.be.greaterThan(4.5);
			});
			capture(`24-result-${appearance}`);
		}
	});

	it("G8 — native keyboard entry, containment, dismissal and operable focus return", () => {
		const key = nativeKey;
		const deepest = (doc: Document) => {
			let el = doc.activeElement;
			while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
			return el;
		};
		let triggerControl: HTMLElement;
		const returned = () => cy.document().should((doc) => {
			expect(deepest(doc), "operable native trigger has focus").to.equal(triggerControl);
			expect(triggerControl.matches(":disabled")).to.equal(false);
		});
		const presented = new WeakSet<Element>();
		const modal = () => cy.get("ion-modal:not(.overlay-hidden):visible").should("be.visible").should(($el) => expect(presented.has($el[0]), "modal did present").to.equal(true));
		const closed = () => cy.get("ion-modal:not(.overlay-hidden):visible").should("not.exist");
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		cy.document().then((doc) => {
			doc.addEventListener("ionModalDidPresent", (event) => presented.add(event.target as Element));
			doc.addEventListener("ionModalWillDismiss", (event) => presented.delete(event.target as Element));
		});
		cy.get(".reference-draft-item").first().contains("ion-button", "Choose a published reference").shadow().find("button").then(($el) => { triggerControl = $el[0]; });
		// Begin at the preceding operable control, then enter the picker by Tab.
		cy.get(".reference-draft-item").first().contains("ion-button", "Edit item").shadow().find("button").focus();
		key("Tab");
		returned();
		key("Tab", true);
		cy.get(".reference-draft-item").first().contains("ion-button", "Edit item").shadow().find("button").then(($el) => cy.document().should((doc) => expect(deepest(doc)).to.equal($el[0])));
		key("Tab");
		returned();
		key("Enter");
		modal().find("input[type='search']").type("BAO2011-002");
		let first: HTMLElement;
		let last: HTMLElement;
		modal().find("ion-buttons[slot='start'] ion-button").shadow().find("button").then(($el) => { first = $el[0]; });
		modal().contains("ion-button", "Refresh published references").shadow().find("button").then(($el) => { last = $el[0]; }).focus();
		key("Tab");
		cy.document().should((doc) => expect(deepest(doc), "forward wrap stays inside modal").to.equal(first));
		key("Tab", true);
		cy.document().should((doc) => expect(deepest(doc), "reverse wrap stays inside modal").to.equal(last));
		key("Tab");
		key("Tab");
		modal().find("input[type='search']").then(($el) => cy.document().should((doc) => expect(deepest(doc), "sequential search entry").to.equal($el[0])));
		capture("25-picker-modal-keyboard-focus");
		key("Escape");
		closed();
		returned();
		key(" ");
		modal();
		// Modal initially owns focus; first Tab reaches the header close button.
		key("Tab");
		modal().find("ion-buttons[slot='start'] ion-button").shadow().find("button").then(($el) => cy.document().should((doc) => expect(deepest(doc)).to.equal($el[0])));
		key("Enter");
		closed();
		returned();
		key("Enter");
		modal().find("input[type='search']").type("BAO2011-002");
		modal().contains("button", "Select reference").focus();
		key(" ");
		closed();
		cy.get(".reference-draft-item").first().should("contain.text", "Selected reference: BAO2011-002");
		returned();
		key("Enter");
		modal();
		key("Escape");
		closed();
		returned();
		capture("g8-keyboard-reopened-and-returned");
		// Once the modal is dismissed the underlying controls are operable.
		// During will-dismiss Ionic still traps focus, so moving an underlying
		// control then would not represent a successful user focus movement.
		key("Enter");
		modal();
		key("Escape");
		closed();
		returned();
		cy.get("ion-input.confirmation-meal-name input").focus().type(" updated").then(($el) => {
			cy.window().then((win) => new Cypress.Promise((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve))));
			cy.document().should((doc) => expect(deepest(doc), "deliberate focus movement is preserved").to.equal($el[0]));
		});
		// Leave through the existing discard action; no app focus timer may
		// bring focus back to the retained/detached review page.
		cy.contains("ion-button", "Discard draft").click();
		getEnteredPage("/log-meal", ".log-meal-option");
		cy.contains("ion-button.log-meal-option", "Enter manually").shadow().find("button").focus().then(($el) => {
			cy.document().should((doc) => expect(deepest(doc), "destination retains focus").to.equal($el[0]));
		});
		capture("g8-focus-after-navigation");

	});

	it("G9 — the expanded source section actually shows the FII and SEM meaning (M05)", () => {
		openManualReferenceDraft();
		waitForCatalog();
		fillReviewedItem();
		selectPublishedReference();
		calculate();

		// Open the section the old capture only NAMED, then capture it open.
		cy.contains("summary", "Source details for").click();
		// Scope to the page that is actually on screen: Ionic keeps the outgoing
		// page mounted as `.ion-page-hidden` during a route transition.
	cy.get(".ion-page:not(.ion-page-hidden)").last().within(() => {
		cy.contains("not personal prediction uncertainty").should("be.visible");
		cy.contains("dt", "SEM").should("be.visible");
		// M01: the boundary line sits below the fold behind the fixed dock.
		// Cypress's own scrollIntoView cannot drive Ionic's shadow scroller,
		// so the ordinary user scroll is issued natively; the assertion then
		// proves the paragraph is actually reachable, not merely present.
		cy.contains("does not mean this exact food was measured").then(($el) => {
			($el[0] as HTMLElement).scrollIntoView({ block: "center" });
		});
		cy.contains("does not mean this exact food was measured").should("be.visible");
	});
		capture("26-source-sem-expanded");
	});

	it("T12b — an old unversioned meal cache migrates to not_loaded, not a fabricated not_evaluated", () => {
		visitFresh("/meals", {
			"insight-meals": {
				state: { meals: [{ id: "local-legacy-1", image: null, name: "Pre-R3B local meal", timestamp: Date.now(), items: [], acute_score: 42 }] },
				version: 0,
			},
		});
		cy.contains("Pre-R3B local meal", { timeout: 10000 }).should("exist");
		// The migrated entry claims no server evidence either way.
		cy.contains("Not loaded yet").should("exist");
		cy.get("ion-app").invoke("text").should("not.contain", "No experimental assessment saved");
	});
});
