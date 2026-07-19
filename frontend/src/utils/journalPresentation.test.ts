import { describe, expect, it } from "vitest";
import { Meal } from "../types/Meal";
import {
	getHomeFolioLine,
	getJournalDayLabel,
	getJournalEntryMetaLine,
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

	it.each([
		["Egg and toast breakfast", "Et"],
		["  yogurt   potato salad ", "Yp"],
		["Oats", "O"],
		["", "?"],
	])("creates a deterministic typographic monogram for %j", (name, expected) => {
		expect(getTypographicPlateMonogram(name)).toBe(expected);
	});
});
