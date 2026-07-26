import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EvidenceRows, { CALORIE_BAR_NOTE } from "./EvidenceRows";
import { MealItem, Unit } from "../types/MealItem";

// Annotated Journal J5. Synthetic data only. These tests pin the honesty
// boundary as much as the layout: no percentage text, no load language, and a
// visible sentence saying what the bars actually measure.

const item = (overrides: Partial<MealItem> = {}): MealItem => ({
	id: "item-1",
	name: "Steamed rice",
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount: 2,
	kcalPerServing: 200,
	carbPerServing_g: 45,
	satFatPerServing_g: 0.2,
	gi: 60,
	source: "exact_fii",
	why: "matched FII table entry",
	...overrides,
});

describe("EvidenceRows", () => {
	it("renders the drivers line and one row per stored item", () => {
		render(<EvidenceRows items={[item(), item({ id: "item-2", name: "Sweet sauce", why: undefined, source: "macro_fallback" })]} drivers={["steamed rice", "sweet sauce"]} />);

		expect(screen.getByText("What drove it")).toBeTruthy();
		expect(screen.getByText("Main drivers")).toBeTruthy();
		expect(screen.getByText("steamed rice")).toBeTruthy();
		expect(screen.getByText("sweet sauce")).toBeTruthy();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByText("Steamed rice")).toBeTruthy();
		expect(screen.getByText("Sweet sauce")).toBeTruthy();
	});

	it("reads driver-matched items first while keeping every item", () => {
		const { container } = render(
			<EvidenceRows
				items={[item({ id: "salad", name: "Side salad" }), item({ id: "rice", name: "Steamed rice" })]}
				drivers={["steamed rice"]}
			/>,
		);

		const names = Array.from(container.querySelectorAll(".result-evidence-name")).map((node) => node.textContent);
		expect(names).toEqual(["Steamed rice", "Side salad"]);
	});

	it("keeps a driver that matches no stored item", () => {
		render(<EvidenceRows items={[item()]} drivers={["steamed rice", "sweet sauce"]} />);
		// "sweet sauce" has no item of its own; the backend still named it.
		expect(screen.getByText("sweet sauce")).toBeTruthy();
		expect(screen.getAllByRole("listitem")).toHaveLength(1);
	});

	it("rounds item calories and never prints a percentage", () => {
		const { container } = render(<EvidenceRows items={[item({ kcalPerServing: 200.4, amount: 1 })]} drivers={[]} />);

		expect(screen.getByText("≈ 200 kcal")).toBeTruthy();
		expect(container.textContent).not.toContain("%");
	});

	it("states what the bars measure and marks them decorative", () => {
		const { container } = render(<EvidenceRows items={[item(), item({ id: "item-2", name: "Sauce", kcalPerServing: 100, amount: 1 })]} drivers={[]} />);

		expect(screen.getByText(CALORIE_BAR_NOTE)).toBeTruthy();
		const bars = container.querySelectorAll(".result-evidence-bar");
		expect(bars).toHaveLength(2);
		bars.forEach((bar) => expect(bar.getAttribute("aria-hidden")).toBe("true"));
	});

	it("sizes each bar by the item's share of the meal's calories", () => {
		const { container } = render(
			<EvidenceRows items={[item({ id: "a", kcalPerServing: 300, amount: 1 }), item({ id: "b", kcalPerServing: 100, amount: 1 })]} drivers={[]} />,
		);

		const fills = Array.from(container.querySelectorAll(".result-evidence-bar i")) as HTMLElement[];
		expect(fills[0].style.width).toBe("75.00%");
		expect(fills[1].style.width).toBe("25.00%");
	});

	it("omits bars and the bar sentence when the meal has no calories", () => {
		const { container } = render(<EvidenceRows items={[item({ kcalPerServing: 0 })]} drivers={[]} />);

		expect(container.querySelectorAll(".result-evidence-bar")).toHaveLength(0);
		expect(screen.queryByText(CALORIE_BAR_NOTE)).toBeNull();
		// The row itself still reports the item honestly.
		expect(screen.getByText("Steamed rice")).toBeTruthy();
		expect(screen.getByText("≈ 0 kcal")).toBeTruthy();
	});

	it("falls back to the sealed source wording when an item has no why line", () => {
		render(<EvidenceRows items={[item({ why: undefined, source: "macro_fallback" })]} drivers={[]} />);
		expect(screen.getByText("Macro-based rough estimate")).toBeTruthy();
	});

	it("renders nothing when there is neither an item nor a driver", () => {
		const { container } = render(<EvidenceRows items={[]} drivers={[]} />);
		expect(container.querySelector(".result-evidence")).toBeNull();
	});

	it("marks the muted variant without hiding evidence", () => {
		const { container } = render(<EvidenceRows items={[item()]} drivers={[]} muted />);
		expect(container.querySelector(".result-evidence-muted")).toBeTruthy();
		expect(screen.getByText("Steamed rice")).toBeTruthy();
	});

	it("does not warn about duplicate keys when drivers and items repeat", () => {
		const repeated = ["rice", "rice", "rice"];
		const items = ["a", "b", "c"].map((id) => item({ id, name: "Rice" }));
		const { container } = render(<EvidenceRows items={items} drivers={repeated} />);

		expect(container.querySelectorAll(".result-driver")).toHaveLength(3);
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
	});
});
