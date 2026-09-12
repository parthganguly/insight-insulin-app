import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Settings from "./Settings";

describe("Settings heading", () => {
	it("exposes the existing Ionic title as the single level-1 heading", async () => {
		render(<Settings />);

		const headings = await screen.findAllByRole("heading", { level: 1, name: "Settings" });
		expect(headings).toHaveLength(1);
		expect(headings[0].tagName).toBe("ION-TITLE");
	});
});
