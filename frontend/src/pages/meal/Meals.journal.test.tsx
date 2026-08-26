import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";

// History as the journal folio (Slice J6, issue #123). These tests pin the
// presentation contract and the read-only law together: History may look like
// the previous-meal picker, but it must never offer reuse, never show the
// retired score circle, and never carry the picker's action line.
// Synthetic demo-shaped data only. No real user or health data.

const SYNTHETIC_PHOTO = "data:image/png;base64,synthetic-history-photo";

const dayOffset = (days: number, hour: number, minute = 0) => {
	const date = new Date();
	date.setDate(date.getDate() - days);
	date.setHours(hour, minute, 0, 0);
	return date.getTime();
};

const meal = (overrides: Partial<Meal> = {}): Meal => ({
	id: "history-meal",
	image: null,
	name: "Synthetic oats bowl",
	timestamp: dayOffset(0, 8, 15),
	items: [],
	acute_score: 189,
	estimate_quality: "high",
	...overrides,
});

const stubBackend = () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: unknown) => {
			const url = String(input);
			if (url.includes("/metrics/chronic")) {
				return { ok: true, json: async () => ({ days: 30, series: [], current_rolling_7d_dii: 0.4 }) };
			}
			if (url.includes("/meals")) {
				return { ok: true, json: async () => [] };
			}
			return { ok: false, json: async () => ({}) };
		}),
	);
};

const renderHistory = async (meals: Meal[]) => {
	usePersistentMealStore.setState({ meals });
	window.history.pushState({}, "", "/meals");
	const view = render(<App />);
	await screen.findByRole("heading", { level: 1, name: "Meal journal" });
	return view;
};

describe("History renders the J6 journal folio", () => {
	beforeEach(() => {
		localStorage.clear();
		stubBackend();
		useCurrentMealStore.getState().resetMeal();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		usePersistentMealStore.setState({ meals: [] });
	});

	it("keeps the History toolbar title and adds the folio heading and read-only explainer", async () => {
		const { container } = await renderHistory([meal()]);

		// Scoped to the toolbar: "History" is also the tab label.
		expect(container.querySelector("ion-title")?.textContent).toBe("History");
		expect(screen.getByRole("heading", { level: 1, name: "Meal journal" })).toBeTruthy();
		expect(screen.getByText("Tap an entry to revisit its saved result. To log one again, use Log Meal.")).toBeTruthy();
	});

	it("breaks entries into Today, Yesterday and dated day groups without reordering them", async () => {
		const { container } = await renderHistory([
			meal({ id: "today-meal", name: "Synthetic today bowl", timestamp: dayOffset(0, 12) }),
			meal({ id: "yesterday-meal", name: "Synthetic yesterday bowl", timestamp: dayOffset(1, 12) }),
			meal({ id: "older-meal", name: "Synthetic older bowl", timestamp: dayOffset(4, 12) }),
		]);

		const dayLabels = Array.from(container.querySelectorAll("h2.journal-daybreak")).map((heading) => heading.textContent);
		expect(dayLabels).toHaveLength(3);
		expect(dayLabels[0]).toBe("Today");
		expect(dayLabels[1]).toBe("Yesterday");
		expect(dayLabels[2]).not.toBe("Today");
		expect(dayLabels[2]).not.toBe("Yesterday");

		// Store order is presentation input, never rewritten by the grouping.
		const names = Array.from(container.querySelectorAll(".journal-entry-caption h3")).map((heading) => heading.textContent);
		expect(names).toEqual(["Synthetic today bowl", "Synthetic yesterday bowl", "Synthetic older bowl"]);
	});

	it("labels an unusable timestamp with the sealed fallback wording", async () => {
		const { container } = await renderHistory([meal({ id: "broken-meal", timestamp: Number.NaN })]);

		expect(container.querySelector("h2.journal-daybreak")?.textContent).toBe("Date unavailable");
		expect(screen.getByText(/Time unavailable/)).toBeTruthy();
	});

	it("renders a photo when one exists and the typographic plate when it does not", async () => {
		const { container } = await renderHistory([
			meal({ id: "photo-meal", name: "Synthetic photo bowl", image: SYNTHETIC_PHOTO }),
			meal({ id: "plate-meal", name: "Egg toast breakfast", timestamp: dayOffset(1, 9) }),
		]);

		expect(container.querySelector("img.journal-entry-image")).toHaveAttribute("src", SYNTHETIC_PHOTO);
		expect(container.querySelector(".typographic-plate-monogram")).toHaveTextContent("Et");
		expect(container.querySelector(".typographic-plate")).toHaveAttribute("aria-hidden", "true");
	});

	it("drops the estimate and the quality word from the meta line when the meal has neither", async () => {
		const { container } = await renderHistory([meal({ acute_score: undefined, estimate_quality: undefined })]);

		const metaLine = container.querySelector(".journal-entry-caption p")?.textContent ?? "";
		expect(metaLine).not.toContain("estimate");
		expect(metaLine).not.toContain("Data quality");
		expect(metaLine.toLocaleLowerCase()).toContain("8:15 am");
	});

	it("renders a long meal name in full instead of truncating it", async () => {
		const longName = "Homemade mutton keema biryani with extra-long basmati rice and cucumber raita";
		await renderHistory([meal({ name: longName })]);

		expect(screen.getByText(longName)).toHaveTextContent(longName);
	});

	it("opens the canonical read-only saved result and never builds a draft", async () => {
		const { container } = await renderHistory([meal({ id: "saved/id" })]);

		expect(container.querySelector("ion-item.journal-entry-card")).toHaveAttribute("router-link", "/meals/saved/saved%2Fid");
		expect(useCurrentMealStore.getState().meal.source_meal_id).toBeUndefined();
		expect(useCurrentMealStore.getState().meal.items).toHaveLength(0);
	});

	it("shows the sealed empty state without the explainer, keeping the folio heading", async () => {
		await renderHistory([]);

		expect(screen.getByRole("heading", { level: 1, name: "Meal journal" })).toBeTruthy();
		expect(screen.getByRole("heading", { level: 2, name: "No saved meals yet" })).toBeTruthy();
		expect(screen.getByText("Meals you check and save will appear here.")).toBeTruthy();
		expect(screen.queryByText("Tap an entry to revisit its saved result. To log one again, use Log Meal.")).toBeNull();
	});

	it("carries no retired score presentation, calorie metadata, or reuse affordance", async () => {
		const { baseElement, container } = await renderHistory([meal({ acute_score: 1580 })]);

		// The retired circular meter and its capped-ring label are gone; the quiet
		// "estimate N" inside the sealed meta line is the only score on the page.
		expect(container.querySelector(".CircularProgressbar")).toBeNull();
		expect(container.querySelector("svg")).toBeNull();
		expect(container.querySelector("[aria-label*='the ring caps at 100']")).toBeNull();
		expect(screen.queryByText("above ref")).toBeNull();
		expect(screen.getByText(/estimate 1580/)).toBeTruthy();

		const historyPage = baseElement.querySelector(".journal-folio-content");
		expect(historyPage?.textContent).not.toContain("kcal");
		expect(historyPage?.textContent).not.toContain("Use as new draft");
		expect(within(historyPage as HTMLElement).queryByText(/Edit|Delete|Log again/)).toBeNull();
	});

	it("keeps a single h1 above the day headings and the meal names", async () => {
		const { container } = await renderHistory([meal()]);

		await waitFor(() => expect(container.querySelectorAll("h1")).toHaveLength(1));
		expect(container.querySelector("h1")?.textContent).toBe("Meal journal");
		expect(container.querySelector("h2")?.className).toContain("journal-daybreak");
		expect(container.querySelector(".journal-entry-caption h3")).toBeTruthy();
	});
});
