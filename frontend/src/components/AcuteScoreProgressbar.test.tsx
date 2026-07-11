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
		[42, "42"],
		[100, "100"],
		[300, "300"],
		[undefined, "--"],
	])("shows %s as %s with the exact accessible label", (score, expectedText) => {
		render(<AcuteScoreProgressbar meal={syntheticMeal(score)} />);

		const wrapper = screen.getByRole("img", { name: getAcuteScoreAriaLabel(score) });
		expect(wrapper).toHaveTextContent(expectedText);
		if (score === 300) {
			expect(wrapper).not.toHaveTextContent(/^100$/);
		}
	});
});
