import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Meal } from "../types/Meal";
import { MealItem, Unit } from "../types/MealItem";
import PreviousMealEntryCard, { PREVIOUS_MEAL_ACTION_LINE } from "./PreviousMealEntryCard";

// The picker entry is the reuse wrapper (issue #123, Component Law C). It
// shares the journal body with the History card but nothing else: its
// destination is hardwired to the confirmation draft, it exposes only an
// onSelect callback, and it can never navigate to a saved result.
// Synthetic demo-shaped data only. No real user or health data.

const item = (kcalPerServing: number, amount: number): MealItem => ({
	id: `synthetic-${kcalPerServing}`,
	name: "Synthetic item",
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount,
	kcalPerServing,
	carbPerServing_g: 0,
	satFatPerServing_g: 0,
	gi: 0,
});

const syntheticMeal = (overrides: Partial<Meal> = {}): Meal => ({
	id: "synthetic-previous-meal",
	image: null,
	name: "Synthetic oats bowl",
	timestamp: new Date(2026, 6, 19, 8, 15).getTime(),
	items: [item(200, 2), item(76, 1)],
	acute_score: 189,
	estimate_quality: "high",
	...overrides,
});

describe("PreviousMealEntryCard", () => {
	it("is one interactive item hardwired to the editable draft route", () => {
		const { container } = render(<PreviousMealEntryCard meal={syntheticMeal()} onSelect={() => {}} />);
		const card = container.querySelector("ion-item");

		expect(container.querySelectorAll("ion-item")).toHaveLength(1);
		expect(card).toHaveAttribute("router-link", "/meals/new");
		// Ionic attaches `button` as a DOM property, not an attribute.
		expect((card as HTMLElement & { button?: boolean }).button).toBe(true);
		expect(container.querySelector("ion-item a")).toBeNull();
		expect(container.querySelector("ion-item button")).toBeNull();
		expect(container.querySelector("ion-item ion-button")).toBeNull();
	});

	it("invokes onSelect exactly once when the entry is chosen", () => {
		const onSelect = vi.fn();
		const { container } = render(<PreviousMealEntryCard meal={syntheticMeal()} onSelect={onSelect} />);

		fireEvent.click(container.querySelector("ion-item") as Element);

		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it("states what selection does in visible text", () => {
		render(<PreviousMealEntryCard meal={syntheticMeal()} onSelect={() => {}} />);

		expect(screen.getByText(PREVIOUS_MEAL_ACTION_LINE)).toBeTruthy();
		expect(PREVIOUS_MEAL_ACTION_LINE).toBe("Use as new draft");
	});

	it("names itself from the meal, its time and calories, and the action, in that order", () => {
		const { container } = render(<PreviousMealEntryCard meal={syntheticMeal()} onSelect={() => {}} />);
		const card = container.querySelector("ion-item") as Element;

		const labelIds = (card.getAttribute("aria-labelledby") ?? "").split(" ");
		expect(labelIds).toHaveLength(3);
		const labelledText = labelIds.map((id) => container.querySelector(`#${CSS.escape(id)}`)?.textContent ?? "");
		expect(labelledText[0]).toBe("Synthetic oats bowl");
		expect(labelledText[1].toLocaleLowerCase()).toContain("8:15 am");
		expect(labelledText[1]).toContain("476 kcal");
		expect(labelledText[2]).toBe("Use as new draft");
		expect(card).not.toHaveAttribute("aria-label");
	});

	it("uses an existing local photo, and the typographic plate when there is none", () => {
		const image = "data:image/png;base64,synthetic-photo";
		const withPhoto = render(<PreviousMealEntryCard meal={syntheticMeal({ image })} onSelect={() => {}} />);
		expect(withPhoto.container.querySelector("img.journal-entry-image")).toHaveAttribute("src", image);
		expect(withPhoto.container.querySelector(".typographic-plate")).toBeNull();
		withPhoto.unmount();

		const withPlate = render(<PreviousMealEntryCard meal={syntheticMeal({ name: "Egg toast breakfast" })} onSelect={() => {}} />);
		expect(withPlate.container.querySelector("img")).toBeNull();
		expect(withPlate.container.querySelector(".typographic-plate-monogram")).toHaveTextContent("Et");
	});

	it("shows no saved score, quality or retired meter at the moment of selection", () => {
		const { container } = render(<PreviousMealEntryCard meal={syntheticMeal()} onSelect={() => {}} />);
		const text = container.textContent ?? "";

		expect(text).not.toContain("estimate 189");
		expect(text).not.toContain("Data quality");
		expect(text).not.toContain("above ref");
		expect(container.querySelector(".CircularProgressbar")).toBeNull();
		expect(container.querySelector("svg")).toBeNull();
		expect(container.querySelector("[router-link^='/meals/saved/']")).toBeNull();
	});

	it("renders a long meal name in full", () => {
		const longName = "Homemade mutton keema biryani with extra-long basmati rice and cucumber raita";
		render(<PreviousMealEntryCard meal={syntheticMeal({ name: longName })} onSelect={() => {}} />);

		expect(screen.getByText(longName)).toHaveTextContent(longName);
	});
});
