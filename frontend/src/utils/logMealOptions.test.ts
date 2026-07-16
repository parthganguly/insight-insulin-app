import { describe, expect, it } from "vitest";

import { LOG_MEAL_OPTIONS } from "./logMealOptions";

describe("LOG_MEAL_OPTIONS", () => {
	it("defines exactly the three approved entry choices in order", () => {
		expect(LOG_MEAL_OPTIONS).toEqual([
			{ id: "photo", title: "Take a photo", description: "Point the camera at your meal." },
			{ id: "manual", title: "Enter manually", description: "Type the meal and its parts yourself." },
			{ id: "previous", title: "Log a previous meal again", description: "Repeat something you've checked before." },
		]);
	});

	it("gives every choice a visible label and one-line description", () => {
		for (const option of LOG_MEAL_OPTIONS) {
			expect(option.title.trim()).not.toBe("");
			expect(option.description.trim()).not.toBe("");
		}
	});
});
