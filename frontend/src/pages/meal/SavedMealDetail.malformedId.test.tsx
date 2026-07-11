import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Malformed-deep-link guard (issue #89 self-review finding): an undecodable
// meal id must fall through to the not-found state instead of throwing during
// render. The router's own history layer already rejects undecodable
// pathnames app-wide, so this guard is defense-in-depth and can only be
// exercised by mocking useParams — which is why this test lives in its own
// file (vi.mock is file-wide).
vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router-dom")>();
	return {
		...actual,
		// Raw "%" is not valid percent-encoding; decodeURIComponent throws on it.
		useParams: () => ({ mealId: "%" }),
	};
});

import SavedMealDetail from "./SavedMealDetail";
import { usePersistentMealStore } from "../../stores/persistentMealStore";

describe("SavedMealDetail malformed meal id (issue #89)", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ ok: true, json: async () => [] })),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the safe not-found state instead of crashing", async () => {
		render(
			<MemoryRouter>
				<SavedMealDetail />
			</MemoryRouter>,
		);

		expect(await screen.findByText("Meal Not Found")).toBeTruthy();
	});
});
