import { describe, expect, it } from "vitest";

import { mapDraftMealItemToCreatePayload, normalizeAiExtractedItem } from "./api";

const aiItem = {
	name: "plain yogurt",
	quantity: 1,
	unit: "serving",
	kcalPerUnit: 180,
	carb_g: 16,
	protein_g: 8,
	fat_g: 4,
	satFat_g: 2,
	gi: 35,
};

describe("AI FII trust boundary", () => {
	it("keeps missing AI FII absent instead of defaulting it to zero", () => {
		const normalized = normalizeAiExtractedItem(aiItem);

		expect(normalized).not.toHaveProperty("fii");
		expect(mapDraftMealItemToCreatePayload(normalized)).not.toHaveProperty("fii");
	});

	it("discards legacy AI-guessed FII values", () => {
		const normalized = normalizeAiExtractedItem({ ...aiItem, fii: 87 });

		expect(normalized).not.toHaveProperty("fii");
		expect(mapDraftMealItemToCreatePayload(normalized)).not.toHaveProperty("fii");
	});

	it("sends FII after an explicit user edit adds the field", () => {
		const normalized = normalizeAiExtractedItem(aiItem);
		const userEdited = { ...normalized, fii: 50 };

		expect(mapDraftMealItemToCreatePayload(userEdited)).toMatchObject({ fii: 50 });
	});
});
