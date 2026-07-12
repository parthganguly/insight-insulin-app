import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Meal } from "../types/Meal";
import { getAcuteScoreAriaLabel } from "../utils/acuteScoreDisplay";
import AcuteScoreProgressbar from "./AcuteScoreProgressbar";

const syntheticMeal = (acuteScore?: number): Meal => ({
	id: "synthetic-meal",
	image: null,
	name: "Synthetic meal",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	items: [],
	acute_score: acuteScore,
});

describe("AcuteScoreProgressbar", () => {
	it.each([
		[0, "0"],
		[42, "42"],
		[100, "100"],
		[101, "101"],
		[189, "189"],
		[300, "300"],
		[500, "500"],
		[1580, "1580"],
		[undefined, "--"],
	])("shows %s as %s with the exact accessible label", (score, expectedText) => {
		render(<AcuteScoreProgressbar meal={syntheticMeal(score)} />);

		const wrapper = screen.getByRole("img", { name: getAcuteScoreAriaLabel(score) });
		expect(wrapper).toHaveTextContent(expectedText);
		if (score !== undefined && score > 100) {
			expect(wrapper).not.toHaveTextContent(/^100$/);
		}
	});

	it("uses one neutral ring colour for every known score — no retired 35/60 tier colours (issue #93)", () => {
		for (const score of [10, 34, 35, 59, 60, 100, 500]) {
			const { container, unmount } = render(<AcuteScoreProgressbar meal={syntheticMeal(score)} />);
			const html = container.innerHTML;
			for (const retired of ["#34a06f", "#d9a62e", "#d96a52", "#2ecc71", "#f1c40f", "#e74c3c"]) {
				expect(html).not.toContain(retired);
			}
			unmount();
		}
	});
});
