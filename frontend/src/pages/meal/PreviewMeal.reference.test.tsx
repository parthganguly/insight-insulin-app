import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement, forwardRef, useImperativeHandle } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const modal = vi.hoisted(() => ({ dismiss: vi.fn(), didDismiss: null as (() => void) | null }));

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	// jsdom does not animate Ionic overlays. Model only the supported dismiss
	// method/event contract; actual native focus is asserted by browser G8.
	const SheetModal = forwardRef(({ isOpen, children, onDidDismiss }: {
		isOpen: boolean;
		children?: React.ReactNode;
		onDidDismiss?: () => void;
	}, ref) => {
		useImperativeHandle(ref, () => ({ dismiss: modal.dismiss }));
		if (!isOpen) return null;
		modal.didDismiss = onDidDismiss ?? null;
		return createElement("ion-modal", null, children);
	});
	return {
		...actual,
		useIonRouter: () => ({ push: pushMock, back: vi.fn(), canGoBack: () => false }),
		IonModal: SheetModal,
	};
});

import { ReferencePreviewMeal } from "./PreviewMeal";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { useMealEstimateStore } from "../../stores/mealEstimateStore";
import { REFERENCE_CATALOG_PIN, type ReferenceDraft } from "../../types/experimentalReference";
import { Unit } from "../../types/MealItem";
import type { CatalogBrowseRecord } from "../../types/experimentalReference";
import { createEmptyReferenceItem, createReferenceDraft } from "../../utils/referenceDraft";

// N2: keep content alive until Ionic finishes dismissal, then reset isOpen.
// G8 covers actual shadow-control focus and sequential keyboard behavior.

const candidate = (id: string): CatalogBrowseRecord => ({
	source_record_id: id,
	source_food_wording: "Rice",
	food_category: "Grain",
	fii_mean: 50,
	fii_sem: 4,
	source_study: "Synthetic study",
	source_doi: "10.synthetic/example",
	reference_scale: "glucose=100",
	actual_test_energy_kJ: 1000,
	eligibility: { use: "experimental_fii_input", status: "candidate", reasons: [] },
});

const reviewedDraft = (): ReferenceDraft => ({
	...createReferenceDraft(),
	name: "Synthetic reference meal",
	reviewedCatalogVersion: REFERENCE_CATALOG_PIN,
	items: [{
		...createEmptyReferenceItem(),
		name: "Reviewed food",
		amount: 150,
		servingUnit: Unit.Grams,
		servingSize: 100,
		kcalPerServing: 200,
		carbPerServing_g: 20,
		basisReviewed: true,
		selection: { state: "selected", sourceId: "BAO2011-002", catalogVersion: REFERENCE_CATALOG_PIN },
	}],
});

const renderDraft = () => render(
	<MemoryRouter initialEntries={["/meals/new"]}>
		<ReferencePreviewMeal />
	</MemoryRouter>,
);

const trigger = () => screen.getByText("Choose a published reference").closest("ion-button") as HTMLElement;

beforeEach(() => {
	pushMock.mockClear();
	modal.dismiss.mockClear();
	modal.didDismiss = null;
	useMealEstimateStore.getState().clearEstimate();
	useMealEstimateStore.setState({
		catalog: { phase: "ready", catalog: { catalog_version: REFERENCE_CATALOG_PIN, records: [candidate("BAO2011-002")] }, errorCode: null },
	});
	const draft = reviewedDraft();
	useCurrentMealStore.getState().setMeal(draft);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("N2 picker dismissal lifecycle", () => {
	it("keeps content mounted until Ionic's did-dismiss event", () => {
		renderDraft();
		fireEvent.click(trigger());
		fireEvent.click(screen.getByLabelText("Close reference picker"));
		expect(modal.dismiss).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText("Search published references")).toBeInTheDocument();
		act(() => modal.didDismiss?.());
		expect(screen.queryByLabelText("Search published references")).not.toBeInTheDocument();
		fireEvent.click(trigger());
		expect(screen.getByLabelText("Search published references")).toBeInTheDocument();
	});

	it("retains the selected source while dismissal completes", () => {
		renderDraft();
		fireEvent.click(trigger());
		fireEvent.click(screen.getByText("Select reference"));
		expect(modal.dismiss).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText("Search published references")).toBeInTheDocument();
		act(() => modal.didDismiss?.());
		expect(screen.queryByLabelText("Search published references")).not.toBeInTheDocument();
		expect((useCurrentMealStore.getState().meal as ReferenceDraft).items[0].selection).toMatchObject({ state: "selected", sourceId: "BAO2011-002" });
	});

	it("queues no application focus callbacks that could outlive navigation", () => {
		vi.useFakeTimers();
		const { unmount } = renderDraft();
		fireEvent.click(trigger());
		fireEvent.click(screen.getByLabelText("Close reference picker"));
		act(() => modal.didDismiss?.());
		unmount();
		const destination = document.createElement("button");
		document.body.append(destination);
		destination.focus();
		vi.runOnlyPendingTimers();
		expect(document.activeElement).toBe(destination);
		destination.remove();
		vi.useRealTimers();
	});
});
