import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return {
		...actual,
		IonModal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (isOpen ? <div data-testid='item-editor'>{children}</div> : null),
		IonToast: () => null,
		IonLoading: () => null,
	};
});

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { Unit } from "../../types/MealItem";

const aiBiryaniDraft: Meal = {
	id: "synthetic-ai-draft",
	image: null,
	name: "Chicken biryani",
	timestamp: Date.parse("2026-07-15T12:00:00Z"),
	isAiDraft: true,
	calorie_source: "meal_estimate",
	estimate: {
		estimated_calories: 640,
		estimated_carbs_g: 78,
		estimated_fat_g: 18,
		confidence: 0.7,
		serving_type: "plate",
		serving_count: 1,
	},
	items: [
		{
			id: "synthetic-rice-item",
			name: "Basmati rice",
			servingSize: 1,
			servingUnit: Unit.Cups,
			amount: 1.5,
			kcalPerServing: 240,
			carbPerServing_g: 52,
			proteinPerServing_g: 5,
			fatPerServing_g: 1,
			satFatPerServing_g: 0.3,
			gi: 68,
			fii: 79,
			source: "exact_fii",
			why: "synthetic direct table match",
		},
	],
};

const renderPreview = () => {
	window.history.replaceState({}, "", "/meals/new");
	return render(<App />);
};

describe("Campaign A confirmation hierarchy", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
		useCurrentMealStore.setState({ meal: structuredClone(aiBiryaniDraft) });
		vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders subtype choices with the adjacent name-only warning", async () => {
		renderPreview();

		const warning = await screen.findByText(/changes the name only/i);
		const subtypeChoice = warning.closest(".subtype-choice");
		expect(subtypeChoice).toBeTruthy();
		expect(subtypeChoice).toContainElement(screen.getByText("Keema").closest("ion-button"));
		expect(subtypeChoice).toContainElement(screen.getByText("Chicken").closest("ion-button"));
	});

	it("keeps ordinary meal identity, components, and portions visible", async () => {
		const { baseElement } = renderPreview();

		expect(await screen.findByText("What INSIGHT found")).toBeVisible();
		expect(screen.getByText("Basmati rice")).toBeVisible();
		expect(screen.getByText("+").closest("ion-button")).toBeVisible();
		expect(baseElement.querySelector('ion-input[label="Meal name"]')).toBeVisible();
		expect(baseElement.querySelector('ion-input[label="Amount"]')).toBeVisible();
	});

	it("keeps technical evidence in a closed Advanced details disclosure until expansion", async () => {
		const { baseElement } = renderPreview();
		fireEvent.click(await screen.findByText("Edit details"));

		const editor = await screen.findByTestId("item-editor");
		const details = editor.querySelector("details.advanced-details");
		expect(details).toBeTruthy();
		expect(details).not.toHaveAttribute("open");

		const protectedLabels = ["kcals per serving", "Carb per serving (g)", "Saturated Fat per serving (g)", "FII", "Glycemic Index"];
		for (const label of protectedLabels) {
			const field = baseElement.querySelector<HTMLElement>(`ion-input[label="${label}"]`);
			expect(field).toBeTruthy();
			expect(details).toContainElement(field);
		}
		const source = screen.getByText("Source: Direct FII match");
		expect(details).toContainElement(source);

		fireEvent.click(details!.querySelector("summary")!);
		await waitFor(() => expect(details).toHaveAttribute("open"));
		for (const label of protectedLabels) {
			expect(details!.querySelector(`ion-input[label="${label}"]`)).toBeVisible();
		}
		expect(source).toBeVisible();
	});

	it("keeps Done primary and Remove item secondary in the item-editor action order", async () => {
		renderPreview();
		fireEvent.click(await screen.findByText("Edit details"));

		const editor = await screen.findByTestId("item-editor");
		const actions = editor.querySelector(".item-editor-actions");
		expect(actions).toBeTruthy();
		expect(Array.from(actions!.querySelectorAll("ion-button")).map((button) => button.textContent?.trim())).toEqual(["Done", "Remove item"]);
		expect(actions!.querySelectorAll("ion-button")[0]).not.toHaveAttribute("fill", "outline");
		expect(actions!.querySelectorAll("ion-button")[1]).toHaveAttribute("fill", "outline");
	});
});
