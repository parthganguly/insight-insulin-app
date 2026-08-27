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
	it("renders neutral model-process framing and one row per stored item", () => {
		render(<EvidenceRows items={[item(), item({ id: "item-2", name: "Sweet sauce", why: undefined, source: "macro_fallback" })]} />);

		expect(screen.getByText("How this estimate was built")).toBeTruthy();
		expect(screen.queryByText("What drove it")).toBeNull();
		expect(screen.queryByText("Main drivers")).toBeNull();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByText("Steamed rice")).toBeTruthy();
		expect(screen.getByText("Sweet sauce")).toBeTruthy();
	});

	it("preserves stored item order without causal driver prioritisation", () => {
		const { container } = render(
			<EvidenceRows items={[item({ id: "salad", name: "Side salad" }), item({ id: "rice", name: "Steamed rice" })]} />,
		);

		const names = Array.from(container.querySelectorAll(".result-evidence-name")).map((node) => node.textContent);
		expect(names).toEqual(["Side salad", "Steamed rice"]);
	});

	it("rounds item calories and never prints a percentage", () => {
		const { container } = render(<EvidenceRows items={[item({ kcalPerServing: 200.4, amount: 1 })]} />);

		expect(screen.getByText("≈ 200 kcal")).toBeTruthy();
		expect(container.textContent).not.toContain("%");
	});

	it("states what the bars measure and marks them decorative", () => {
		const { container } = render(<EvidenceRows items={[item(), item({ id: "item-2", name: "Sauce", kcalPerServing: 100, amount: 1 })]} />);

		expect(screen.getByText(CALORIE_BAR_NOTE)).toBeTruthy();
		const bars = container.querySelectorAll(".result-evidence-bar");
		expect(bars).toHaveLength(2);
		bars.forEach((bar) => expect(bar.getAttribute("aria-hidden")).toBe("true"));
	});

	it("sizes each bar by the item's share of the meal's calories", () => {
		const { container } = render(
			<EvidenceRows items={[item({ id: "a", kcalPerServing: 300, amount: 1 }), item({ id: "b", kcalPerServing: 100, amount: 1 })]} />,
		);

		const fills = Array.from(container.querySelectorAll(".result-evidence-bar i")) as HTMLElement[];
		expect(fills[0].style.width).toBe("75.00%");
		expect(fills[1].style.width).toBe("25.00%");
	});

	it("omits bars and the bar sentence when the meal has no calories", () => {
		const { container } = render(<EvidenceRows items={[item({ kcalPerServing: 0 })]} />);

		expect(container.querySelectorAll(".result-evidence-bar")).toHaveLength(0);
		expect(screen.queryByText(CALORIE_BAR_NOTE)).toBeNull();
		// The row itself still reports the item honestly.
		expect(screen.getByText("Steamed rice")).toBeTruthy();
		expect(screen.getByText("≈ 0 kcal")).toBeTruthy();
	});

	it.each([
		["exact_fii", "Matched in INSIGHT’s current food table"],
		["mapped_fii", "Estimated using a similar food"],
		["macro_fallback", "Used a fallback estimate"],
		["user_confirmed", "Value you entered"],
		["unknown", "Not estimated in this version"],
	])("describes %s with truthful software-action copy", (source, expected) => {
		render(<EvidenceRows items={[item({ why: "Legacy direct-data claim", source })]} />);
		expect(screen.getByText(expected)).toBeTruthy();
		expect(screen.queryByText("Legacy direct-data claim")).toBeNull();
	});

	it("renders nothing when there is no stored item", () => {
		const { container } = render(<EvidenceRows items={[]} />);
		expect(container.querySelector(".result-evidence")).toBeNull();
	});

	it("marks the muted variant without hiding evidence", () => {
		const { container } = render(<EvidenceRows items={[item()]} muted />);
		expect(container.querySelector(".result-evidence-muted")).toBeTruthy();
		expect(screen.getByText("Steamed rice")).toBeTruthy();
	});
});
