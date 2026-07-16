import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AlertButton = { text: string; handler?: () => void };

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return {
		...actual,
		IonAlert: ({ isOpen, header, message, buttons }: { isOpen: boolean; header: string; message: string; buttons: AlertButton[] }) => isOpen ? (
			<div role='alertdialog' aria-label={header}>
				<p>{message}</p>
				{buttons.map((button) => <button key={button.text} onClick={() => button.handler?.()}>{button.text}</button>)}
			</div>
		) : null,
		IonToast: () => null,
		IonLoading: ({ children }: { children?: ReactNode }) => <>{children}</>,
	};
});

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { Unit } from "../../types/MealItem";

const syntheticDraft = (): Meal => ({
	id: "qa-synthetic-draft",
	image: null,
	name: "QA Synthetic lentil rice bowl",
	timestamp: Date.parse("2026-07-16T08:00:00Z"),
	isAiDraft: false,
	items: [
		{ id: "lentils", name: "lentils", servingSize: 1, servingUnit: Unit.Grams, amount: 150, kcalPerServing: 1, carbPerServing_g: 1, satFatPerServing_g: 0, gi: 0 },
		{ id: "rice", name: "rice", servingSize: 1, servingUnit: Unit.Grams, amount: 180, kcalPerServing: 1, carbPerServing_g: 1, satFatPerServing_g: 0, gi: 0 },
		{ id: "oil", name: "olive oil", servingSize: 1, servingUnit: Unit.Grams, amount: 9, kcalPerServing: 1, carbPerServing_g: 0, satFatPerServing_g: 0, gi: 0 },
	],
});

const makeMeaningfulEdit = () => {
	const meal = useCurrentMealStore.getState().meal;
	act(() => {
		useCurrentMealStore.getState().setMeal({
			...meal,
			items: meal.items.map((item) => item.id === "oil" ? { ...item, amount: 10 } : item),
		});
	});
};

const waitForMeaningfulEditToRender = async () => {
	await waitFor(() => {
		const oilCard = screen.getByText("olive oil").closest("ion-card");
		const amountField = oilCard?.querySelector<HTMLIonInputElement>('ion-input[label="Amount"]');
		expect(amountField?.value).toBe(10);
	});
};

const renderDraft = () => {
	window.history.replaceState({}, "", "/meals/new");
	return render(<App />);
};

describe("dirty confirmation draft navigation", () => {
	beforeEach(() => {
		localStorage.clear();
		usePersistentMealStore.setState({ meals: [] });
		act(() => useCurrentMealStore.setState({ meal: syntheticDraft() }));
		vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("offers an Ionic stay-or-discard decision, and cancel preserves every draft value", async () => {
		renderDraft();
		await screen.findByText("Did we get your meal right?");
		makeMeaningfulEdit();
		await waitForMeaningfulEditToRender();
		const editedDraft = structuredClone(useCurrentMealStore.getState().meal);

		fireEvent.click(screen.getByText("Home").closest("ion-tab-button")!);

		const decision = await screen.findByRole("alertdialog", { name: "Discard this draft?" });
		expect(window.location.pathname).toBe("/meals/new");
		expect(decision).toHaveTextContent("unsaved changes");
		fireEvent.click(screen.getByRole("button", { name: "Stay and continue" }));

		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		expect(window.location.pathname).toBe("/meals/new");
		expect(useCurrentMealStore.getState().meal).toEqual(editedDraft);
		expect(screen.getByText("Did we get your meal right?")).toBeTruthy();
	});

	it("discards the dirty draft only after confirmation and renders the requested route", async () => {
		const { baseElement } = renderDraft();
		await screen.findByText("Did we get your meal right?");
		makeMeaningfulEdit();
		await waitForMeaningfulEditToRender();

		fireEvent.click(screen.getByText("Home").closest("ion-tab-button")!);
		fireEvent.click(await screen.findByRole("button", { name: "Discard and leave" }));

		await waitFor(() => expect(window.location.pathname).toBe("/dashboard"));
		await waitFor(() => expect(baseElement.querySelector("ion-router-outlet > .ion-page:not(.ion-page-hidden) ion-title")?.textContent).toBe("Home"));
		expect(useCurrentMealStore.getState().meal.name).toBe("New Meal");
		expect(useCurrentMealStore.getState().meal.items).toHaveLength(0);
	});

	it("keeps browser Back route and rendered view synchronized after stay and discard", async () => {
		window.history.replaceState({}, "", "/log-meal");
		render(<App />);
		fireEvent.click(await screen.findByLabelText("Enter manually"));
		await waitFor(() => expect(window.location.pathname).toBe("/meals/new"));
		useCurrentMealStore.setState({ meal: syntheticDraft() });
		await screen.findByText("Did we get your meal right?");
		await waitFor(() => expect(screen.getByText("olive oil")).toBeTruthy());
		makeMeaningfulEdit();
		await waitForMeaningfulEditToRender();

		act(() => window.history.back());
		const stayButton = await screen.findByRole("button", { name: "Stay and continue" });
		await waitFor(() => expect(window.location.pathname).toBe("/meals/new"));
		fireEvent.click(stayButton);
		expect(screen.getByText("Did we get your meal right?")).toBeTruthy();

		act(() => window.history.back());
		fireEvent.click(await screen.findByRole("button", { name: "Discard and leave" }));
		await waitFor(() => expect(window.location.pathname).toBe("/log-meal"));
		expect(await screen.findByText("How would you like to add it?")).toBeTruthy();
		expect(useCurrentMealStore.getState().meal.items).toHaveLength(0);
	});

	it("the explicit Discard action clears the draft without showing a second warning", async () => {
		renderDraft();
		await screen.findByText("Did we get your meal right?");
		makeMeaningfulEdit();
		await waitForMeaningfulEditToRender();

		fireEvent.click(screen.getByText("Discard").closest("ion-button")!);

		await waitFor(() => expect(window.location.pathname).toBe("/log-meal"));
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(useCurrentMealStore.getState().meal.items).toHaveLength(0);
	});
});
