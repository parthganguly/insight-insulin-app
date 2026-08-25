/// <reference types="cypress" />

// Annotated Journal J6: History and the previous-meal picker as two folios of
// one journal, plus the exact-viewport visual evidence for both. Synthetic
// meals and an inline synthetic SVG only — no real health data and no real
// meal photographs.

import { BACKEND_ORIGIN, assertNoForbiddenPhrases, assertNoHorizontalOverflow, shouldBeRendered, stubBackend, visitFresh } from "../support/insightStubs";

type Appearance = "paper" | "ink";

const SYNTHETIC_PHOTO =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='224' viewBox='0 0 700 224'%3E%3Crect width='700' height='224' fill='%23212429'/%3E%3Cellipse cx='350' cy='112' rx='250' ry='82' fill='%23fafaf8'/%3E%3Ccircle cx='350' cy='112' r='54' fill='%2382b4dd'/%3E%3Cpath d='M310 112h80' stroke='%2328577e' stroke-width='16'/%3E%3C/svg%3E";

const EVIDENCE = "j6-history";

const LONG_MEAL_NAME = "Homemade mutton keema biryani with extra-long basmati rice and cucumber raita";

const HISTORY_EXPLAINER = "Tap an entry to revisit its saved result. To log one again, use Log Meal.";
const PICKER_EXPLAINER = "Pick a meal to start a new draft you can review and edit. The original stays unchanged in History.";
const PICKER_ACTION = "Use as new draft";

// Local time on a chosen day, so the day-grouping helper sees Today/Yesterday
// exactly as a user's own clock would.
const dayAt = (daysAgo: number, hour: number, minute = 0) => {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	date.setHours(hour, minute, 0, 0);
	return date.getTime();
};

const syntheticItem = (kcalPerServing: number, amount: number) => ({
	id: `item-${kcalPerServing}-${amount}`,
	name: "Synthetic component",
	servingSize: 1,
	servingUnit: "serving",
	amount,
	kcalPerServing,
	carbPerServing_g: 45,
	satFatPerServing_g: 0.2,
	gi: 60,
});

type LocalMealOptions = {
	image?: string | null;
	acuteScore?: number;
	quality?: string;
	items?: ReturnType<typeof syntheticItem>[];
};

const localMeal = (id: string, name: string, timestamp: number, { image = null, acuteScore = 189, quality = "high", items = [syntheticItem(200, 2)] }: LocalMealOptions = {}) => ({
	id,
	image,
	name,
	timestamp,
	items,
	acute_score: acuteScore,
	estimate_quality: quality,
});

// Three day groups, mixed photo and plate, newest first exactly as the store
// delivers them.
const journalMeals = [
	localMeal("j6-today-photo", "Synthetic oats with milk and banana", dayAt(0, 8, 15), { image: SYNTHETIC_PHOTO }),
	localMeal("j6-today-plate", "Synthetic egg and toast breakfast", dayAt(0, 7, 5)),
	localMeal("j6-yesterday", "Synthetic yogurt with potato salad", dayAt(1, 19, 40), { acuteScore: 1580, quality: "low" }),
	localMeal("j6-older", "Synthetic lentil bowl", dayAt(4, 13, 25), { items: [syntheticItem(150, 1)] }),
];

// One entry per day, so all three day breaks fit in one scrolled viewport.
const oneEntryPerDayMeals = [
	localMeal("j6-day-today", "Synthetic oats with milk and banana", dayAt(0, 8, 15), { image: SYNTHETIC_PHOTO }),
	localMeal("j6-day-yesterday", "Synthetic yogurt with potato salad", dayAt(1, 19, 40)),
	localMeal("j6-day-older", "Synthetic lentil bowl", dayAt(4, 13, 25)),
];

const longNameMeals = [localMeal("j6-long", LONG_MEAL_NAME, dayAt(0, 12, 30), { image: SYNTHETIC_PHOTO, acuteScore: 1580, quality: "low" })];

const persistedMeals = (meals: ReturnType<typeof localMeal>[]) => ({ state: { meals }, version: 0 });
const persistedAppearance = (appearance: Appearance) => ({ state: { darkMode: appearance === "ink" }, version: 0 });

type VisitOptions = {
	meals?: ReturnType<typeof localMeal>[];
	appearance?: Appearance;
	largeText?: boolean;
};

const visitJournal = (path: "/meals" | "/meals/previous", { meals = journalMeals, appearance = "paper", largeText = false }: VisitOptions = {}) => {
	stubBackend({});
	// A meal write must never originate here; this alias is the negative control.
	cy.intercept("POST", `${BACKEND_ORIGIN}/meals`, { statusCode: 500, body: { detail: "J6 must not save" } }).as("createMeal");

	visitFresh(path, {
		"app-settings": persistedAppearance(appearance),
		"insight-meals": persistedMeals(meals),
	});
	cy.wait("@meals");
	cy.get("ion-app").should("have.attr", "data-appearance", appearance);
	if (largeText) cy.document().then((doc) => doc.documentElement.style.setProperty("font-size", "133%"));
	cy.get(".journal-folio h1").should("exist");

	if (path === "/meals/previous") {
		// ion-icon sizes its host immediately but fetches the arrow's SVG after
		// first paint, so a capture taken too early shows an empty back control
		// that the user never actually sees settled. Wait for the glyph itself.
		cy.get("ion-back-button").should(($back) => {
			const icon = $back[0].shadowRoot?.querySelector("ion-icon");
			expect(icon, "back control renders an icon host").to.not.equal(null);
			expect(icon?.shadowRoot?.querySelector("svg"), "back arrow glyph is painted").to.not.equal(null);
		});
	}
};

const scrollFolioToTop = () => {
	cy.get("ion-content.journal-folio-content").then(($content) => ($content[0] as HTMLIonContentElement).scrollToTop(0));
};

const scrollFolioBy = (y: number) => {
	cy.get("ion-content.journal-folio-content").then(($content) => ($content[0] as HTMLIonContentElement).scrollToPoint(0, y, 0));
};

// Park the first day break a fixed distance below the toolbar by measuring it
// rather than guessing a scroll offset: Ionic's scroll container does not move
// one-for-one with a requested offset, so a hardcoded number is not stable.
const parkFirstDaybreakBelowToolbar = (gap = 14) => {
	cy.get("ion-content.journal-folio-content").then(($content) => {
		const contentTop = $content[0].getBoundingClientRect().top;
		const firstLabel = $content[0].querySelector("h2.journal-daybreak") as HTMLElement;
		const delta = firstLabel.getBoundingClientRect().top - contentTop - gap;
		return ($content[0] as HTMLIonContentElement).getScrollElement().then((scroller) => {
			scroller.scrollTop += delta;
		});
	});
};

const capture = (name: string) => {
	cy.get("ion-app").screenshot(`${EVIDENCE}/${name}`, { overwrite: true });
};

// A single entry is smaller than the viewport, so it can be captured as an
// element for a legible close crop. Anything taller is captured as a viewport
// instead: Cypress stitches oversized element captures by scrolling, and
// against Ionic's fixed inner scroll container that produces duplicated day
// headings and a tab bar baked into the middle of the image.
const captureElement = (selector: string, name: string) => {
	cy.get(selector).first().screenshot(`${EVIDENCE}/${name}`, { overwrite: true });
};

// Ionic's fixed-layout scroll container defeats Cypress's visibility heuristic,
// so bottom clearance is measured directly: the last entry's painted box must
// end above the tab bar's top edge.
const assertLastEntryClearsTabBar = () => {
	cy.get("ion-content.journal-folio-content").then(($content) => ($content[0] as HTMLIonContentElement).scrollToBottom(0));
	cy.get("ion-tab-bar").then(($tabBar) => {
		const tabBarTop = $tabBar[0].getBoundingClientRect().top;
		cy.get("ion-item.journal-entry-card").last().then(($card) => {
			expect($card[0].getBoundingClientRect().bottom, "last entry clears the tab bar").to.be.at.most(tabBarTop);
		});
	});
};

const assertNoRetiredScorePresentation = () => {
	cy.get(".journal-folio-content .CircularProgressbar").should("not.exist");
	cy.get(".journal-folio-content svg").should("not.exist");
	cy.get(".journal-folio-content [aria-label*='the ring caps at 100']").should("not.exist");
	cy.get(".journal-folio-content").should("not.contain.text", "above ref");
};

const assertNoNestedCards = () => {
	cy.get(".journal-folio-content ion-card").should("not.exist");
	cy.get("ion-item.journal-entry-card ion-item").should("not.exist");
	cy.get("ion-item.journal-entry-card .app-card").should("not.exist");
};

const hexToRgb = (hex: string) => {
	const value = parseInt(hex.trim().replace("#", ""), 16);
	return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
};

// The action line is the picker's only statement of what a tap does, so it has
// to resolve to the appearance accent rather than to the metadata ink. The
// accepted J2 rule `.journal-entry-caption p` is a 0-2-0 descendant selector,
// so a bare `.journal-entry-action` (0-1-0) silently loses colour, size and
// margin to it and the action renders as a second metadata line.
const assertActionLineUsesAccent = () => {
	cy.get(".journal-entry-action").first().then(($action) => {
		const doc = $action[0].ownerDocument;
		const win = doc.defaultView as Window;
		const action = win.getComputedStyle($action[0]);
		const meta = win.getComputedStyle($action[0].previousElementSibling as Element);

		// Appearance tokens are carried by a class on `ion-app` as well as on the
		// root element, and the two are applied by different paths. Reading them
		// off the action line itself — custom properties inherit — compares the
		// element against exactly the tokens its own `var()` resolves against,
		// instead of racing whichever ancestor is switched first.
		const accent = hexToRgb(action.getPropertyValue("--accent"));
		const ink3 = hexToRgb(action.getPropertyValue("--ink-3"));
		const rootFontPx = parseFloat(win.getComputedStyle(doc.documentElement).fontSize);

		expect(action.color, "action line resolves to the appearance accent").to.equal(accent);
		expect(action.color, "action line is not the metadata ink").to.not.equal(ink3);
		expect(meta.color, "metadata keeps --ink-3").to.equal(ink3);
		expect(action.color, "action and metadata are visibly distinct").to.not.equal(meta.color);
		expect(parseFloat(action.fontSize), "action line keeps the caption size").to.be.closeTo(0.78 * rootFontPx, 0.05);
		expect(parseFloat(action.marginTop), "action line keeps its separation from the metadata").to.be.closeTo(6, 0.5);
		expect(action.fontWeight, "action line keeps its weight").to.equal("600");
		expect($action[0].textContent?.trim(), "action text is exact").to.equal(PICKER_ACTION);
	});

	// Light-DOM only: the item's own shadow button is the single card-level
	// target, and nothing may be nested inside it.
	cy.get("ion-item.journal-entry-card").first().then(($card) => {
		const nested = $card[0].querySelectorAll("button, a[href], ion-button, input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1'])");
		expect(nested.length, "the whole card stays the only control").to.equal(0);
	});
};

// The empty folio is a composed, centred journal-voice block — not a
// left-aligned continuation of the folio heading.
const assertEmptyStateGeometry = () => {
	cy.get(".journal-empty-state").then(($state) => {
		const doc = $state[0].ownerDocument;
		const win = doc.defaultView as Window;
		const stateBox = $state[0].getBoundingClientRect();

		expect(win.getComputedStyle($state[0]).textAlign, "empty-state copy is centred").to.equal("center");

		const heading = $state[0].querySelector("h2") as HTMLElement;
		const copy = $state[0].querySelector("p") as HTMLElement;

		for (const [element, label] of [
			[heading, "headline"],
			[copy, "copy"],
		] as Array<[HTMLElement, string]>) {
			const box = element.getBoundingClientRect();
			const offset = box.left + box.width / 2 - (stateBox.left + stateBox.width / 2);
			expect(offset, `${label} is horizontally centred in the block`).to.be.closeTo(0, 1);
			const maxWidth = parseFloat(win.getComputedStyle(element).maxWidth);
			expect(maxWidth, `${label} sits on a bounded measure`).to.be.greaterThan(0);
			expect(box.width, `${label} does not span the whole column`).to.be.at.most(maxWidth + 1);
		}

		const folio = doc.querySelector(".journal-folio") as HTMLElement;
		const folioHeading = folio.querySelector("h1") as HTMLElement;
		expect(folio.getBoundingClientRect().bottom, "the folio heading stays above the empty state").to.be.at.most(stateBox.top + 1);
		expect(win.getComputedStyle(folioHeading).textAlign, "the folio heading is not centred").to.not.equal("center");
		expect(heading.getBoundingClientRect().top - folio.getBoundingClientRect().bottom, "the empty state is separated from the folio").to.be.at.least(32);

		expect(
			$state[0].querySelectorAll("ion-card, .app-card, .typographic-plate, img, svg, ion-button, button, a[href]").length,
			"no card, plate, illustration or action appears",
		).to.equal(0);
		expect(doc.querySelectorAll(".journal-folio-explainer").length, "the explainer stays absent").to.equal(0);
	});
};

const assertHeadingOrder = () => {
	cy.get(".journal-folio-content").within(() => {
		cy.get("h1").should("have.length", 1);
		cy.get("h2").should("have.length.at.least", 1);
	});
	cy.get(".journal-folio-content").then(($content) => {
		const levels = Array.from($content[0].querySelectorAll("h1, h2, h3")).map((heading) => Number(heading.tagName.slice(1)));
		expect(levels[0], "the folio heading comes first").to.equal(1);
		for (let index = 1; index < levels.length; index += 1) {
			expect(levels[index] - levels[index - 1], "heading levels never skip a level").to.be.at.most(1);
		}
	});
};

describe("J6 History as a journal folio", () => {
	for (const [width, height, appearance] of [
		[390, 844, "paper"],
		[390, 844, "ink"],
		[320, 700, "paper"],
	] as Array<[number, number, Appearance]>) {
		it(`renders the read-only folio at ${width}x${height} in ${appearance}`, () => {
			cy.viewport(width, height);
			visitJournal("/meals", { appearance });

			cy.get("ion-toolbar.app-toolbar ion-title").should("have.text", "History");
			shouldBeRendered(".journal-folio h1", "Meal journal");
			shouldBeRendered(".journal-folio-explainer", HISTORY_EXPLAINER);
			cy.get("ion-item.journal-entry-card").should("have.length", journalMeals.length);
			cy.get("h2.journal-daybreak").should("have.length", 3);

			// History reads its entries back; it never offers to reuse them.
			cy.get(".journal-folio-content").should("not.contain.text", PICKER_ACTION);
			cy.get(".journal-folio-content").should("not.contain.text", "kcal");
			cy.get("ion-item.journal-entry-card").first().should("have.attr", "router-link", "/meals/saved/j6-today-photo");
			assertNoRetiredScorePresentation();
			assertNoNestedCards();
			assertHeadingOrder();
			assertNoHorizontalOverflow();
			assertNoForbiddenPhrases();

			scrollFolioToTop();
			const label = width === 390 ? `history-populated-${appearance}-390x844` : `history-populated-${appearance}-320x700`;
			capture(label);
		});
	}

	it("breaks the folio into Today, Yesterday and a dated group, newest first", () => {
		cy.viewport(390, 844);
		// One entry per day: all three day breaks then fit in a single scrolled
		// viewport, so the capture can show the grouping it is named for.
		visitJournal("/meals", { meals: oneEntryPerDayMeals });

		cy.get("h2.journal-daybreak").then(($labels) => {
			const labels = Array.from($labels).map((heading) => heading.textContent?.trim());
			expect(labels[0]).to.equal("Today");
			expect(labels[1]).to.equal("Yesterday");
			expect(labels[2]).to.not.be.oneOf(["Today", "Yesterday"]);
		});
		cy.get(".journal-entry-caption h3").then(($names) => {
			const names = Array.from($names).map((heading) => heading.textContent?.trim());
			expect(names).to.deep.equal(oneEntryPerDayMeals.map((meal) => meal.name));
		});

		// Just past the folio, all three day breaks sit inside the scroll viewport.
		parkFirstDaybreakBelowToolbar();
		cy.get("ion-content.journal-folio-content").then(($content) => {
			const contentRect = $content[0].getBoundingClientRect();
			cy.get("h2.journal-daybreak").should(($labels) => {
				expect($labels.length, "three day breaks").to.equal(3);
				$labels.each((_, label) => {
					const rect = label.getBoundingClientRect();
					expect(rect.height, `${label.textContent} is painted`).to.be.greaterThan(0);
					expect(rect.top, `${label.textContent} is below the toolbar`).to.be.at.least(contentRect.top);
					expect(rect.bottom, `${label.textContent} is above the tab bar`).to.be.at.most(contentRect.bottom);
				});
			});
		});
		capture("history-three-day-groups-paper");
	});

	it("mixes photo entries and typographic plates in one folio", () => {
		cy.viewport(390, 844);
		visitJournal("/meals");

		cy.get("img.journal-entry-image").should("have.length", 1);
		cy.get(".typographic-plate").should("have.length", journalMeals.length - 1);
		cy.get(".typographic-plate").first().should("have.attr", "aria-hidden", "true");
		cy.get(".journal-entry-caption p").first().should("contain.text", "estimate 189").and("contain.text", "Data quality: High");

		// Past the folio, the photo entry and the plate entry below it are both
		// fully on screen — the pairing this capture is named for.
		scrollFolioBy(150);
		capture("history-mixed-photo-plate-paper");
	});

	it("shows the sealed empty state with no explainer and no entries", () => {
		cy.viewport(390, 844);
		visitJournal("/meals", { meals: [] });

		shouldBeRendered(".journal-folio h1", "Meal journal");
		shouldBeRendered(".journal-empty-state h2", "No saved meals yet");
		shouldBeRendered(".journal-empty-state p", "Meals you check and save will appear here.");
		cy.get(".journal-folio-content").should("not.contain.text", HISTORY_EXPLAINER);
		cy.get("ion-item.journal-entry-card").should("not.exist");
		assertEmptyStateGeometry();
		assertNoHorizontalOverflow();

		capture("history-empty-paper");
	});

	it("wraps a long meal name at 133% root text without clipping or overflow", () => {
		cy.viewport(320, 700);
		visitJournal("/meals", { meals: longNameMeals, largeText: true });

		cy.contains(".journal-entry-caption h3", LONG_MEAL_NAME).should(($heading) => {
			const style = getComputedStyle($heading[0]);
			expect(style.whiteSpace).to.not.equal("nowrap");
			expect(style.textOverflow).to.not.equal("ellipsis");
			expect($heading[0].scrollWidth).to.be.at.most($heading[0].clientWidth + 1);
		});
		cy.get(".journal-entry-caption p").first().should("contain.text", "estimate 1580");
		assertNoHorizontalOverflow();

		scrollFolioToTop();
		capture("history-long-name-133-paper");
	});

	it("scrolls to a true bottom that clears the tab bar", () => {
		cy.viewport(390, 844);
		visitJournal("/meals");

		assertLastEntryClearsTabBar();
		cy.contains("ion-tab-button", "History").should("be.visible");
		assertNoHorizontalOverflow();

		capture("history-bottom-scroll-paper");
	});

	it("opens the canonical saved result and starts no draft", () => {
		cy.viewport(390, 844);
		visitJournal("/meals");

		cy.contains(".journal-entry-caption h3", "Synthetic egg and toast breakfast").click();

		cy.location("pathname").should("equal", "/meals/saved/j6-today-plate");
		cy.contains("Saved to history").should("exist");
		cy.contains("Editable draft — not saved yet").should("not.exist");
		cy.get("@createMeal.all").should("have.length", 0);
	});
});

describe("J6 previous-meal picker as a selection folio", () => {
	for (const [width, height, appearance] of [
		[390, 844, "paper"],
		[390, 844, "ink"],
		[320, 700, "paper"],
	] as Array<[number, number, Appearance]>) {
		it(`renders the selection folio at ${width}x${height} in ${appearance}`, () => {
			cy.viewport(width, height);
			visitJournal("/meals/previous", { appearance });

			cy.get("ion-toolbar.app-toolbar ion-title").should("have.text", "Choose a previous meal");
			cy.get("ion-back-button").should("have.attr", "default-href", "/log-meal");
			shouldBeRendered(".journal-folio h1", "Log a previous meal again");
			shouldBeRendered(".journal-folio-explainer", PICKER_EXPLAINER);
			cy.get("ion-item.journal-entry-card").should("have.length", journalMeals.length);
			cy.get(".journal-entry-action").should("have.length", journalMeals.length);

			// Selection shows what a tap does, and never the old answer.
			cy.get(".journal-entry-caption p").first().should("contain.text", "400 kcal");
			cy.get(".journal-folio-content").should("not.contain.text", "estimate 189");
			cy.get(".journal-folio-content").should("not.contain.text", "Data quality");
			cy.get("[router-link^='/meals/saved/']").should("not.exist");
			cy.get("ion-item.journal-entry-card").first().should("have.attr", "router-link", "/meals/new");
			assertNoRetiredScorePresentation();
			assertNoNestedCards();
			assertHeadingOrder();
			assertNoHorizontalOverflow();
			assertNoForbiddenPhrases();

			scrollFolioToTop();
			const label = width === 390 ? `picker-populated-${appearance}-390x844` : `picker-populated-${appearance}-320x700`;
			capture(label);
		});
	}

	for (const appearance of ["paper", "ink"] as Appearance[]) {
		it(`renders the action line in the ${appearance} accent, distinct from the metadata`, () => {
			cy.viewport(390, 844);
			visitJournal("/meals/previous", { appearance });

			assertActionLineUsesAccent();
		});
	}

	it("states the action on every entry", () => {
		cy.viewport(390, 844);
		visitJournal("/meals/previous");

		shouldBeRendered(".journal-entry-action", PICKER_ACTION);
		cy.get(".journal-entry-action").each(($action) => {
			expect($action.text().trim()).to.equal(PICKER_ACTION);
		});
		// Name, metadata and action together are the card's accessible name.
		cy.get("ion-item.journal-entry-card").first().then(($card) => {
			const labelIds = ($card.attr("aria-labelledby") ?? "").split(" ").filter(Boolean);
			expect(labelIds, "name, meta and action are all announced").to.have.length(3);
		});

		scrollFolioToTop();
		// A close crop of one entry: the action line has to be legible on its own.
		captureElement("ion-item.journal-entry-card", "picker-action-line-paper");
	});

	it("shows the sealed empty state with no explainer and no action line", () => {
		cy.viewport(390, 844);
		visitJournal("/meals/previous", { meals: [] });

		shouldBeRendered(".journal-folio h1", "Log a previous meal again");
		shouldBeRendered(".journal-empty-state h2", "No previous meals yet");
		shouldBeRendered(".journal-empty-state p", "Meals you save will appear here for quick reuse.");
		cy.get(".journal-folio-content").should("not.contain.text", PICKER_EXPLAINER);
		cy.get(".journal-folio-content").should("not.contain.text", PICKER_ACTION);
		assertEmptyStateGeometry();
		assertNoHorizontalOverflow();

		capture("picker-empty-paper");
	});

	it("wraps a long meal name at 133% root text without clipping or overflow", () => {
		cy.viewport(320, 700);
		visitJournal("/meals/previous", { meals: longNameMeals, largeText: true });

		cy.contains(".journal-entry-caption h3", LONG_MEAL_NAME).should(($heading) => {
			expect(getComputedStyle($heading[0]).textOverflow).to.not.equal("ellipsis");
			expect($heading[0].scrollWidth).to.be.at.most($heading[0].clientWidth + 1);
		});
		shouldBeRendered(".journal-entry-action", PICKER_ACTION);
		assertNoHorizontalOverflow();

		scrollFolioToTop();
		capture("picker-long-name-133-paper");
	});

	it("scrolls to a true bottom that clears the tab bar", () => {
		cy.viewport(390, 844);
		visitJournal("/meals/previous");

		assertLastEntryClearsTabBar();
		cy.contains("ion-tab-button", "Log Meal").should("be.visible");
		assertNoHorizontalOverflow();

		capture("picker-bottom-scroll-paper");
	});

	it("starts a reviewable draft at the confirmation screen and saves nothing", () => {
		cy.viewport(390, 844);
		visitJournal("/meals/previous");

		cy.contains(".journal-entry-caption h3", "Synthetic lentil bowl").click();

		cy.location("pathname").should("equal", "/meals/new");
		cy.contains("Draft — not saved").should("exist");
		cy.contains("Synthetic lentil bowl").should("exist");
		cy.contains("Synthetic component").should("exist");
		cy.contains("Saved to history").should("not.exist");
		cy.get("@createMeal.all").should("have.length", 0);

		// The saved source survives the reuse untouched.
		cy.window().then((win) => {
			const persisted = JSON.parse(win.localStorage.getItem("insight-meals") ?? "{}") as { state?: { meals?: Array<{ id: string; acute_score?: number }> } };
			const source = persisted.state?.meals?.find((meal) => meal.id === "j6-older");
			expect(source, "the saved source meal is still stored").to.not.equal(undefined);
			expect(source?.acute_score, "its canonical score is untouched").to.equal(189);
		});
	});
});

describe("J6 shared folio law", () => {
	it("keeps Paper and Ink structurally identical on both routes", () => {
		cy.viewport(390, 844);
		const structureOf = ($app: JQuery<HTMLElement>) =>
			Array.from($app[0].querySelectorAll(".journal-folio-content h1, .journal-folio-content h2, .journal-folio-content h3, .journal-folio-content .journal-entry-action, .journal-folio-content ion-item.journal-entry-card"))
				.map((node) => `${node.tagName.toLowerCase()}.${node.className || "-"}`)
				.join("|");

		for (const path of ["/meals", "/meals/previous"] as Array<"/meals" | "/meals/previous">) {
			const captured: string[] = [];
			for (const appearance of ["paper", "ink"] as Appearance[]) {
				visitJournal(path, { appearance });
				cy.get("ion-app").then(($app) => captured.push(structureOf($app)));
			}
			cy.then(() => {
				expect(captured[0], `${path} keeps one structure in both appearances`).to.equal(captured[1]);
			});
		}
	});

	it("gives every entry and the back control a 44px minimum target", () => {
		cy.viewport(390, 844);
		visitJournal("/meals/previous");

		// Retrying assertions: Ionic lays a freshly loaded page out asynchronously,
		// so a one-shot measurement can read a box that has not been painted yet.
		cy.get("ion-content.journal-folio-content ion-item.journal-entry-card").should(($cards) => {
			expect($cards.length, "entries are present").to.be.at.least(1);
			$cards.each((_, card) => {
				const rect = card.getBoundingClientRect();
				expect(rect.height, "entry height").to.be.at.least(44);
				expect(rect.width, "entry width").to.be.at.least(44);
			});
		});
		cy.get("ion-back-button").should(($back) => {
			const rect = $back[0].getBoundingClientRect();
			expect(rect.height, "back control height").to.be.at.least(44);
			expect(rect.width, "back control width").to.be.at.least(44);
		});
	});

	it("keeps the picker's back control rendered and painted in both appearances", () => {
		cy.viewport(390, 844);

		for (const appearance of ["paper", "ink"] as Appearance[]) {
			visitJournal("/meals/previous", { appearance });
			cy.get("ion-back-button").should(($back) => {
				const host = $back[0];
				const rect = host.getBoundingClientRect();
				expect(rect.width, `${appearance} back control width`).to.be.at.least(44);
				expect(rect.height, `${appearance} back control height`).to.be.at.least(44);

				const icon = host.shadowRoot?.querySelector("ion-icon") ?? host.querySelector("ion-icon");
				expect(icon, `${appearance} back control renders an icon`).to.not.equal(null);
				const iconRect = (icon as Element).getBoundingClientRect();
				expect(iconRect.width, `${appearance} back icon is laid out`).to.be.greaterThan(0);

				const iconStyle = getComputedStyle(icon as Element);
				expect(iconStyle.visibility, `${appearance} back icon visibility`).to.not.equal("hidden");
				expect(Number(iconStyle.opacity), `${appearance} back icon opacity`).to.be.greaterThan(0);

				// A control that computes a colour can still paint nothing readable.
				// The arrow has to actually contrast with the toolbar it sits on.
				const toolbarBackground = getComputedStyle(host.closest("ion-toolbar") as Element).getPropertyValue("--background");
				const channels = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
				const [r, g, b] = channels(iconStyle.color);
				const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
				const isInk = appearance === "ink";
				expect(
					isInk ? luminance : 255 - luminance,
					`${appearance} back icon (${iconStyle.color}) must contrast with the toolbar (${toolbarBackground.trim()})`,
				).to.be.greaterThan(60);
			});
		}
	});

	it("ships a visible focus ring for entries and the back control", () => {
		cy.viewport(390, 844);
		visitJournal("/meals/previous");

		// Both rings are declared against Ionic's shadow `native` part, so the
		// loaded stylesheet is what is actually inspectable here. Runtime focus
		// traversal across every route is the J9 accessibility pass's own gate.
		cy.document().then((doc) => {
			const cssText: string[] = [];
			for (const sheet of Array.from(doc.styleSheets)) {
				let rules: CSSRuleList;
				try {
					rules = sheet.cssRules;
				} catch {
					continue;
				}
				for (const rule of Array.from(rules)) cssText.push(rule.cssText);
			}

			const entryRing = cssText.find((text) => text.includes("journal-entry-card") && text.includes("focus-visible"));
			const backRing = cssText.find((text) => text.includes("journal-folio-toolbar") && text.includes("focus-visible"));
			expect(entryRing, "entry focus ring is declared").to.be.a("string");
			expect(entryRing).to.contain("outline");
			expect(backRing, "back-control focus ring is declared").to.be.a("string");
			expect(backRing).to.contain("outline");
		});
	});

	it("uses no ranking, comparison or verdict language on either folio", () => {
		cy.viewport(390, 844);
		const forbidden = ["percentile", "than most meals", "better than", "worse than", "ranks", "normal range", "score band", "Save to History", "Unsaved estimate"];

		for (const path of ["/meals", "/meals/previous"] as Array<"/meals" | "/meals/previous">) {
			visitJournal(path);
			cy.get(".journal-folio-content")
				.invoke("text")
				.then((text) => {
					const lowered = text.toLowerCase();
					for (const phrase of forbidden) {
						expect(lowered, `${path} must not contain "${phrase}"`).to.not.contain(phrase.toLowerCase());
					}
				});
			assertNoForbiddenPhrases();
		}
	});
});

// A landscape phone is a wide viewport. A Pixel 8 rotated is 915 x 412 CSS px,
// which crosses the 768px breakpoint the shared foundation uses for "desktop".
// J1 capped `ion-app` itself there, so on a real device the whole application
// canvas collapsed to 560px and the rest of the display stayed unpainted. The
// canvas must fill its window at every width; only the reading column is
// capped. These two cells are the regression gate for that law.
const LANDSCAPE_WIDTH = 915;
const LANDSCAPE_HEIGHT = 412;
const READING_MEASURE = 560;

describe("J6 History fills the canvas on a landscape phone", () => {
	for (const appearance of ["paper", "ink"] as Appearance[]) {
		it(`fills the window and holds one centred column in ${appearance}`, () => {
			cy.viewport(LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT);
			// The long synthetic name at 133% root text is the same content the
			// device cell carries, so wrapping is measured under real pressure.
			visitJournal("/meals", { appearance, meals: longNameMeals, largeText: true });

			cy.window().then((win) => {
				expect(win.matchMedia("(min-width: 768px)").matches, "a landscape phone really is past the wide breakpoint").to.equal(true);
				expect(win.innerWidth, "landscape viewport width").to.equal(LANDSCAPE_WIDTH);
			});

			// 1. The shell spans the whole window — this is the defect itself.
			cy.get("ion-app").should(($app) => {
				const rect = $app[0].getBoundingClientRect();
				expect(rect.left, "shell starts at the left edge").to.be.closeTo(0, 1);
				expect(rect.width, "shell spans the full viewport").to.be.closeTo(LANDSCAPE_WIDTH, 1);
			});

			// 2. The active page and its content are not boxed to half the display.
			cy.get("ion-content.journal-folio-content").should(($content) => {
				const rect = $content[0].getBoundingClientRect();
				expect(rect.left, "content region starts at the left edge").to.be.closeTo(0, 1);
				expect(rect.width, "content region spans the full viewport").to.be.closeTo(LANDSCAPE_WIDTH, 1);

				// 3. Paper/ink paints the whole canvas, not just the column.
				const background = $content[0].shadowRoot?.querySelector("#background-content") as HTMLElement;
				expect(background, "content paints a background layer").to.not.equal(null);
				expect(background.getBoundingClientRect().width, "the appearance background covers the full width").to.be.closeTo(LANDSCAPE_WIDTH, 1);
			});

			// 4. The reading measure survives: one column, capped and centred.
			cy.get("ion-content.journal-folio-content").should(($content) => {
				const scroll = $content[0].shadowRoot?.querySelector(".inner-scroll") as HTMLElement;
				const rect = scroll.getBoundingClientRect();
				expect(rect.width, "reading column stays at the 560px measure").to.be.at.most(READING_MEASURE + 1);
				expect((rect.left + rect.right) / 2, "reading column is centred in the canvas").to.be.closeTo(LANDSCAPE_WIDTH / 2, 1);
			});

			// 5. A rotated phone reports a real cutout inset — 50px on the left of a
			// landscape Pixel 8. Inside a centred column that inset has no edge to
			// clear, so it must not push the column off centre. Chrome reports no
			// inset of its own, so the device's value is applied here deliberately.
			cy.document().then((doc) => {
				doc.documentElement.style.setProperty("--ion-safe-area-left", "50px");
				doc.documentElement.style.setProperty("--ion-safe-area-right", "0px");
			});
			cy.get("ion-content.journal-folio-content").should(($content) => {
				const scroll = $content[0].shadowRoot?.querySelector(".inner-scroll") as HTMLElement;
				const style = getComputedStyle(scroll);
				const rect = scroll.getBoundingClientRect();
				const columnLeft = rect.left + parseFloat(style.paddingLeft);
				const columnRight = rect.right - parseFloat(style.paddingRight);
				expect((columnLeft + columnRight) / 2, "a device inset does not push the reading column off centre").to.be.closeTo(LANDSCAPE_WIDTH / 2, 1);
			});

			// 6. Single column: every entry shares one left edge and one width.
			cy.get("ion-item.journal-entry-card").should(($cards) => {
				const boxes = Array.from($cards).map((card) => card.getBoundingClientRect());
				const first = boxes[0];
				for (const box of boxes) {
					expect(box.left, "entries share one column edge").to.be.closeTo(first.left, 1);
					expect(box.width, "entries share one column width").to.be.closeTo(first.width, 1);
				}
			});

			// 7. The long name wraps inside the column instead of clipping.
			cy.get(".journal-entry-caption h3").first().should(($name) => {
				const el = $name[0];
				const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
				expect(el.textContent?.trim(), "the long synthetic name is the one under test").to.equal(LONG_MEAL_NAME);
				expect(el.getBoundingClientRect().height, "the long name wraps onto more than one line").to.be.greaterThan(lineHeight * 1.5);
				expect(el.scrollWidth, "the long name does not overflow its column").to.be.at.most(el.clientWidth + 1);
			});

			// 8. The tab dock spans the canvas and sits below the content, never over it.
			cy.get("ion-tab-bar").should(($tabBar) => {
				const rect = $tabBar[0].getBoundingClientRect();
				expect(rect.width, "tab chrome spans the full viewport").to.be.closeTo(LANDSCAPE_WIDTH, 1);
			});
			cy.get("ion-content.journal-folio-content").then(($content) => {
				const contentBottom = $content[0].getBoundingClientRect().bottom;
				cy.get("ion-tab-bar").should(($tabBar) => {
					expect($tabBar[0].getBoundingClientRect().top, "tab chrome starts below the content").to.be.at.least(contentBottom - 1);
				});
			});

			// 9. Nothing about the fix may reintroduce a horizontal scroll.
			assertNoHorizontalOverflow();
			assertLastEntryClearsTabBar();
		});
	}
});
