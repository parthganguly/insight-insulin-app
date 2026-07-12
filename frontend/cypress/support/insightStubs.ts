/// <reference types="cypress" />

// Deterministic synthetic backend stubs for the INSIGHT browser smoke suite
// (issue #93). Every network call the app makes is intercepted — no live
// backend, no OpenAI, no real meal photos, synthetic data only.

export type SyntheticBackendMeal = {
	id: string;
	created_at: string;
	meal_name: string;
	items: Array<Record<string, unknown>>;
	insulin_load_total: number;
	acute_score: number;
	kcal_total: number;
	carbs_total: number;
	protein_total: number;
	fat_total: number;
	estimate_quality: string;
	main_insulin_drivers: string[];
};

export const syntheticBackendMeal = (id: string, name: string, acuteScore: number, overrides: Partial<SyntheticBackendMeal> = {}): SyntheticBackendMeal => ({
	id,
	created_at: "2026-07-12T10:00:00Z",
	meal_name: name,
	items: [
		{
			name: "steamed rice",
			quantity: 2,
			unit: "serving",
			kcalPerUnit: 200,
			carb_g: 45,
			protein_g: 4,
			fat_g: 0.5,
			satFat_g: 0.2,
			gi: 60,
			fii: null,
			fii_value: null,
			kcal_item: 400,
			insulin_load: (acuteScore * 30) / 100,
			confidence: 0.7,
			fii_source: "exact_fii",
			why: "Used a direct Food Insulin Index match and scaled it by eaten energy.",
		},
	],
	insulin_load_total: (acuteScore * 30) / 100,
	acute_score: acuteScore,
	kcal_total: 400,
	carbs_total: 90,
	protein_total: 8,
	fat_total: 1,
	estimate_quality: "high",
	main_insulin_drivers: ["steamed rice"],
	...overrides,
});

export type SyntheticChronicOptions = {
	loggedDays: number;
	rollingDii: number | null;
};

export const syntheticChronicMetrics = ({ loggedDays, rollingDii }: SyntheticChronicOptions) => ({
	days: 30,
	window_days: 7,
	logged_days_last_7: loggedDays,
	has_data: loggedDays > 0,
	series: [],
	current_daily_dil: null,
	current_daily_dii: null,
	current_rolling_7d_dil: rollingDii === null ? null : rollingDii * 400,
	current_rolling_7d_dii: rollingDii,
});

export type StubBackendOptions = {
	meals?: SyntheticBackendMeal[];
	chronic?: SyntheticChronicOptions;
	mealsFail?: boolean;
	chronicFail?: boolean;
};

// The backend origin the app calls (frontend/config.json). Intercepts are
// scoped to it so they can never swallow the dev server's own document
// requests (e.g. visiting the /meals route of the SPA itself).
export const BACKEND_ORIGIN = "http://127.0.0.1:8000";

// Registers intercepts for every backend route the app calls.
export const stubBackend = ({ meals = [], chronic = { loggedDays: 0, rollingDii: null }, mealsFail = false, chronicFail = false }: StubBackendOptions = {}) => {
	if (chronicFail) {
		cy.intercept("GET", `${BACKEND_ORIGIN}/metrics/chronic*`, { statusCode: 500, body: { detail: "Internal server error" } }).as("chronic");
	} else {
		cy.intercept("GET", `${BACKEND_ORIGIN}/metrics/chronic*`, { statusCode: 200, body: syntheticChronicMetrics(chronic) }).as("chronic");
	}

	if (mealsFail) {
		cy.intercept("GET", `${BACKEND_ORIGIN}/meals`, { forceNetworkError: true }).as("meals");
	} else {
		cy.intercept("GET", `${BACKEND_ORIGIN}/meals`, { statusCode: 200, body: meals }).as("meals");
	}
};

// Fresh app state per test: clears the persisted zustand stores.
export const visitFresh = (path: string, seedLocalStorage: Record<string, unknown> = {}) => {
	cy.visit(path, {
		onBeforeLoad(win) {
			win.localStorage.clear();
			for (const [key, value] of Object.entries(seedLocalStorage)) {
				win.localStorage.setItem(key, JSON.stringify(value));
			}
		},
	});
};

// Wording that must never appear anywhere in active user-facing UI text
// (issue #93). "typical/average meal" and biological risk framing are
// unsupported claims; "Chronic Score" is the retired misleading label.
// The approved negative calibration disclaimer ("has not yet been calibrated
// to typical meals or personal responses") is the only place "typical meal*"
// may appear, so it is stripped before scanning — exactly like the unit
// tests' copy guard.
export const FORBIDDEN_UI_PHRASES = ["typical meal", "average meal", "Chronic Score", "unsafe", "unhealthy", "dangerous", "spike"];

const APPROVED_NEGATIVE_PHRASES = ["not yet been calibrated to typical meals"];

export const assertNoForbiddenPhrases = () => {
	cy.get("ion-app")
		.invoke("text")
		.then((text) => {
			let lowered = text.toLowerCase();
			for (const approved of APPROVED_NEGATIVE_PHRASES) {
				lowered = lowered.split(approved).join("");
			}
			for (const phrase of FORBIDDEN_UI_PHRASES) {
				expect(lowered, `active UI must not contain "${phrase}"`).not.to.contain(phrase.toLowerCase());
			}
		});
};

// A real rendering guard for content inside Ionic's fixed-layout scroll
// container. Cypress's `be.visible` heuristic reports false negatives there
// (it treats the `position: fixed` ancestor + overflow as "covered"), but
// presence in the DOM alone is too weak — it would pass for text rendered
// into a hidden or zero-size node. This asserts the element is actually laid
// out and painted: non-empty text, non-zero box, and not display/visibility
// hidden. Use it for load-bearing assertions instead of bare `exist`.
export const shouldBeRendered = (selector: string, text?: string) => {
	const chain = text === undefined ? cy.get(selector) : cy.contains(selector, text);
	return chain.should(($el) => {
		const el = $el[0];
		const rect = el.getBoundingClientRect();
		const style = window.getComputedStyle(el);
		expect(el.textContent?.trim(), "rendered text is non-empty").to.not.equal("");
		expect(rect.width, "rendered width > 0").to.be.greaterThan(0);
		expect(rect.height, "rendered height > 0").to.be.greaterThan(0);
		expect(style.display, "not display:none").to.not.equal("none");
		expect(style.visibility, "not visibility:hidden").to.not.equal("hidden");
		expect(Number(style.opacity), "not fully transparent").to.be.greaterThan(0);
	});
};

export const assertNoHorizontalOverflow = () => {
	cy.window().then((win) => {
		const overflow = win.document.documentElement.scrollWidth - win.innerWidth;
		expect(overflow, "page must not scroll horizontally").to.be.at.most(1);
	});
};
