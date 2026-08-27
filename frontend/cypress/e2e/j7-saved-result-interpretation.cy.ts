/// <reference types="cypress" />

// J7 saved-result interpretation acceptance. Synthetic records only: no real
// user health data and no real meal photographs.

import { assertNoForbiddenPhrases, assertNoHorizontalOverflow, shouldBeRendered, stubBackend, visitFresh } from "../support/insightStubs";
import { SAVED_RESULT_SCALE_DISCLOSURE, SAVED_RESULT_SCORE_BOUNDARY, getSavedResultScoreAriaLabel } from "../../src/utils/acuteScoreDisplay";
import { ROUGH_ESTIMATE_NOTICE, getSavedResultUnknownItemsNotice } from "../../src/utils/safetyCopy";
import { SAVED_MEAL_STATUS } from "../../src/utils/mealDraftUx";

type Appearance = "paper" | "ink";

const item = (id: string, name: string, source: string, overrides: Record<string, unknown> = {}) => ({
	id,
	name,
	servingSize: 1,
	servingUnit: "serving",
	amount: 1,
	kcalPerServing: 160,
	carbPerServing_g: 24,
	satFatPerServing_g: 0.5,
	gi: 52,
	fii: source === "unknown" || source === "macro_fallback" ? undefined : 58,
	source,
	why: "Legacy direct-data or strongest-contributor wording must not be rendered.",
	...overrides,
});

const normalMeal = (score = 137) => ({
	id: `j7-normal-${score}`,
	image: null,
	name: "Synthetic saved meal",
	timestamp: Date.parse("2026-08-27T07:15:00Z"),
	backend_created_at: "2026-08-27T07:15:00Z",
	acute_score: score,
	insulin_load_total: 41.1,
	kcal_total: 320,
	carbs_total: 48,
	protein_total: 14,
	fat_total: 8,
	estimate_quality: "high",
	main_insulin_drivers: ["Synthetic table item"],
	items: [item("exact", "Synthetic table item", "exact_fii"), item("entered", "Synthetic entered item", "user_confirmed")],
});

const hardMeal = (quality: "low" | "unknown" = "low") => ({
	...normalMeal(1023),
	id: `j7-hard-${quality}`,
	name: quality === "low" ? "Synthetic limited-coverage meal" : "Synthetic unknown-coverage meal",
	estimate_quality: quality,
	main_insulin_drivers: ["Synthetic fallback item", "Synthetic missing item"],
	items: [
		item("exact", "Synthetic table item", "exact_fii"),
		item("mapped", "Synthetic similar-food item", "mapped_fii"),
		item("fallback", "Synthetic fallback item", "macro_fallback"),
		item("entered", "Synthetic entered item", "user_confirmed"),
		item("unknown", "Synthetic missing item", "unknown"),
	],
});

const persistedMeals = (meals: Array<ReturnType<typeof normalMeal>>) => ({ state: { meals }, version: 0 });
const persistedAppearance = (appearance: Appearance) => ({ state: { darkMode: appearance === "ink" }, version: 0 });

const openSavedResult = (meal: ReturnType<typeof normalMeal>, appearance: Appearance = "paper", largeText = false) => {
	stubBackend({ chronic: { loggedDays: 5, rollingDii: 0.4 } });
	visitFresh(`/meals/saved/${meal.id}`, {
		"app-settings": persistedAppearance(appearance),
		"insight-meals": persistedMeals([meal]),
	});
	cy.get("ion-app").should("have.attr", "data-appearance", appearance);
	if (largeText) cy.document().then((doc) => doc.documentElement.style.setProperty("font-size", "133%"));
	cy.contains(SAVED_MEAL_STATUS).should("exist");
};

const capture = (name: string) => cy.get("ion-app").screenshot(`j7-result/${name}`, { overwrite: true });

describe("J7 normal saved-result semantics", () => {
	beforeEach(() => cy.viewport(390, 844));

	for (const score of [50, 100, 137, 767, 1200]) {
		it(`uses the same neutral primary treatment for score ${score}`, () => {
			openSavedResult(normalMeal(score));

			shouldBeRendered("h2", "Estimated meal insulin demand");
			shouldBeRendered(".result-score-line", `Relative score: ${score}`);
			shouldBeRendered(".result-score-caption", SAVED_RESULT_SCORE_BOUNDARY);
			cy.get(".result-score")
				.should("have.attr", "role", "group")
				.and("have.attr", "aria-label", getSavedResultScoreAriaLabel(score))
				.and("not.contain.text", "reference")
				.and("not.contain.text", "above")
				.and("not.contain.text", "below");
			cy.get(".result-score").should("not.have.attr", "role", "img");
			cy.get(".result-score progress, .result-score [role='progressbar'], .result-score svg").should("not.exist");
			cy.get(".result-sheet").should("not.contain.text", "Data quality:").and("not.contain.text", "Main drivers");
		});
	}

	it("keeps the normalization transparent only in the deep disclosure", () => {
		openSavedResult(normalMeal(137));

		cy.get(".result-score").should("not.contain.text", "100");
		cy.get("details.result-score-method").should("not.have.attr", "open");
		cy.contains("summary", "How this score works").focus().should("be.focused").click();
		cy.get("details.result-score-method").should("have.attr", "open");
		shouldBeRendered(".result-score-method p", SAVED_RESULT_SCALE_DISCLOSURE);
	});
});

describe("J7 provenance and hard-to-estimate semantics", () => {
	beforeEach(() => cy.viewport(390, 844));

	it("describes every canonical source as software behavior", () => {
		openSavedResult(hardMeal("low"));

		for (const copy of [
			"Matched in INSIGHT’s current food table",
			"Estimated using a similar food",
			"Used a fallback estimate",
			"Value you entered",
			"Not estimated in this version",
		]) {
			shouldBeRendered(".result-evidence-why", copy);
		}
		cy.get(".result-evidence").should("not.contain.text", "Legacy direct-data");
		cy.get(".result-evidence").should("not.contain.text", "Main drivers");
	});

	for (const quality of ["low", "unknown"] as const) {
		it(`keeps ${quality} canonical quality on the hard-to-estimate path without a prominent partial score`, () => {
			openSavedResult(hardMeal(quality));

			shouldBeRendered("h2", "Hard to estimate from this meal");
			shouldBeRendered(".result-verdict-support", "Some items were approximated or not estimated by the current model, so this result has limited model coverage.");
			shouldBeRendered(".result-notice", getSavedResultUnknownItemsNotice(["Synthetic missing item"]));
			shouldBeRendered(".result-notice", ROUGH_ESTIMATE_NOTICE);
			cy.get(".result-score").should("not.exist");
			cy.get(".result-partial-output").should("not.be.visible");

			cy.contains("summary", "Advanced details").focus().should("be.focused").click();
			cy.get("details.result-advanced").should("have.attr", "open");
			cy.get("details.result-advanced")
				.should("contain.text", "Partial model output")
				.and("contain.text", "Relative score: 1023")
				.and("contain.text", "does not represent a complete meal estimate");
			cy.get(".result-partial-output").should("not.contain.text", "above").and("not.contain.text", "reference");
			cy.get("ion-app").invoke("text").should("not.match", /real insulin demand may be higher|add 0 to this score/i);
		});
	}
});

describe("J7 visual acceptance evidence", () => {
	for (const appearance of ["paper", "ink"] as Appearance[]) {
		it(`captures normal and hard states at 390x844 in ${appearance}`, () => {
			cy.viewport(390, 844);
			openSavedResult(normalMeal(appearance === "paper" ? 137 : 767), appearance);
			assertNoHorizontalOverflow();
			assertNoForbiddenPhrases();
			capture(`normal-${appearance}-390x844`);

			openSavedResult(hardMeal(appearance === "paper" ? "low" : "unknown"), appearance);
			assertNoHorizontalOverflow();
			assertNoForbiddenPhrases();
			capture(`hard-${appearance}-390x844`);
		});
	}

	it("captures a 1000+ score and long name at 320x700", () => {
		cy.viewport(320, 700);
		const mealWithLongEvidence = {
			...normalMeal(1200),
			name: "Synthetic homemade meal with an intentionally long journal title for narrow-layout verification",
			items: [
				item("mapped", "Synthetic slow-cooked whole-grain and roasted-vegetable component with a deliberately long evidence-row name", "mapped_fii"),
				item("entered", "Synthetic entered item", "user_confirmed"),
			],
		};
		openSavedResult(mealWithLongEvidence);
		assertNoHorizontalOverflow();
		shouldBeRendered(".result-evidence-name", mealWithLongEvidence.items[0].name);
		capture("normal-1200-long-name-paper-320x700");
		cy.get(".result-evidence-row").first().then(($row) => $row[0].scrollIntoView({ block: "center" }));
		assertNoHorizontalOverflow();
		capture("normal-1200-long-evidence-paper-320x700");
	});

	it("captures normal and hard states at 133% text scale", () => {
		cy.viewport(390, 844);
		openSavedResult(normalMeal(767), "paper", true);
		assertNoHorizontalOverflow();
		capture("normal-paper-390x844-text-133");

		openSavedResult(hardMeal("unknown"), "ink", true);
		assertNoHorizontalOverflow();
		capture("hard-ink-390x844-text-133");
	});

	it("recovers in landscape without horizontal overflow", () => {
		cy.viewport(844, 390);
		openSavedResult(normalMeal(767), "ink");
		assertNoHorizontalOverflow();
		cy.get(".result-dock").should("be.visible");
		cy.get("ion-content.result-page").then(($content) => {
			const content = $content[0] as HTMLIonContentElement;
			return content.getScrollElement().then((scrollEl) => {
				const score = content.querySelector(".result-score") as HTMLElement;
				const desiredTop = 40;
				scrollEl.scrollTop += score.getBoundingClientRect().top - desiredTop;
			});
		});
		cy.get(".result-score").should(($score) => {
			const scoreRect = $score[0].getBoundingClientRect();
			const dockRect = Cypress.$(".result-dock")[0].getBoundingClientRect();
			expect(scoreRect.height, "score is painted after landscape scroll").to.be.greaterThan(0);
			expect(scoreRect.top, "score enters the viewport").to.be.at.least(0);
			expect(scoreRect.bottom, "score clears the anchored dock").to.be.at.most(dockRect.top + 1);
		});
		capture("normal-ink-landscape-844x390");
	});
});
