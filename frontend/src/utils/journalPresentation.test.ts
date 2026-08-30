import { describe, expect, it } from "vitest";
import { Meal } from "../types/Meal";
import { MealItem, Unit } from "../types/MealItem";
import {
	getHomeFolioLine,
	getJournalDayLabel,
	getJournalEntryMetaLine,
	getPreviousMealMetaLine,
	getTypographicPlateMonogram,
	groupJournalMealsByDay,
} from "./journalPresentation";

const meal = (id: string, timestamp: number, overrides: Partial<Meal> = {}): Meal => ({
	id,
	image: null,
	name: `Synthetic meal ${id}`,
	timestamp,
	items: [],
	acute_score: 189,
	estimate_quality: "high",
	...overrides,
});

const item = (kcalPerServing: number, amount: number): MealItem => ({
	id: `synthetic-${kcalPerServing}-${amount}`,
	name: "Synthetic item",
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount,
	kcalPerServing,
	carbPerServing_g: 0,
	satFatPerServing_g: 0,
	gi: 0,
});

describe("journal presentation helpers", () => {
	it.each([
		[4, "Friday night"],
		[9, "Friday morning"],
		[12, "Friday noon"],
		[15, "Friday afternoon"],
		[20, "Friday evening"],
	])("formats the Home folio at hour %s", (hour, expected) => {
		expect(getHomeFolioLine(new Date(2026, 6, 17, hour))).toBe(expected);
	});

	it("labels today, yesterday and older dates without changing meal order", () => {
		const now = new Date(2026, 6, 19, 12);
		const today = meal("today", new Date(2026, 6, 19, 8).getTime());
		const yesterday = meal("yesterday", new Date(2026, 6, 18, 18).getTime());
		const older = meal("older", new Date(2026, 6, 16, 13).getTime());

		expect(getJournalDayLabel(today.timestamp, now)).toBe("Today");
		expect(getJournalDayLabel(yesterday.timestamp, now)).toBe("Yesterday");
		expect(getJournalDayLabel(older.timestamp, now)).toContain("July 16");
		expect(groupJournalMealsByDay([today, yesterday, older], now).flatMap((group) => group.meals.map(({ id }) => id))).toEqual([
			"today",
			"yesterday",
			"older",
		]);
	});

	it("builds the journal meta line from the existing score and quality helpers", () => {
		const line = getJournalEntryMetaLine(meal("meta", new Date(2026, 6, 19, 13, 15).getTime()));
		expect(line.toLocaleLowerCase()).toContain("1:15 pm");
		expect(line).toContain("estimate 189");
		expect(line).toContain("Data quality: High");
	});

	it("omits score and overall-sounding quality for an insufficient-data meal", () => {
		const line = getJournalEntryMetaLine(
			meal("insufficient", new Date(2026, 6, 19, 13, 15).getTime(), {
				acute_score: 0,
				estimate_quality: "high",
				estimate_status: "insufficient_data",
			}),
		);

		expect(line.toLocaleLowerCase()).toContain("1:15 pm");
		expect(line).not.toContain("estimate 0");
		expect(line).not.toContain("Data quality: High");
	});

	it("continues to show the estimate for an ordinary estimated meal", () => {
		const line = getJournalEntryMetaLine(
			meal("estimated", new Date(2026, 6, 19, 13, 15).getTime(), {
				estimate_status: "estimated",
			}),
		);

		expect(line).toContain("estimate 189");
	});

	// The previous-meal picker caption (issue #123). It must stay independent of
	// the saved score and quality: reuse produces a draft that is re-scored only
	// after review, so the old estimate may not travel into the selection step.
	it("builds the picker meta line from the meal's own time and calories", () => {
		const line = getPreviousMealMetaLine(
			meal("picker", new Date(2026, 6, 19, 8, 15).getTime(), { items: [item(200, 2), item(76, 1)] }),
		);

		expect(line.toLocaleLowerCase()).toContain("8:15 am");
		expect(line).toContain(" · 476 kcal");
	});

	it("falls back to the sealed time wording when the timestamp is unusable", () => {
		const line = getPreviousMealMetaLine(meal("broken", Number.NaN, { items: [item(100, 1)] }));

		expect(line).toBe("Time unavailable · 100 kcal");
	});

	it.each([
		[[item(120.4, 1)], "120 kcal"],
		[[item(120.6, 1)], "121 kcal"],
		[[], "0 kcal"],
		[[item(1250, 3)], "3750 kcal"],
	])("rounds the picker calorie figure for %#", (items, expected) => {
		expect(getPreviousMealMetaLine(meal("rounding", new Date(2026, 6, 19, 8, 15).getTime(), { items }))).toContain(expected);
	});

	it("renders the same picker meta line whether or not a score and quality exist", () => {
		const timestamp = new Date(2026, 6, 19, 8, 15).getTime();
		const items = [item(200, 2)];
		const scored = meal("scored", timestamp, { items });
		const unscored = meal("unscored", timestamp, { items, acute_score: undefined, estimate_quality: undefined });

		expect(getPreviousMealMetaLine(unscored)).toBe(getPreviousMealMetaLine(scored));
		expect(getPreviousMealMetaLine(scored)).not.toContain("estimate");
		expect(getPreviousMealMetaLine(scored)).not.toContain("Data quality");
	});

	it.each([
		["Egg and toast breakfast", "Et"],
		["  yogurt   potato salad ", "Yp"],
		["Oats", "O"],
		["", "?"],
	])("creates a deterministic typographic monogram for %j", (name, expected) => {
		expect(getTypographicPlateMonogram(name)).toBe(expected);
	});
});
