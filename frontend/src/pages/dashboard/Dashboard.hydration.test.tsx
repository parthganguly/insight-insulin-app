import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import { usePersistentMealStore } from "../../stores/persistentMealStore";

// Synthetic demo-shaped backend payloads only. No real user or health data.
const seededBackendMeals = [
	{
		id: "demo-meal-1",
		created_at: "2026-07-01T12:00:00Z",
		meal_name: "Demo: Overnight oats",
		items: [],
		insulin_load_total: 90,
		acute_score: 38,
		kcal_total: 250,
		carbs_total: 40,
		protein_total: 8,
		fat_total: 5,
		estimate_quality: "high",
		main_insulin_drivers: ["rolled oats"],
	},
];

const chronicMetricsBody = {
	days: 30,
	series: [],
	current_daily_dil: 0.4,
	current_daily_dii: 0.4,
	current_rolling_7d_dil: 0.4,
	current_rolling_7d_dii: 0.4,
};

const stubBackend = ({ mealsOk }: { mealsOk: boolean }) => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: unknown) => {
			const url = String(input);
			if (url.includes("/metrics/chronic")) {
				return { ok: true, json: async () => chronicMetricsBody };
			}
			if (url.includes("/meals")) {
				if (!mealsOk) throw new Error("backend unreachable");
				return { ok: true, json: async () => seededBackendMeals };
			}
			return { ok: false, json: async () => ({}) };
		}),
	);
};

describe("Dashboard private-beta hydration", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("replaces 'No Meals Logged' with hydrated backend meals on a fresh load", async () => {
		stubBackend({ mealsOk: true });

		render(<App />);

		expect(await screen.findByText("Demo: Overnight oats")).toBeTruthy();
		expect(screen.queryByText("No Meals Logged")).toBeNull();
	});

	it("still shows 'No Meals Logged' when the backend is unavailable and the local store is empty", async () => {
		stubBackend({ mealsOk: false });

		render(<App />);

		expect(await screen.findByText("No Meals Logged")).toBeTruthy();
	});
});
