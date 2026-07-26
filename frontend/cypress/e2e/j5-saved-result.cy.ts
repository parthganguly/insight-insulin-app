/// <reference types="cypress" />

// Annotated Journal J5 — saved-result chassis acceptance and visual evidence.
//
// Synthetic meals and a synthetic inline SVG "photo" only; no real health data
// and no real meal photographs. Every assertion below is presentation: the
// sealed strings, the honesty boundaries (no percentage, no load language, no
// ranking, no B2 affordance) and the responsive/appearance coverage.

import { assertNoForbiddenPhrases, assertNoHorizontalOverflow, shouldBeRendered, stubBackend, visitFresh } from "../support/insightStubs";
// Sealed copy is imported, never retyped: these strings carry typographic
// apostrophes, and a hand-copied variant would silently stop matching.
import { APP_DISCLAIMER, MEAL_SCORE_DISCLAIMER, ROUGH_ESTIMATE_NOTICE, UNKNOWN_ITEMS_NOTICE } from "../../src/utils/safetyCopy";
import { ACUTE_SCORE_SCALE_EXPLAINER } from "../../src/utils/acuteScoreDisplay";
import { SAVED_MEAL_STATUS } from "../../src/utils/mealDraftUx";
import { CALORIE_BAR_NOTE } from "../../src/components/EvidenceRows";

type Appearance = "paper" | "ink";

const SYNTHETIC_PHOTO =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='224' viewBox='0 0 700 224'%3E%3Crect width='700' height='224' fill='%23212429'/%3E%3Cellipse cx='350' cy='112' rx='250' ry='82' fill='%23fafaf8'/%3E%3Ccircle cx='350' cy='112' r='54' fill='%2382b4dd'/%3E%3Cpath d='M310 112h80' stroke='%2328577e' stroke-width='16'/%3E%3C/svg%3E";

const item = (id: string, name: string, kcalPerServing: number, overrides: Record<string, unknown> = {}) => ({
	id,
	name,
	servingSize: 1,
	servingUnit: "serving",
	amount: 1,
	kcalPerServing,
	carbPerServing_g: 30,
	satFatPerServing_g: 0.2,
	gi: 55,
	fii: 62,
	source: "exact_fii",
	why: "Used a direct Food Insulin Index match and scaled it by eaten energy.",
	...overrides,
});

const savedMeal = (overrides: Record<string, unknown> = {}) => ({
	id: "j5-saved",
	image: null,
	name: "Synthetic oats with milk and banana",
	timestamp: Date.parse("2026-07-18T07:15:00Z"),
	backend_created_at: "2026-07-18T07:15:00Z",
	acute_score: 767,
	insulin_load_total: 230,
	kcal_total: 476,
	carbs_total: 66,
	protein_total: 18,
	fat_total: 12,
	estimate_quality: "high",
	main_insulin_drivers: ["oats", "banana", "milk"],
	items: [item("oats", "Oats", 300), item("banana", "Banana", 105), item("milk", "Milk", 71)],
	...overrides,
});

const insufficientMeal = () =>
	savedMeal({
		id: "j5-saved",
		name: "Synthetic keema biryani",
		acute_score: 1023,
		// Totals kept consistent with the items below so the meta line and the
		// evidence rows tell the same story in the captured evidence.
		kcal_total: 696,
		carbs_total: 60,
		estimate_quality: "low",
		main_insulin_drivers: ["keema biryani", "raita"],
		items: [
			item("keema", "Keema biryani", 620, { source: "macro_fallback", fii: undefined, why: "Rough estimate from nutrition data — no direct index match." }),
			item("raita", "Raita", 76, { source: "unknown", fii: undefined, why: undefined }),
		],
	});

const persistedMeals = (meals: ReturnType<typeof savedMeal>[]) => ({ state: { meals }, version: 0 });
const persistedAppearance = (appearance: Appearance) => ({ state: { darkMode: appearance === "ink" }, version: 0 });

const openSavedResult = (meal: ReturnType<typeof savedMeal>, appearance: Appearance = "paper") => {
	stubBackend({ chronic: { loggedDays: 5, rollingDii: 0.4 } });
	visitFresh(`/meals/saved/${meal.id}`, {
		"app-settings": persistedAppearance(appearance),
		"insight-meals": persistedMeals([meal]),
	});
	cy.get("ion-app").should("have.attr", "data-appearance", appearance);
	cy.contains(SAVED_MEAL_STATUS).should("exist");
};

const capture = (name: string) => {
	cy.get("ion-app").screenshot(name, { overwrite: true });
};

describe("J5 saved result — product contract", () => {
	beforeEach(() => {
		cy.viewport(390, 844);
	});

	it("reads as one journal page: identity, verdict, evidence, then exits", () => {
		openSavedResult(savedMeal());

		shouldBeRendered("span", SAVED_MEAL_STATUS);
		shouldBeRendered("h1", "Synthetic oats with milk and banana");
		shouldBeRendered("p", "3 items · ≈ 476 kcal · 66 g carbs");
		shouldBeRendered("h2", "Relative insulin-demand score");
		shouldBeRendered("p", "Score: 767 · above internal reference (100)");
		shouldBeRendered(".result-kicker", "What drove it");
		shouldBeRendered(".result-evidence-name", "Oats");

		// One primary exit, two quiet ones.
		shouldBeRendered(".result-dock ion-button", "Check another meal");
		shouldBeRendered(".result-dock-secondary ion-button", "Done");
		shouldBeRendered(".result-delete-button", "Delete");

		assertNoForbiddenPhrases();
		assertNoHorizontalOverflow();
	});

	it("keeps the retired dashboard residue off the page", () => {
		openSavedResult(savedMeal());

		// No circular meter, gauge or ring.
		cy.get(".result-page [role='img'][aria-label*='score']").should("not.exist");
		cy.get(".result-page svg").should("not.exist");
		// No Ionic card stack inside the journal sheet.
		cy.get(".result-sheet ion-card").should("not.exist");
		// No B2 affordance and no editing.
		cy.contains("Save to History").should("not.exist");
		cy.contains("Recalculate").should("not.exist");
		cy.get("ion-content input").should("not.exist");
	});

	it("shows evidence as calories with an honest label and no percentage", () => {
		openSavedResult(savedMeal());

		cy.get(".result-evidence").should(($evidence) => {
			const text = $evidence[0].textContent ?? "";
			expect(text, "no percentage in evidence").to.not.contain("%");
			expect(text.toLowerCase(), "no load-share language").to.not.contain("share of load");
			expect(text.toLowerCase(), "no insulin-load language").to.not.contain("insulin load");
		});

		cy.contains(CALORIE_BAR_NOTE).should("exist");
		cy.get(".result-evidence-bar").should("have.length", 3).each(($bar) => {
			expect($bar.attr("aria-hidden"), "bars are decorative").to.equal("true");
		});

		// Driver-matched items read first; the widest bar is the largest item.
		cy.get(".result-evidence-name").first().should("have.text", "Oats");
		cy.get(".result-evidence-kcal").first().should("have.text", "≈ 300 kcal");
	});

	it("never implies ranking, population comparison or a capped scale", () => {
		openSavedResult(savedMeal());

		for (const phrase of ["percentile", "than most meals", "better than", "worse than", "ranks"]) {
			cy.contains(phrase).should("not.exist");
		}
		// Scoped to this page: the History list keeps the old score circle, and
		// its capped-ring aria-label, until J6 retires it.
		cy.get(".result-page [aria-label*='the ring caps at 100']").should("not.exist");
		shouldBeRendered(".result-score-caption", ACUTE_SCORE_SCALE_EXPLAINER);
	});

	it("keeps both sealed disclaimers one tap away, closed by default", () => {
		openSavedResult(savedMeal());

		cy.contains("p", MEAL_SCORE_DISCLAIMER).should("not.be.visible");
		cy.contains("summary", "What this doesn't mean").click();
		shouldBeRendered(".result-footnotes-content p", MEAL_SCORE_DISCLAIMER);
		shouldBeRendered(".result-footnotes-content p", APP_DISCLAIMER);
	});

	it("keeps per-item provenance behind Advanced details, closed by default", () => {
		openSavedResult(savedMeal());

		cy.contains("p", "Source: Direct FII match").should("not.be.visible");
		cy.contains("summary", "Advanced details").click();
		shouldBeRendered("p", "Source: Direct FII match");
		cy.get(".result-advanced ion-card").should("not.exist");
	});

	it("presents an insufficient-data result without hiding what it could read", () => {
		openSavedResult(insufficientMeal());

		shouldBeRendered("h2", "Hard to estimate from this meal");
		shouldBeRendered("span", "Data quality: Low.");
		// The nominal reading is shown, de-emphasised, inside its own note.
		cy.get(".result-nominal-note").should("contain.text", "What we could read");
		cy.get(".result-nominal-note").should("contain.text", "Score: 1023 · above internal reference (100)");
		cy.get(".result-score").should("not.exist");
		// Unknown and rough notices stay visible, each exactly once.
		shouldBeRendered(".result-notice", UNKNOWN_ITEMS_NOTICE);
		shouldBeRendered(".result-notice", ROUGH_ESTIMATE_NOTICE);
		// Exactly one of each: sealed disclaimers never stack on one screen.
		cy.get(".result-notice").should("have.length", 2);
		assertNoForbiddenPhrases();
	});

	it("confirms before deleting and keeps the meal when cancelled", () => {
		openSavedResult(savedMeal());

		cy.get(".result-delete-button").click();
		cy.get("ion-alert").should("contain.text", "Delete saved meal?");
		cy.contains("ion-alert button", "Cancel").click();
		cy.url().should("include", "/meals/saved/j5-saved");
		cy.contains(SAVED_MEAL_STATUS).should("exist");
	});

	it("routes Check another meal to the chooser and Done Home", () => {
		openSavedResult(savedMeal());
		cy.contains("Check another meal").click();
		cy.url().should("include", "/log-meal");

		openSavedResult(savedMeal());
		cy.contains(".result-dock-secondary ion-button", "Done").click();
		cy.url().should("include", "/dashboard");
	});
});

// Regression cover for the Samsung SM-M356B dock defect: at Android font scale
// 1.3 with both disclosures open, the previous `slot="fixed"` dock stopped
// holding its place and the scroll content took over its region. The dock is
// now an ion-footer sibling of ion-content. These tests reproduce the same
// combination — 133% root text, both disclosures open, scrolled to the evidence
// section and then to the very bottom — and assert the dock stays anchored.
describe("J5 saved result — dock persistence under tall content", () => {
	const setRootFontScale = (value: string) =>
		cy.document().then((doc) => {
			doc.documentElement.style.fontSize = value;
		});

	const openBothDisclosures = () => {
		cy.contains("summary", "What this doesn't mean").click();
		cy.contains("summary", "Advanced details").click();
	};

	const scrollResultContent = (to: "evidence" | "bottom") =>
		cy.get("ion-content.result-page").then(($content) => {
			const content = $content[0] as HTMLIonContentElement;
			return content.getScrollElement().then((scrollEl) => {
				if (to === "bottom") {
					scrollEl.scrollTop = scrollEl.scrollHeight;
					return;
				}
				const evidence = Cypress.$(".result-evidence")[0];
				scrollEl.scrollTop = evidence.offsetTop;
			});
		});

	// The dock must sit inside the viewport, clear of the tab bar, at every
	// scroll position — this is precisely what the device reported losing.
	const assertDockAnchoredAboveTabBar = () => {
		// Deliberately selected by class, not by tag: if the dock ever regresses
		// to another element or positioning strategy, these geometric assertions
		// still run and fail on real geometry rather than on a missing selector.
		cy.get(".result-dock").should(($dock) => {
			const dock = $dock[0];
			const rect = dock.getBoundingClientRect();
			const viewportHeight = dock.ownerDocument.defaultView!.innerHeight;

			expect(rect.height, "dock is rendered").to.be.greaterThan(0);
			expect(rect.bottom, "dock bottom stays within the viewport").to.be.at.most(viewportHeight + 1);
			expect(rect.top, "dock top stays within the viewport").to.be.at.least(0);

			const tabBar = dock.ownerDocument.querySelector("ion-tab-bar");
			if (tabBar) {
				const tabRect = tabBar.getBoundingClientRect();
				expect(rect.bottom, "dock never overlaps the app tab bar").to.be.at.most(tabRect.top + 1);
			}
		});
	};

	const assertDockOutsideScrollContent = () => {
		cy.get("ion-content.result-page").then(($content) => {
			const dock = Cypress.$(".result-dock")[0];
			expect($content[0].contains(dock), "dock is not inside the scrolling content").to.equal(false);
			expect(dock.tagName.toLowerCase(), "dock is a page-level footer, not fixed-slot content").to.equal("ion-footer");
			expect(dock.getAttribute("slot"), "dock does not use Ionic's fixed slot").to.equal(null);
		});
	};

	for (const [label, meal] of [
		["normal", savedMeal()],
		["insufficient-data", insufficientMeal()],
	] as Array<[string, ReturnType<typeof savedMeal>]>) {
		it(`keeps the dock anchored for a ${label} result at 133% with both disclosures open`, () => {
			cy.viewport(390, 844);
			openSavedResult(meal);
			setRootFontScale("133%");
			openBothDisclosures();

			assertDockOutsideScrollContent();
			assertDockAnchoredAboveTabBar();

			scrollResultContent("evidence");
			assertDockAnchoredAboveTabBar();

			scrollResultContent("bottom");
			assertDockAnchoredAboveTabBar();

			// The dock reserves real layout space, so the last content is
			// reachable above it rather than trapped behind it.
			cy.get(".result-advanced").should(($advanced) => {
				const advancedRect = $advanced[0].getBoundingClientRect();
				const dockRect = Cypress.$(".result-dock")[0].getBoundingClientRect();
				expect(advancedRect.bottom, "final content clears the dock").to.be.at.most(dockRect.top + 1);
			});

			// One capture of the corrected state under the exact combination the
			// device reported failing. The other retained captures cover the top
			// of the page, so none of them shows this.
			if (label === "normal") {
				// Viewport capture, not an element capture: screenshotting a subject
				// scrolls it into view and would move the scroll position this test
				// deliberately established.
				cy.screenshot("j5-result/390x844/result-corrected-dock-font-1.3-disclosures-open-paper", { capture: "viewport", overwrite: true });
			}

			setRootFontScale("");
		});
	}
});

describe("J5 saved result — responsive and appearance evidence", () => {
	for (const appearance of ["paper", "ink"] as Appearance[]) {
		it(`renders the normal result at 390x844 in ${appearance}`, () => {
			cy.viewport(390, 844);
			openSavedResult(savedMeal({ image: SYNTHETIC_PHOTO }), appearance);
			assertNoHorizontalOverflow();
			capture(`j5-result/390x844/result-normal-photo-${appearance}`);
		});

		it(`renders the insufficient-data result at 390x844 in ${appearance}`, () => {
			cy.viewport(390, 844);
			openSavedResult(insufficientMeal(), appearance);
			assertNoHorizontalOverflow();
			capture(`j5-result/390x844/result-insufficient-${appearance}`);
		});
	}

	it("falls back to the typographic plate when the meal has no photo", () => {
		cy.viewport(390, 844);
		openSavedResult(savedMeal());
		// "Synthetic oats with milk and banana" -> connector words dropped, so
		// the monogram is the first two remaining initials: Synthetic + oats.
		cy.get(".result-hero-plate .typographic-plate-monogram").should("have.text", "So");
		cy.get(".result-hero-image").should("not.exist");
		capture("j5-result/390x844/result-normal-plate-paper");
	});

	it("shows the evidence rows, bars and provenance why-lines", () => {
		cy.viewport(390, 844);
		openSavedResult(savedMeal({ image: SYNTHETIC_PHOTO }));
		cy.get(".result-evidence").then(($evidence) => $evidence[0].scrollIntoView({ block: "center" }));
		cy.get(".result-evidence-bar").should("have.length", 3);
		capture("j5-result/390x844/result-evidence-rows-paper");
	});

	it("keeps both disclosures readable when open", () => {
		cy.viewport(390, 844);
		openSavedResult(savedMeal({ image: SYNTHETIC_PHOTO }));
		cy.contains("summary", "What this doesn't mean").click();
		cy.contains("summary", "Advanced details").click();
		assertNoHorizontalOverflow();
		cy.get(".result-advanced").then(($details) => $details[0].scrollIntoView({ block: "center" }));
		capture("j5-result/390x844/result-disclosures-open-paper");
	});

	it("shows the delete confirmation", () => {
		cy.viewport(390, 844);
		openSavedResult(savedMeal({ image: SYNTHETIC_PHOTO }));
		cy.get(".result-delete-button").click();
		cy.get("ion-alert").should("be.visible");
		capture("j5-result/390x844/result-delete-confirm-paper");
	});

	it("survives a long meal name and a large score at 320x700", () => {
		cy.viewport(320, 700);
		openSavedResult(
			savedMeal({
				name: "Homemade mutton keema biryani with extra-long basmati rice and cucumber raita",
				acute_score: 1580,
			}),
		);
		cy.contains("Score: 1580 · above internal reference (100)").should("exist");
		assertNoHorizontalOverflow();
		capture("j5-result/320x700/result-long-name-paper");
	});

	it("survives 133% text scaling at 390x844", () => {
		cy.viewport(390, 844);
		openSavedResult(savedMeal({ image: SYNTHETIC_PHOTO }));
		cy.document().then((doc) => {
			doc.documentElement.style.fontSize = "133%";
		});
		cy.contains("Score: 767 · above internal reference (100)").should("exist");
		assertNoHorizontalOverflow();
		capture("j5-result/390x844/result-large-text-paper");
		cy.document().then((doc) => {
			doc.documentElement.style.fontSize = "";
		});
	});
});
