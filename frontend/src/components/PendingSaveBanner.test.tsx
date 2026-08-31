import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return { ...actual, useIonRouter: () => ({ push: vi.fn() }) };
});

import { useCurrentMealStore } from "../stores/currentMealStore";
import { usePendingSaveStore } from "../stores/pendingSaveStore";
import { Unit } from "../types/MealItem";
import PendingSaveBanner from "./PendingSaveBanner";

describe("B2-2 pending-save banner exits", () => {
	beforeEach(() => {
		usePendingSaveStore.getState().clearAll();
		useCurrentMealStore.setState({
			meal: {
				id: "new-draft",
				image: null,
				name: "Different meal",
				timestamp: 2,
				items: [],
			},
		});
	});

	it("can discard only a rejected request even after another draft becomes current", async () => {
		usePendingSaveStore.getState().insertIntent({
			draftId: "old-draft",
			request: {
				meal_name: "Old breakfast",
				items: [{ name: "oats", quantity: 1, unit: Unit.Servings, kcalPerUnit: 200, carb_g: 30, satFat_g: 1, gi: 55 }],
				client_request_id: "request-old",
			},
			phase: "rejected",
			lastError: "This save request was rejected.",
		});
		usePendingSaveStore.getState().insertIntent({
			draftId: "other-draft",
			request: { meal_name: "Other", items: [], client_request_id: "request-other" },
			phase: "ambiguous",
			lastError: null,
		});

		render(<PendingSaveBanner />);
		fireEvent.click((await screen.findByText("Discard this save attempt")).closest("ion-button")!);

		expect(usePendingSaveStore.getState().intents["request-old"]).toBeUndefined();
		expect(usePendingSaveStore.getState().intents["request-other"]).toBeDefined();
	});
});
