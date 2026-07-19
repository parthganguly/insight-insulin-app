/// <reference types="cypress" />

// J2 Home journal lifecycle and exact-viewport visual evidence. Synthetic
// meals and a synthetic inline image only; no real health data or photos.

import { assertNoHorizontalOverflow, stubBackend, visitFresh } from "../support/insightStubs";

type Appearance = "paper" | "ink";
type Lifecycle = "empty" | "building" | "mature";

const SYNTHETIC_PHOTO =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='224' viewBox='0 0 700 224'%3E%3Crect width='700' height='224' fill='%23212429'/%3E%3Cellipse cx='350' cy='112' rx='250' ry='82' fill='%23fafaf8'/%3E%3Ccircle cx='350' cy='112' r='54' fill='%2382b4dd'/%3E%3Cpath d='M310 112h80' stroke='%2328577e' stroke-width='16'/%3E%3C/svg%3E";

const localMeal = (id: string, name: string, daysAgo: number, image: string | null = null, quality = "high") => ({
	id,
	image,
	name,
	timestamp: Date.now() - daysAgo * 86_400_000,
	items: [],
	acute_score: id === "mature-long" ? 1580 : 189,
	estimate_quality: quality,
});

const buildingMeals = [
	localMeal("building-photo", "Synthetic oats with milk and banana", 1, SYNTHETIC_PHOTO),
	localMeal("building-plate", "Synthetic yogurt with potato salad", 2),
];

const matureMeals = [
	localMeal(
		"mature-long",
		"Homemade mutton keema biryani with extra-long basmati rice and cucumber raita",
		0,
		SYNTHETIC_PHOTO,
		"low",
	),
	localMeal("mature-plate", "Synthetic egg and toast breakfast", 1),
	localMeal("mature-older", "Synthetic lentil bowl", 2),
];

const persistedMeals = (meals: ReturnType<typeof localMeal>[]) => ({ state: { meals }, version: 0 });
const persistedAppearance = (appearance: Appearance) => ({ state: { darkMode: appearance === "ink" }, version: 0 });

const visitLifecycle = (lifecycle: Lifecycle, appearance: Appearance) => {
	const meals = lifecycle === "empty" ? [] : lifecycle === "building" ? buildingMeals : matureMeals;
	const chronic =
		lifecycle === "mature"
			? { loggedDays: 5, rollingDii: 0.62 }
			: lifecycle === "building"
				? { loggedDays: 2, rollingDii: 0.62 }
				: { loggedDays: 0, rollingDii: null };

	stubBackend({ chronic });
	visitFresh("/dashboard", {
		"app-settings": persistedAppearance(appearance),
		"insight-meals": persistedMeals(meals),
	});
	cy.wait("@meals");
	if (lifecycle !== "empty") cy.wait("@chronic");
	cy.get("ion-app").should("have.attr", "data-appearance", appearance);
};

const resetForViewportCapture = () => {
	cy.window().then((win) => win.scrollTo(0, 0));
	cy.get("ion-content").then(($content) => {
		return ($content[0] as HTMLIonContentElement).scrollToTop(0);
	});
	cy.get(".home-masthead").should("be.visible");
};

const captureHome = (name: string) => {
	cy.get("ion-app").screenshot(name, { overwrite: true });
};

describe("J2 Home as journal", () => {
	for (const [width, height] of [
		[390, 844],
		[320, 700],
	] as Array<[number, number]>) {
		for (const appearance of ["paper", "ink"] as Appearance[]) {
			for (const lifecycle of ["empty", "building", "mature"] as Lifecycle[]) {
				it(`verifies ${lifecycle} at ${width}x${height} in ${appearance}`, () => {
					cy.viewport(width, height);
					visitLifecycle(lifecycle, appearance);

					cy.contains("Settings").should("be.visible");
					cy.contains("Check a meal").should("be.visible");
					cy.contains("ion-tab-button", "Home").should("be.visible");
					cy.get(".hero-ring,.hero-bezel,.CircularProgressbar").should("not.exist");

					if (lifecycle === "empty") {
						cy.contains("Understand and compare the estimated insulin demand of meals.").should("be.visible");
						cy.get(".home-empty-plate").should("exist");
					} else if (lifecycle === "building") {
						cy.contains("Your 7-day trend appears after you log meals on 3 different days (2 of 3 so far).").should("be.visible");
						cy.get(".journal-entry-card").should("have.length", 2);
					} else {
						cy.get(".home-trend-sentence")
							.should("contain.text", "5 of 7 days logged · 7-day index 62")
							.and("have.attr", "role", "img");
						cy.get(".home-trend-sentence").should("have.attr", "aria-label");
						cy.get(".home-trend-annotation").should("not.have.attr", "role");
						cy.get(".home-trend-gloss").should("be.visible");
						cy.contains("summary", "What this doesn't mean").should("be.visible");
						cy.get(".home-trend-footnote").should("not.have.attr", "open");
						cy.get(".home-trend-boundary").should("not.be.visible");
						cy.get(".journal-entry-card").should("have.length", 3);
						cy.get(".journal-entry-card").first().should("not.have.attr", "aria-label");
						cy.get(".journal-entry-card").first().should("contain.text", "estimate 1580").and("contain.text", "Data quality: Low");
					}

					assertNoHorizontalOverflow();
					if (lifecycle === "mature") {
						resetForViewportCapture();
						captureHome(`j2-home/${width}x${height}/home-${lifecycle}-${appearance}-corrected`);
					}
				});
			}
		}
	}

	it("wraps the long mature meal name and metadata at 320x700", () => {
		cy.viewport(320, 700);
		visitLifecycle("mature", "paper");

		cy.contains(".journal-entry-caption h2", matureMeals[0].name).should(($heading) => {
			const style = getComputedStyle($heading[0]);
			expect(style.whiteSpace).not.to.equal("nowrap");
			expect(style.textOverflow).not.to.equal("ellipsis");
			expect($heading[0].scrollWidth).to.be.at.most($heading[0].clientWidth + 1);
		});
		cy.contains(".journal-entry-caption p", "estimate 1580").should("contain.text", "Data quality: Low");
		assertNoHorizontalOverflow();
		resetForViewportCapture();
		captureHome("j2-home/320x700/home-mature-long-name-paper-corrected");
	});

	it("reveals the full sealed trend footnote without obscuring fixed navigation at 320x700", () => {
		cy.viewport(320, 700);
		visitLifecycle("mature", "paper");

		cy.contains("summary", "What this doesn't mean").click();
		cy.get(".home-trend-footnote").should("have.attr", "open");
		cy.get(".home-trend-boundary").should("be.visible").and("contain.text", "energy-normalized insulin-demand index");
		cy.contains("Check a meal").should("be.visible");
		cy.contains("ion-tab-button", "Home").should("be.visible");
		assertNoHorizontalOverflow();
		resetForViewportCapture();
		captureHome("j2-home/320x700/home-mature-footnote-expanded-paper-corrected");
	});
});
