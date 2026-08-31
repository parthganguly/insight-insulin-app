import { describe, expect, it } from "vitest";

const sourceFiles = import.meta.glob("../**/*.{ts,tsx}", { as: "raw", eager: true }) as Record<string, string>;

describe("B2-2 structural boundaries", () => {
	it("contains exactly one real history blocker registration", () => {
		const registration = ["history", ".block("].join("");
		const owners = Object.entries(sourceFiles).filter(([, source]) => source.includes(registration));

		expect(owners.map(([file]) => file)).toEqual(["../components/MealFlowGuard.tsx"]);
		expect(owners[0][1].split(registration)).toHaveLength(2);
	});

	it("keeps preview and estimate routes away from the saved-response mapper", () => {
		const savedMapper = ["mapMealModeling", "ResponseToMeal"].join("");
		for (const file of ["../pages/meal/PreviewMeal.tsx", "../pages/meal/MealEstimate.tsx"]) {
			expect(sourceFiles[file], file).not.toContain(savedMapper);
		}
	});
});
