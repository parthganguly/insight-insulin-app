import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Meal } from "../types/Meal";
import JournalEntryCard from "./JournalEntryCard";

const syntheticMeal = (overrides: Partial<Meal> = {}): Meal => ({
	id: "synthetic-journal-meal",
	image: null,
	name: "Synthetic oats bowl",
	timestamp: new Date(2026, 6, 19, 7, 15).getTime(),
	items: [],
	acute_score: 189,
	estimate_quality: "high",
	...overrides,
});

describe("JournalEntryCard", () => {
	it("uses an existing local photo without changing its source", () => {
		const image = "data:image/png;base64,synthetic-photo";
		const { container } = render(<JournalEntryCard meal={syntheticMeal({ image })} />);

		expect(container.querySelector("img.journal-entry-image")).toHaveAttribute("src", image);
		expect(container.querySelector(".typographic-plate")).toBeNull();
	});

	it("uses the deterministic TypographicPlate when no photo is available", () => {
		const { container } = render(<JournalEntryCard meal={syntheticMeal({ name: "Egg toast breakfast" })} />);

		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector(".typographic-plate-monogram")).toHaveTextContent("Et");
	});

	it("keeps the saved-meal route read-only", () => {
		const { container } = render(<JournalEntryCard meal={syntheticMeal({ id: "saved/id" })} />);

		expect(container.querySelector("ion-item")).toHaveAttribute("router-link", "/meals/saved/saved%2Fid");
	});

	it("derives its accessible representation from the meal name, estimate, and data quality", () => {
		const { container } = render(<JournalEntryCard meal={syntheticMeal()} />);
		const card = container.querySelector("ion-item");

		expect(card).not.toHaveAttribute("aria-label");
		expect(card).toHaveAccessibleName(/Synthetic oats bowl.*estimate 189.*Data quality: High/i);
		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector(".typographic-plate")).toHaveAttribute("aria-hidden", "true");
	});

	it("renders long 320 px evidence in full instead of truncating critical text", () => {
		const longName = "Homemade mutton keema biryani with extra-long basmati rice and cucumber raita";
		render(<JournalEntryCard meal={syntheticMeal({ name: longName, acute_score: 1580, estimate_quality: "low" })} />);

		expect(screen.getByText(longName)).toHaveTextContent(longName);
		expect(screen.getByText(/estimate 1580/)).toHaveTextContent("Data quality: Low");
	});
});
