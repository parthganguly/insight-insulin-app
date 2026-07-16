import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { useCurrentMealStore } from "./stores/currentMealStore";
import { usePersistentMealStore } from "./stores/persistentMealStore";

const stubEmptyBackend = () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: unknown) => {
			const url = String(input);
			if (url.includes("/metrics/chronic")) {
				return { ok: true, json: async () => ({ window_days: 7, logged_days_last_7: 0, has_data: false, series: [] }) };
			}
			return { ok: true, json: async () => [] };
		}),
	);
};

const renderAt = (path: string) => {
	window.history.replaceState({}, "", path);
	return render(<App />);
};

describe("Campaign A app navigation", () => {
	beforeEach(() => {
		localStorage.clear();
		stubEmptyBackend();
		usePersistentMealStore.setState({ meals: [] });
		useCurrentMealStore.getState().resetMeal();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders exactly three bottom tabs with matching visible and accessible names", () => {
		const { baseElement } = renderAt("/dashboard");
		const tabs = Array.from(baseElement.querySelectorAll("ion-tab-button"));

		expect(tabs).toHaveLength(3);
		expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual(["Home", "Log Meal", "History"]);
		expect(tabs.map((tab) => tab.querySelector("ion-label")?.textContent?.trim())).toEqual(["Home", "Log Meal", "History"]);
	});

	it.each([
		["/log-meal", "logMeal"],
		["/meals/new", "logMeal"],
		["/meals/new/ai", "logMeal"],
		["/meals/previous", "logMeal"],
		["/meals", "history"],
		["/meals/saved/synthetic-id", "history"],
	] as const)("maps %s to the intended journey tab", async (path, tab) => {
		const { baseElement } = renderAt(path);

		await waitFor(() => {
			const selectedTab = baseElement.querySelector<HTMLIonTabButtonElement>(`ion-tab-button[tab="${tab}"]`);
			expect(selectedTab?.selected).toBe(true);
			expect(selectedTab).toHaveClass("journey-tab-selected");
		});
	});

	it("selects Log Meal, not History, on the manual confirmation route", async () => {
		const { baseElement } = renderAt("/meals/new");

		await waitFor(() => {
			const logMealTab = baseElement.querySelector<HTMLIonTabButtonElement>('ion-tab-button[tab="logMeal"]');
			const historyTab = baseElement.querySelector<HTMLIonTabButtonElement>('ion-tab-button[tab="history"]');
			expect(logMealTab?.selected).toBe(true);
			expect(logMealTab).toHaveClass("journey-tab-selected");
			expect(historyTab?.selected).toBe(false);
			expect(historyTab).not.toHaveClass("journey-tab-selected");
		});
	});

	it("takes the empty Home primary action directly to the three-choice Log Meal chooser", async () => {
		renderAt("/dashboard");

		const primaryActions = await screen.findAllByLabelText("Check a meal");
		expect(primaryActions).toHaveLength(1);
		fireEvent.click(primaryActions[0]);

		await waitFor(() => expect(window.location.pathname).toBe("/log-meal"));
		for (const name of ["Take a photo", "Enter manually", "Log a previous meal again"]) {
			const visibleLabel = await screen.findByText(name);
			expect(visibleLabel).toBeVisible();
		}
	});

	it.each([
		["Take a photo", "/meals/new/ai"],
		["Enter manually", "/meals/new"],
		["Log a previous meal again", "/meals/previous"],
	] as const)("routes %s to its approved destination", async (name, destination) => {
		renderAt("/log-meal");

		const choice = await screen.findByLabelText(name);
		await waitFor(() => {
			expect(choice.shadowRoot?.querySelector("button")).not.toBeNull();
		});
		const nativeButton = choice.shadowRoot?.querySelector<HTMLElement>("button");
		nativeButton?.focus();
		expect(choice).toHaveFocus();
		fireEvent.click(choice);

		await waitFor(() => expect(window.location.pathname).toBe(destination));
		expect(choice).not.toHaveFocus();
		if (name === "Enter manually") {
			expect(useCurrentMealStore.getState().meal.items).toHaveLength(1);
			expect(useCurrentMealStore.getState().meal.backend_created_at).toBeUndefined();
		}
	});
});
