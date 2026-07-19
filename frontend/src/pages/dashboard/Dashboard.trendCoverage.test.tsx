import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { CHRONIC_TREND_DISCLAIMER } from "../../utils/safetyCopy";
import { TREND_ARIA_LOADING, TREND_ARIA_UNAVAILABLE, TREND_LOADING_LINE, TREND_STATUS_LINE, getTrendAriaLabel } from "../../utils/trendDisplay";

// 7-Day Logged Meal Trend rendering (issue #93): the Dashboard must show the
// logged-days-only trend with explicit coverage ("N of 7 days logged"), show
// no score (never 0) when the window has no logged days, and never render
// the retired "Chronic Score" label. Synthetic data only.

const localMeal: Meal = {
	id: "local-meal-1",
	image: null,
	name: "Synthetic Local Meal",
	timestamp: Date.parse("2026-07-10T12:00:00Z"),
	items: [],
	acute_score: 120,
};

type ChronicStub =
	| { kind: "ok"; loggedDays: number; rollingDii: number | null }
	| { kind: "http-error" }
	| { kind: "pending" };

const stubBackend = (chronic: ChronicStub) => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: unknown) => {
			const url = String(input);
			if (url.includes("/metrics/chronic")) {
				if (chronic.kind === "pending") {
					return new Promise(() => {}); // never resolves: loading state
				}
				if (chronic.kind === "http-error") {
					return { ok: false, status: 500, json: async () => ({ detail: "Internal server error" }) };
				}
				return {
					ok: true,
					json: async () => ({
						days: 30,
						window_days: 7,
						logged_days_last_7: chronic.loggedDays,
						has_data: chronic.loggedDays > 0,
						series: [],
						current_daily_dil: null,
						current_daily_dii: null,
						current_rolling_7d_dil: chronic.rollingDii === null ? null : chronic.rollingDii * 400,
						current_rolling_7d_dii: chronic.rollingDii,
					}),
				};
			}
			if (url.includes("/meals")) {
				return { ok: true, json: async () => [] };
			}
			return { ok: false, json: async () => ({}) };
		}),
	);
};

const renderDashboard = () => {
	window.history.pushState({}, "", "/dashboard");
	return render(<App />);
};

describe("Dashboard 7-Day Logged Meal Trend (issue #93)", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [localMeal] });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the one-line trend with full coverage and the logged-days value", async () => {
		stubBackend({ kind: "ok", loggedDays: 7, rollingDii: 0.15 });
		const { baseElement } = renderDashboard();

		expect(await screen.findByText("7 of 7 days logged")).toBeTruthy();
		expect(await screen.findByText("15")).toBeTruthy(); // round(0.15 × 100)
		expect(baseElement.querySelector(".home-trend-sentence")?.textContent).toBe("7 of 7 days logged · 7-day index 15");
		expect(baseElement.querySelector(".hero-ring,.hero-bezel,.CircularProgressbar")).toBeNull();
		expect(screen.queryByText("Chronic Score")).toBeNull();
	});

	it("keeps the trend sentence label narrow while exposing the gloss and collapsed footnote separately", async () => {
		const user = userEvent.setup();
		stubBackend({ kind: "ok", loggedDays: 5, rollingDii: 0.62 });
		const { baseElement } = renderDashboard();

		const sentence = await screen.findByRole("img", { name: getTrendAriaLabel("value", 62, 5, 7) });
		expect(sentence).toHaveClass("home-trend-sentence");
		expect(sentence).toHaveTextContent("5 of 7 days logged · 7-day index 62");
		expect(baseElement.querySelector(".home-trend-annotation")).not.toHaveAttribute("role");
		expect(screen.getByText(TREND_STATUS_LINE)).toBeVisible();

		const summary = screen.getByText("What this doesn't mean");
		const footnote = summary.closest("details");
		const disclaimer = screen.getByText(CHRONIC_TREND_DISCLAIMER);
		expect(footnote).not.toHaveAttribute("open");
		expect(disclaimer).not.toBeVisible();

		await user.click(summary);
		expect(footnote).toHaveAttribute("open");
		expect(disclaimer).toBeVisible();
	});

	// Campaign A (docs/product/ux/insight-ux-v1.md §5): below the 3-logged-day
	// threshold, Home intentionally replaces the trend ring with a compact
	// building-history line rather than rendering a low-coverage ring value.
	it("shows the building-history line instead of the ring below the 3-logged-day threshold", async () => {
		stubBackend({ kind: "ok", loggedDays: 1, rollingDii: 0.15 });
		renderDashboard();

		expect(await screen.findByText("Your 7-day trend appears after you log meals on 3 different days (1 of 3 so far).")).toBeTruthy();
		expect(screen.queryByText("7-Day Logged Meal Trend")).toBeNull();
		expect(screen.queryByRole("img", { name: /trend/ })).toBeNull();
	});

	it("shows the building-history line, not a zero score, when no days in the window are logged", async () => {
		stubBackend({ kind: "ok", loggedDays: 0, rollingDii: null });
		renderDashboard();

		expect(await screen.findByText("Your 7-day trend appears after you log meals on 3 different days (0 of 3 so far).")).toBeTruthy();
		// The building-history line states a logged-day count, never a score —
		// no trend ring (and so no risk of a bare "0" reading as a score) renders
		// below the coverage threshold.
		expect(screen.queryByRole("img", { name: /trend/ })).toBeNull();
	});

	it("shows the failure state when the trend fetch fails, without crashing", async () => {
		stubBackend({ kind: "http-error" });
		renderDashboard();

		expect(await screen.findByText("Internal server error")).toBeTruthy();
		expect(screen.getByText("--")).toBeTruthy();
	});

	it("shows the loading state while the trend fetch is in flight", async () => {
		stubBackend({ kind: "pending" });
		renderDashboard();

		expect(await screen.findByText("Loading trend from your logged meals…")).toBeTruthy();
		expect(screen.getByText("...")).toBeTruthy();
	});

	// The three absent-value states must stay distinct to a screen reader. A
	// pending or failed request knows nothing about whether meals were logged,
	// so neither may ever announce "no meals were logged".
	it("announces LOADING without claiming that no meals were logged", async () => {
		stubBackend({ kind: "pending" });
		renderDashboard();

		expect(await screen.findByText("Loading trend from your logged meals…")).toBeTruthy();
		const sentence = screen.getByRole("img", { name: TREND_ARIA_LOADING });
		const label = sentence.getAttribute("aria-label") ?? "";
		expect(label).toBe("7-day logged meal trend loading.");
		expect(label.toLowerCase()).not.toContain("no meals");
	});

	it("announces UNAVAILABLE after a failed fetch, without claiming that no meals were logged", async () => {
		stubBackend({ kind: "http-error" });
		renderDashboard();

		expect(await screen.findByText("Internal server error")).toBeTruthy();
		const sentence = screen.getByRole("img", { name: TREND_ARIA_UNAVAILABLE });
		const label = sentence.getAttribute("aria-label") ?? "";
		expect(label).toBe("7-day logged meal trend unavailable because the data could not be loaded.");
		expect(label.toLowerCase()).not.toContain("no meals");
	});

	// A confirmed zero-logged-days response gets its own honest building-history
	// announcement (via role="status") distinct from the loading/unavailable
	// text above — it must never be presented as if it were a score.
	it("announces a confirmed zero-logged-days response distinctly from loading/unavailable", async () => {
		stubBackend({ kind: "ok", loggedDays: 0, rollingDii: null });
		renderDashboard();

		const status = await screen.findByRole("status");
		expect(status.textContent).toBe("Your 7-day trend appears after you log meals on 3 different days (0 of 3 so far).");
		expect(status.textContent).not.toBe(TREND_LOADING_LINE);
		expect(status.textContent?.toLowerCase()).not.toContain("unavailable");
	});

	// The trend is an energy-normalized index (kcal-weighted mean FII) and can
	// exceed 100 using only live dataset values — a potato-only day (FII 121)
	// displays 121. The raw number must stay visible; only the ring caps.
	it.each([
		[0, "0"],
		[15, "15"],
		[100, "100"],
		[121, "121"],
		[300, "300"],
	])("renders a trend of %s as the raw uncapped number %s", async (dii100, expectedText) => {
		stubBackend({ kind: "ok", loggedDays: 7, rollingDii: dii100 / 100 });
		renderDashboard();

		expect(await screen.findByText(expectedText)).toBeTruthy();
		const sentence = screen.getByRole("img", { name: getTrendAriaLabel("value", dii100, 7, 7) });
		expect(sentence.textContent).toContain(expectedText);
		if (dii100 > 100) {
			expect(sentence.getAttribute("aria-label")).toContain("not a percentage and can exceed 100");
		}
	});

	it("exposes an accessible trend description that includes coverage and the non-clinical boundary", async () => {
		stubBackend({ kind: "ok", loggedDays: 4, rollingDii: 0.15 });
		renderDashboard();

		const sentence = await screen.findByRole("img", { name: getTrendAriaLabel("value", 15, 4, 7) });
		expect(sentence).toBeTruthy();
		// The accessible description must state what the number actually is.
		const label = sentence.getAttribute("aria-label") ?? "";
		expect(label).toContain("energy-normalized insulin-demand index");
		expect(label).toContain("4 of the last 7 days");
	});
});
