/// <reference types="cypress" />

// Issue #108 typography law. Asserts the corrected Porcelain type rules —
// serif only for editorial hierarchy and meal titles, sans for chrome and
// controls, no mechanical tracking, no synthetic-heavy folio — and captures
// labeled evidence for every audited role. Synthetic data only.

import { assertNoHorizontalOverflow, stubBackend, visitFresh } from "../support/insightStubs";

type Appearance = "paper" | "ink";
type Lifecycle = "empty" | "building" | "mature";

const SYNTHETIC_PHOTO =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='224' viewBox='0 0 700 224'%3E%3Crect width='700' height='224' fill='%23212429'/%3E%3Cellipse cx='350' cy='112' rx='250' ry='82' fill='%23fafaf8'/%3E%3C/svg%3E";

const localMeal = (id: string, name: string, daysAgo: number, image: string | null = null, quality = "high") => ({
	id,
	image,
	name,
	timestamp: Date.now() - daysAgo * 86_400_000,
	items: [],
	acute_score: id === "mature-long" ? 1580 : 189,
	estimate_quality: quality,
});

const buildingMeals = [localMeal("building-photo", "Synthetic oats with milk and banana", 1, SYNTHETIC_PHOTO), localMeal("building-plate", "Synthetic yogurt with potato salad", 2)];

const matureMeals = [
	localMeal("mature-long", "Homemade mutton keema biryani with extra-long basmati rice and cucumber raita", 0, SYNTHETIC_PHOTO, "low"),
	localMeal("mature-plate", "Synthetic egg and toast breakfast", 1),
	localMeal("mature-older", "Synthetic lentil bowl", 2),
];

const persistedMeals = (meals: ReturnType<typeof localMeal>[]) => ({ state: { meals }, version: 0 });
const persistedAppearance = (appearance: Appearance) => ({ state: { darkMode: appearance === "ink" }, version: 0 });

const visitLifecycle = (lifecycle: Lifecycle, appearance: Appearance) => {
	const meals = lifecycle === "empty" ? [] : lifecycle === "building" ? buildingMeals : matureMeals;
	const chronic = lifecycle === "mature" ? { loggedDays: 5, rollingDii: 0.62 } : lifecycle === "building" ? { loggedDays: 2, rollingDii: 0.62 } : { loggedDays: 0, rollingDii: null };

	stubBackend({ chronic });
	visitFresh("/dashboard", {
		"app-settings": persistedAppearance(appearance),
		"insight-meals": persistedMeals(meals),
	});
	cy.wait("@meals");
	if (lifecycle !== "empty") cy.wait("@chronic");
	cy.get("ion-app").should("have.attr", "data-appearance", appearance);
};

const SERIF_MARKER = "Iowan Old Style";
const SANS_MARKER = "Segoe UI";

const computed = (selector: string, assertion: (cs: CSSStyleDeclaration) => void) => {
	cy.get(selector)
		.first()
		.should(($el) => assertion(getComputedStyle($el[0])));
};

describe("issue #108 Porcelain typography law", () => {
	it("keeps chrome sans and untracked while editorial roles stay serif (mature, 390x844, paper)", () => {
		cy.viewport(390, 844);
		visitLifecycle("mature", "paper");
		cy.get(".journal-entry-card").should("have.length", 3);

		// Toolbar title is navigation chrome: sans, no mechanical tracking.
		computed(".home-masthead ion-title", (cs) => {
			expect(cs.fontFamily, "masthead family is the sans control voice").to.contain(SANS_MARKER);
			expect(cs.fontFamily).not.to.contain(SERIF_MARKER);
			expect(cs.letterSpacing, "no arbitrary toolbar tracking").to.equal("normal");
		});

		// Folio is editorial: serif, real italic, regular weight (never the
		// blunt Android BoldItalic fallback).
		computed(".home-folio h1", (cs) => {
			expect(cs.fontFamily).to.contain(SERIF_MARKER);
			expect(cs.fontStyle).to.equal("italic");
			expect(cs.fontWeight).to.equal("400");
		});

		// Meal titles remain serif hierarchy; metadata remains sans.
		computed(".journal-entry-caption h3", (cs) => {
			expect(cs.fontFamily).to.contain(SERIF_MARKER);
		});
		computed(".journal-entry-caption p", (cs) => {
			expect(cs.fontFamily).to.contain(SANS_MARKER);
			expect(cs.fontFamily).not.to.contain(SERIF_MARKER);
		});

		// The emphasized index value shares the sentence's line box.
		cy.get(".home-trend-sentence").should(($sentence) => {
			const sentence = getComputedStyle($sentence[0]);
			const strong = getComputedStyle($sentence.find("strong")[0]);
			expect(strong.fontSize, "strong stays on the sentence size").to.equal(sentence.fontSize);
		});

		// Buttons and tab labels are not mechanically spaced out.
		computed(".home-action-dock ion-button", (cs) => {
			expect(cs.letterSpacing).to.equal("normal");
		});
		computed(".home-settings-action", (cs) => {
			expect(cs.letterSpacing).to.equal("normal");
		});
		computed("ion-tab-button ion-label", (cs) => {
			expect(cs.letterSpacing).to.equal("normal");
		});

		assertNoHorizontalOverflow();
		cy.get(".home-masthead").should("be.visible");
		cy.get("ion-app").screenshot("typography-108/after/mature-390x844-paper", { overwrite: true });
	});

	it("keeps the corrected rhythm readable at 320x700 in ink with a long meal name", () => {
		cy.viewport(320, 700);
		visitLifecycle("mature", "ink");
		cy.get(".journal-entry-card").should("have.length", 3);

		computed(".home-folio h1", (cs) => {
			expect(cs.fontWeight).to.equal("400");
			expect(cs.fontStyle).to.equal("italic");
		});
		cy.contains(".journal-entry-caption h3", matureMeals[0].name).should(($heading) => {
			const style = getComputedStyle($heading[0]);
			expect(style.whiteSpace).not.to.equal("nowrap");
			expect(style.textOverflow).not.to.equal("ellipsis");
			expect($heading[0].scrollWidth).to.be.at.most($heading[0].clientWidth + 1);
		});
		assertNoHorizontalOverflow();
		cy.get(".home-masthead").should("be.visible");
		cy.get("ion-app").screenshot("typography-108/after/mature-320x700-ink", { overwrite: true });
	});

	for (const appearance of ["paper", "ink"] as Appearance[]) {
		it(`captures corrected empty and building states in ${appearance}`, () => {
			cy.viewport(390, 844);
			visitLifecycle("empty", appearance);
			cy.contains("Understand and compare the estimated insulin demand of meals.").should("exist");
			cy.get(".home-masthead").should("be.visible");
			cy.get("ion-app").screenshot(`typography-108/after/empty-390x844-${appearance}`, { overwrite: true });

			visitLifecycle("building", appearance);
			cy.get(".journal-entry-card").should("have.length", 2);
			cy.get(".home-masthead").should("be.visible");
			cy.get("ion-app").screenshot(`typography-108/after/building-390x844-${appearance}`, { overwrite: true });
		});
	}

	it("applies the same chrome law to Log Meal, History and Settings", () => {
		cy.viewport(390, 844);
		stubBackend({});
		visitFresh("/log-meal", { "app-settings": persistedAppearance("paper") });
		cy.contains("How would you like to add it?").should("exist");
		computed("ion-toolbar.app-toolbar ion-title", (cs) => {
			expect(cs.fontFamily).to.contain(SANS_MARKER);
			expect(cs.letterSpacing).to.equal("normal");
		});
		// The Log Meal folio takes the same regular-italic correction as Home.
		computed(".log-meal-intro h1", (cs) => {
			expect(cs.fontStyle).to.equal("italic");
			expect(cs.fontWeight).to.equal("400");
		});
		computed("ion-button.log-meal-option", (cs) => {
			expect(cs.letterSpacing).to.equal("normal");
		});
		cy.get("ion-app").screenshot("typography-108/after/logmeal-390x844-paper", { overwrite: true });

		visitFresh("/meals", { "app-settings": persistedAppearance("paper") });
		computed("ion-toolbar.app-toolbar ion-title", (cs) => {
			expect(cs.fontFamily).to.contain(SANS_MARKER);
			expect(cs.letterSpacing).to.equal("normal");
		});
		cy.get("ion-app").screenshot("typography-108/after/history-390x844-paper", { overwrite: true });

		visitFresh("/settings", { "app-settings": persistedAppearance("paper") });
		cy.contains("Settings").should("exist");
		cy.get("ion-app").screenshot("typography-108/after/settings-390x844-paper", { overwrite: true });
	});
});
