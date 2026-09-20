import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return {
		...actual,
		useIonRouter: () => ({ push: pushMock, back: vi.fn(), canGoBack: () => false }),
	};
});

import { ReferenceMealEstimate } from "./MealEstimate";
import { syntheticResult } from "../../api/referenceFixtures";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { useMealEstimateStore } from "../../stores/mealEstimateStore";
import { usePendingSaveStore } from "../../stores/pendingSaveStore";
import { REFERENCE_CATALOG_PIN, type ReferenceDraft } from "../../types/experimentalReference";
import { Unit } from "../../types/MealItem";
import {
	buildReferencePreviewRequest,
	createEmptyReferenceItem,
	createReferenceDraft,
} from "../../utils/referenceDraft";

// N1: a legitimate in-flight recalculation or a failed one for the current
// draft keeps the estimate route (with loading/error + disabled Save); only a
// genuine deep-link without estimate state for the draft redirects away.

const reviewedDraft = (): ReferenceDraft => {
	const draft = {
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
			selection: { state: "selected" as const, sourceId: "BAO2011-002", catalogVersion: REFERENCE_CATALOG_PIN },
		}],
	};
	return draft;
};

const seedDraft = (): ReferenceDraft => {
	const draft = reviewedDraft();
	useCurrentMealStore.getState().setMeal(draft);
	return { ...draft, id: useCurrentMealStore.getState().meal.id };
};

const renderEstimate = () => render(
	<MemoryRouter initialEntries={["/meals/estimate"]}>
		<ReferenceMealEstimate />
	</MemoryRouter>,
);

const applyReady = (draftId: string, materialRevision: number, saveRequestId = "11111111-2222-4333-8444-555555555555") => {
	const draft = useCurrentMealStore.getState().meal;
	if (draft.id !== draftId) throw new Error("draft mismatch in test setup");
	const mapped = buildReferencePreviewRequest(draft as ReferenceDraft);
	if (!mapped.ok) throw new Error("test draft should build: " + JSON.stringify(mapped.errors));
	const token = useMealEstimateStore.getState().beginReferencePreview(draftId, materialRevision);
	const applied = useMealEstimateStore.getState().applyReferencePreview(token, {
		draftId,
		materialRevision,
		request: mapped.request,
		result: syntheticResult(),
		saveRequestId,
	});
	expect(applied).toBe(true);
};

beforeEach(() => {
	pushMock.mockClear();
	useMealEstimateStore.getState().clearEstimate();
	useCurrentMealStore.getState().resetMealAs("reference");
	usePendingSaveStore.setState({ intents: {}, journalStatus: "ready", recoveryErrors: [], cleanupRequired: {}, notices: [] });
});

describe("N1 reference estimate route lifecycle", () => {
	it("renders a fresh ready result with Save enabled and no redirect", () => {
		const seeded = seedDraft();
		const revision = useCurrentMealStore.getState().materialRevision;
		applyReady(seeded.id, revision);
		renderEstimate();
		expect(screen.getByRole("heading", { name: "Experimental meal insulin-demand estimate" })).toBeInTheDocument();
		const save = screen.getByLabelText("Save to History") as HTMLIonButtonElement;
		expect(save.disabled).toBe(false);
		expect(pushMock).not.toHaveBeenCalled();
	});

	it("keeps a recalculating session on the route with loading and disabled Save", () => {
		const seeded = seedDraft();
		const revision = useCurrentMealStore.getState().materialRevision;
		useMealEstimateStore.getState().beginReferencePreview(seeded.id, revision);
		renderEstimate();
		expect(screen.getByText("Recalculating your estimate…")).toBeInTheDocument();
		const calculating = screen.getByLabelText("Calculating estimate") as HTMLIonButtonElement;
		expect(calculating.disabled).toBe(true);
		expect(screen.queryByText("Save to History")).toBeNull();
		expect(pushMock).not.toHaveBeenCalled();
	});

	it("keeps a failed recalculation on the route with error copy and retry", () => {
		const seeded = seedDraft();
		const revision = useCurrentMealStore.getState().materialRevision;
		const token = useMealEstimateStore.getState().beginReferencePreview(seeded.id, revision);
		expect(useMealEstimateStore.getState().failReferencePreview(token, "read_error", "reference_unknown_failure")).toBe(true);
		renderEstimate();
		expect(screen.getByText("The reference service didn't answer in a usable way. Your draft is still here — no estimate was calculated.")).toBeInTheDocument();
		const retry = screen.getByLabelText("Calculate again") as HTMLIonButtonElement;
		expect(retry.disabled).toBe(false);
		expect(screen.queryByText("Save to History")).toBeNull();
		expect(pushMock).not.toHaveBeenCalled();
	});

	it("shows a stale ready result as recalculable with Save absent", () => {
		const seeded = seedDraft();
		const revision = useCurrentMealStore.getState().materialRevision;
		applyReady(seeded.id, revision);
		useCurrentMealStore.getState().updateReferenceItem(seeded.items[0].id, "amount", "300");
		renderEstimate();
		expect(screen.getByText("This estimate describes the meal before your changes. Calculate again before saving.")).toBeInTheDocument();
		const retry = screen.getByLabelText("Calculate again") as HTMLIonButtonElement;
		expect(retry.disabled).toBe(false);
		expect(screen.queryByText("Save to History")).toBeNull();
		expect(pushMock).not.toHaveBeenCalled();
	});

	it("redirects a genuine deep-link without estimate state for the draft", () => {
		seedDraft();
		renderEstimate();
		expect(pushMock).toHaveBeenCalledWith("/meals/new", "back", "replace");
		expect(document.querySelector("main.result-sheet")).toBeNull();
	});

	it("redirects loading state that belongs to another draft", () => {
		seedDraft();
		useMealEstimateStore.getState().beginReferencePreview("some-other-draft", 0);
		renderEstimate();
		expect(pushMock).toHaveBeenCalledWith("/meals/new", "back", "replace");
		expect(document.querySelector("main.result-sheet")).toBeNull();
	});
	it("redirects a ready result belonging to another draft instead of leaving a blank route", () => {
		const seeded = seedDraft();
		applyReady(seeded.id, useCurrentMealStore.getState().materialRevision);
		useMealEstimateStore.setState((state) => ({ reference: { ...state.reference, draftId: "some-other-draft" } }));
		renderEstimate();
		expect(pushMock).toHaveBeenCalledWith("/meals/new", "back", "replace");
		expect(document.querySelector("main.result-sheet")).toBeNull();
	});

});
