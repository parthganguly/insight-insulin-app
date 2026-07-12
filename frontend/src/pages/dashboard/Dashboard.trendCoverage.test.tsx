import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { CHRONIC_TREND_DISCLAIMER } from "../../utils/safetyCopy";
import { getTrendAriaLabel } from "../../utils/trendDisplay";

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

	it("renders the renamed trend with full coverage and the logged-days value", async () => {
		stubBackend({ kind: "ok", loggedDays: 7, rollingDii: 0.15 });
		renderDashboard();

		expect(await screen.findByText("7-Day Logged Meal Trend")).toBeTruthy();
		expect(await screen.findByText("7 of 7 days logged")).toBeTruthy();
		expect(await screen.findByText("15")).toBeTruthy(); // round(0.15 × 100)
		expect(screen.getByText(CHRONIC_TREND_DISCLAIMER)).toBeTruthy();
		expect(screen.queryByText("Chronic Score")).toBeNull();
	});

	it("shows partial coverage without changing how the value is presented", async () => {
		stubBackend({ kind: "ok", loggedDays: 1, rollingDii: 0.15 });
		renderDashboard();

		expect(await screen.findByText("1 of 7 days logged")).toBeTruthy();
		// Identical logged eating shows the identical per-logged-day value at
		// 1/7 coverage — the old zero-fill would have rendered 2 instead.
		expect(await screen.findByText("15")).toBeTruthy();
		expect(screen.queryByText("2")).toBeNull();
	});

	it("shows a no-data state, not a zero score, when no days in the window are logged", async () => {
		stubBackend({ kind: "ok", loggedDays: 0, rollingDii: null });
		renderDashboard();

		expect(await screen.findByText("0 of 7 days logged")).toBeTruthy();
		expect(await screen.findByText("No meals logged in the last 7 days, so there is no trend to show yet.")).toBeTruthy();
		// The trend ring must not present missing data as a numeric 0.
		const ring = screen.getByRole("img", { name: getTrendAriaLabel(null, 0, 7) });
		expect(ring.textContent).toContain("--");
		expect(ring.textContent).not.toMatch(/\b0\b/);
	});

	it("shows the failure state when the trend fetch fails, without crashing", async () => {
		stubBackend({ kind: "http-error" });
		renderDashboard();

		expect(await screen.findByText("7-Day Logged Meal Trend")).toBeTruthy();
		expect(await screen.findByText("Internal server error")).toBeTruthy();
		expect(screen.getByText("--")).toBeTruthy();
	});

	it("shows the loading state while the trend fetch is in flight", async () => {
		stubBackend({ kind: "pending" });
		renderDashboard();

		expect(await screen.findByText("7-Day Logged Meal Trend")).toBeTruthy();
		expect(await screen.findByText("Loading trend from your logged meals…")).toBeTruthy();
		expect(screen.getByText("...")).toBeTruthy();
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
		const ring = screen.getByRole("img", { name: getTrendAriaLabel(dii100, 7, 7) });
		// The ring geometry caps at 100 while the text keeps the raw value.
		expect(ring.textContent).toContain(expectedText);
		if (dii100 > 100) {
			expect(ring.getAttribute("aria-label")).toContain("not a percentage and can exceed 100");
		}
	});

	it("exposes an accessible trend description that includes coverage and the non-clinical boundary", async () => {
		stubBackend({ kind: "ok", loggedDays: 4, rollingDii: 0.15 });
		renderDashboard();

		const ring = await screen.findByRole("img", { name: getTrendAriaLabel(15, 4, 7) });
		expect(ring).toBeTruthy();
		// The accessible description must state what the number actually is.
		const label = ring.getAttribute("aria-label") ?? "";
		expect(label).toContain("energy-normalized insulin-demand index");
		expect(label).toContain("4 of the last 7 days");
	});
});
