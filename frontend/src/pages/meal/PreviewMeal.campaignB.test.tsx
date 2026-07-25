import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return {
		...actual,
		IonModal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => isOpen ? <div data-testid='item-editor'>{children}</div> : null,
		IonToast: () => null,
		IonLoading: () => null,
	};
});

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { MealItem, Unit } from "../../types/MealItem";
import { MEAL_NAME_HELPER, REUSE_PROVENANCE_COPY } from "../../utils/mealDraftUx";

const component = (overrides: Partial<MealItem> = {}): MealItem => ({
	id: "component-1",
	name: "chicken biryani",
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount: 1,
	kcalPerServing: 420,
	carbPerServing_g: 58,
	proteinPerServing_g: 24,
	fatPerServing_g: 12,
	satFatPerServing_g: 3,
	gi: 62,
	fii: 79,
	source: "exact_fii",
	why: "Synthetic old-identity evidence",
	draftProvenance: "ai_proposed",
	...overrides,
});

const draft = (itemOverrides: Partial<MealItem> = {}, mealOverrides: Partial<Meal> = {}): Meal => ({
	id: "draft-1",
	image: null,
	name: "Chicken biryani",
	timestamp: Date.parse("2026-07-18T12:00:00Z"),
	isAiDraft: true,
	items: [component(itemOverrides)],
	...mealOverrides,
});

const fireIonInput = (element: Element, value: string) => {
	fireEvent(element, new CustomEvent("ionInput", { bubbles: true, detail: { value } }));
};

const renderDraft = () => {
	window.history.replaceState({}, "", "/meals/new");
	return render(<App />);
};

const openEditor = async () => {
	fireEvent.click(await screen.findByText("Edit details"));
	return screen.findByTestId("item-editor");
};

const getSaveButton = () => screen.getByText("Calculate & save").closest("ion-button")!;

describe("Campaign B consequential correction UI", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
		useCurrentMealStore.setState({ meal: draft() });
		vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the descriptive meal-name helper exactly once and no subtype or quick chips", async () => {
		renderDraft();
		expect(await screen.findAllByText(MEAL_NAME_HELPER)).toHaveLength(1);
		expect(screen.queryByText("Wrong type? Choose the closest name:")).toBeNull();
		expect(screen.queryByText("Keema")).toBeNull();
		expect(screen.queryByText("Paneer")).toBeNull();
	});

	it("shows AI provenance as plain language rather than canonical source or a percentage", async () => {
		renderDraft();
		expect(await screen.findByText("Suggested from your photo")).toBeVisible();
		expect(screen.queryByText(/%/)).toBeNull();
	});

	it("shows the sealed saved-meal reuse provenance copy", async () => {
		useCurrentMealStore.setState({ meal: draft({ draftProvenance: "user_entered", fii: undefined, source: undefined, why: undefined }, { isAiDraft: false, source_meal_id: "saved-1" }) });
		renderDraft();
		expect(await screen.findByText(REUSE_PROVENANCE_COPY)).toBeVisible();
	});

	it("renaming a component retains visible nutrition, hides stale evidence, announces the old name, and disables save", async () => {
		const { baseElement } = renderDraft();
		const editor = await openEditor();
		fireIonInput(editor.querySelector('ion-input[label="Item name"]')!, "vegetable biryani");

		const reviewCopy = await screen.findByText('These values were for "chicken biryani". Check they still fit.');
		expect(reviewCopy).toBeVisible();
		expect(reviewCopy.closest(".needs-review-card")).toHaveAttribute("role", "status");
		expect(screen.getByText("Values under review")).toBeVisible();
		expect(screen.getByText(/420 kcal · 58 g carbs · 24 g protein · 12 g fat/)).toBeVisible();
		expect(baseElement.querySelector('ion-input[label="FII"]')).toHaveProperty("value", "");
		expect(screen.queryByText("Source: Direct FII match")).toBeNull();
		expect(getSaveButton()).toHaveAttribute("aria-disabled", "true");
		expect(screen.getByText(/Review the carried nutrition for/)).toBeVisible();
	});

	it("opening and closing the editor does not resolve an existing review", async () => {
		useCurrentMealStore.setState({ meal: draft({ fii: undefined, source: undefined, why: undefined, needsReview: { previousName: "chicken biryani" } }) });
		renderDraft();
		await openEditor();
		fireEvent.click(screen.getByText("Done").closest("ion-button")!);
		expect(await screen.findByText('These values were for "chicken biryani". Check they still fit.')).toBeVisible();
		expect(getSaveButton()).toHaveAttribute("aria-disabled");
	});

	it("amount-only editing keeps review unresolved", async () => {
		useCurrentMealStore.setState({ meal: draft({ fii: undefined, source: undefined, why: undefined, needsReview: { previousName: "chicken biryani" } }) });
		const { baseElement } = renderDraft();
		fireIonInput(baseElement.querySelector('.portion-adjust-row ion-input[label="Amount"]')!, "2");
		expect(await screen.findByText('These values were for "chicken biryani". Check they still fit.')).toBeVisible();
		expect(getSaveButton()).toHaveAttribute("aria-disabled");
	});

	it("These still fit resolves review while stale evidence remains absent", async () => {
		useCurrentMealStore.setState({ meal: draft({ fii: undefined, source: undefined, why: undefined, needsReview: { previousName: "chicken biryani" } }) });
		renderDraft();
		fireEvent.click(await screen.findByText("These still fit"));
		await waitFor(() => expect(screen.queryByText(/These values were for/)).toBeNull());
		const reviewed = useCurrentMealStore.getState().meal.items[0];
		expect(reviewed.needsReview).toBeUndefined();
		expect(reviewed.fii).toBeUndefined();
		expect(reviewed.source).toBeUndefined();
		expect(reviewed.why).toBeUndefined();
	});

	it("meal-name-only editing creates no warning, while an actual carried nutrition edit resolves a component rename", async () => {
		const { baseElement } = renderDraft();
		fireIonInput(baseElement.querySelector('ion-input[label="Meal name"]')!, "Dinner label only");
		expect(screen.queryByText(/These values were for/)).toBeNull();

		const editor = await openEditor();
		fireIonInput(editor.querySelector('ion-input[label="Item name"]')!, "vegetable biryani");
		expect(await screen.findByText(/These values were for/)).toBeVisible();
		fireIonInput(editor.querySelector('ion-input[label="kcals per serving"]')!, "425");
		await waitFor(() => expect(screen.queryByText(/These values were for/)).toBeNull());
		expect(useCurrentMealStore.getState().meal.items[0].needsReview).toBeUndefined();
	});
});
