import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom cannot run Ionic overlay enter animations (same reason the PreviewMeal
// tests stub IonToast). The confirm alert is captured through a mocked
// useIonAlert so the destructive handler can be invoked deterministically.
const { presentAlertMock } = vi.hoisted(() => ({ presentAlertMock: vi.fn() }));

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return {
		...actual,
		IonToast: () => null,
		IonLoading: () => null,
		useIonAlert: () => [presentAlertMock, vi.fn()] as const,
	};
});

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { Unit } from "../../types/MealItem";
import { DRAFT_MEAL_STATUS, ITEM_LIST_EDIT_HELPER, SAVED_MEAL_STATUS } from "../../utils/mealDraftUx";
import { ACUTE_SCORE_SCALE_EXPLAINER } from "../../utils/acuteScoreDisplay";
import { APP_DISCLAIMER, MEAL_SCORE_DISCLAIMER, ROUGH_ESTIMATE_NOTICE, UNKNOWN_ITEMS_NOTICE } from "../../utils/safetyCopy";
import { CALORIE_BAR_NOTE } from "../../components/EvidenceRows";

// Read-only saved-meal detail view (issue #89): opening a saved meal from
// Dashboard Recents must show the canonical saved record — real acute_score,
// estimate_quality, drivers, and per-item explanations — with no editing or
// duplicate-save controls, while deletion keeps its backend-first integrity.
//
// Annotated Journal J5 (issue #120) rebuilt the presentation as a Porcelain
// Journal page. The behavioural assertions below are unchanged; the
// presentational ones follow the new chassis, and four intentional
// presentation changes are pinned explicitly:
//   1. an insufficient-data result shows its nominal reading, de-emphasised,
//      when a finite score exists (constitution §6.9);
//   2. the two sealed disclaimers live in one closed-by-default footnote
//      disclosure instead of an always-open card;
//   3. the rough-estimate notice renders once per meal, not once per item;
//   4. the delete control reads "Delete" with the accessible name
//      "Delete saved meal".
//
// Synthetic demo-shaped data only. No real user or health data.

const savedMeal = (overrides: Partial<Meal> = {}): Meal => ({
	id: "saved-meal-1",
	image: null,
	name: "Synthetic Demo Bowl",
	timestamp: Date.parse("2026-07-01T12:00:00Z"),
	backend_created_at: "2026-07-01T12:00:00Z",
	acute_score: 360,
	insulin_load_total: 900,
	kcal_total: 700,
	carbs_total: 90,
	protein_total: 25,
	fat_total: 20,
	estimate_quality: "high",
	main_insulin_drivers: ["steamed rice", "sweet sauce"],
	items: [
		{
			id: "item-1",
			name: "Steamed rice",
			servingSize: 1,
			servingUnit: Unit.Servings,
			amount: 2,
			kcalPerServing: 200,
			carbPerServing_g: 45,
			satFatPerServing_g: 0.2,
			gi: 60,
			fii: 62,
			source: "exact_fii",
			why: "matched FII table entry",
		},
	],
	...overrides,
});

const stubBackend = ({ deleteOk = true }: { deleteOk?: boolean } = {}) => {
	const fetchMock = vi.fn(async (input: unknown, init?: { method?: string }) => {
		const url = String(input);
		if (init?.method === "DELETE") {
			if (!deleteOk) return { ok: false, status: 500, json: async () => ({ detail: "backend delete failed" }) };
			return { ok: true, status: 200, json: async () => ({}) };
		}
		if (url.includes("/metrics/chronic")) {
			return { ok: true, json: async () => ({ days: 30, series: [], current_rolling_7d_dii: 0.4 }) };
		}
		if (url.includes("/meals")) {
			// Empty backend list: hydration keeps locally seeded meals untouched.
			return { ok: true, json: async () => [] };
		}
		return { ok: false, json: async () => ({}) };
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
};

const renderSavedMealDetail = (mealId = "saved-meal-1") => {
	window.history.pushState({}, "", `/meals/saved/${encodeURIComponent(mealId)}`);
	return render(<App />);
};

// Testing Library's ByLabelText queries are unreliable against Ionic custom
// elements, so the delete control is located structurally instead.
const findDeleteButton = (baseElement: Element): HTMLElement | null => baseElement.querySelector(".result-delete-button");

// Ionic keeps aria-label on the ion-button host until the component
// initialises, then moves it onto the native button inside the shadow root
// (which is the element assistive technology actually reads). Checking both
// locations keeps the assertion true regardless of initialisation timing.
const getAccessibleName = (element: Element): string | null =>
	element.getAttribute("aria-label") ?? element.shadowRoot?.querySelector("button")?.getAttribute("aria-label") ?? null;

describe("SavedMealDetail read-only view (issue #89)", () => {
	beforeEach(() => {
		localStorage.clear();
		presentAlertMock.mockReset();
		usePersistentMealStore.setState({ meals: [savedMeal()] });
		useCurrentMealStore.getState().resetMeal();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows the canonical saved state: status, real score, quality, drivers, and item explanations", async () => {
		stubBackend();
		renderSavedMealDetail();

		expect(await screen.findByText(SAVED_MEAL_STATUS)).toBeTruthy();
		expect(screen.queryByText(DRAFT_MEAL_STATUS)).toBeNull();

		// Canonical score with above-reference semantics intact, not the
		// "Hard to estimate" fallback the draft conversion used to force.
		// Issue #93: scored meals use the single neutral presentation.
		expect(screen.getByText("Relative insulin-demand score")).toBeTruthy();
		expect(screen.queryByText("Hard to estimate from this meal")).toBeNull();
		expect(screen.getByText("Score: 360 · above internal reference (100)")).toBeTruthy();
		expect(screen.getByText(ACUTE_SCORE_SCALE_EXPLAINER)).toBeTruthy();

		expect(screen.getByText("Data quality: High.")).toBeTruthy();
		expect(screen.getByText("steamed rice")).toBeTruthy();
		expect(screen.getByText("sweet sauce")).toBeTruthy();
		expect(screen.getByText("matched FII table entry")).toBeTruthy();
		expect(screen.getByText("Source: Direct FII match")).toBeTruthy();
	});

	it("keeps both sealed disclaimers verbatim in the closed footnote disclosure", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		const footnotes = baseElement.querySelector("details.result-footnotes");
		expect(footnotes).toBeTruthy();
		expect(footnotes).not.toHaveAttribute("open");
		expect(footnotes?.querySelector("summary")?.textContent).toBe("What this doesn't mean");
		expect(footnotes).toContainElement(screen.getByText(MEAL_SCORE_DISCLAIMER));
		expect(footnotes).toContainElement(screen.getByText(APP_DISCLAIMER));
	});

	it("renders the sealed page anatomy in the approved reading order", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		const sheet = baseElement.querySelector("main.result-sheet");
		expect(sheet).toBeTruthy();
		const anatomy = Array.from(sheet!.children).map((node) => `${node.tagName.toLowerCase()}.${node.className.toString().split(" ")[0]}`);
		expect(anatomy).toEqual([
			"span.meal-status-pill",
			"h1.result-meal-name",
			"p.result-meal-meta",
			"p.result-meal-meta",
			"h2.result-verdict",
			"p.result-verdict-support",
			"p.result-quality",
			"div.result-score",
			"section.result-evidence",
			"details.result-footnotes",
			"details.result-advanced",
		]);

		// The hero sits inside the scrolling content; the dock does not.
		expect(baseElement.querySelector(".result-page header.result-hero")).toBeTruthy();
		expect(baseElement.querySelector("ion-footer.result-dock")).toBeTruthy();
	});

	it("anchors the dock outside the scrolling content so it cannot scroll away", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		const content = baseElement.querySelector("ion-content.result-page");
		const dock = baseElement.querySelector("ion-footer.result-dock");
		expect(content).toBeTruthy();
		expect(dock).toBeTruthy();

		// The defect this guards: a dock rendered inside ion-content depends on
		// Ionic's fixed slot plus absolute positioning, which stopped holding on
		// the Samsung SM-M356B once the result grew tall. As a footer sibling the
		// dock is laid out by ion-page's flex column instead, so tall content
		// cannot scroll over it or push it out of view.
		expect(content!.contains(dock!)).toBe(false);
		expect(dock!.getAttribute("slot")).toBeNull();
		expect(dock!.parentElement).toBe(content!.parentElement);
		// The dock follows the content in DOM order, so it renders beneath it.
		expect(content!.compareDocumentPosition(dock!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

		// JSDOM has no layout engine, so it cannot prove painted anchoring —
		// that belongs to the Cypress dock-persistence spec and device QA. What
		// is provable here is the DOM placement the anchoring depends on.
		expect(dock!.querySelector(".result-delete-button")).toBeTruthy();
	});

	it("keeps a single heading hierarchy with the meal name as the page heading", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		expect(baseElement.querySelector("h1.result-meal-name")?.textContent).toBe("Synthetic Demo Bowl");
		expect(baseElement.querySelector("h2.result-verdict")?.textContent).toBe("Relative insulin-demand score");
		expect(baseElement.querySelector(".result-evidence h3")?.textContent).toBe("What drove it");
	});

	it("shows the meal composition and the logged moment as demoted metadata", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		const meta = Array.from(baseElement.querySelectorAll("p.result-meal-meta")).map((node) => node.textContent);
		expect(meta[0]).toBe("1 item · ≈ 700 kcal · 90 g carbs");
		expect(meta[1]?.startsWith("Logged ")).toBe(true);
		expect(meta[1]).toMatch(/\b2026\b/);
	});

	it("renders the typographic plate when the saved meal has no photo", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		expect(baseElement.querySelector(".result-hero-plate")).toBeTruthy();
		expect(screen.queryByAltText("Saved meal photo")).toBeNull();
		expect(baseElement.querySelector(".typographic-plate-monogram")?.textContent).toBe("Sd");
	});

	it("renders the stored photo in the hero when the saved meal has one", async () => {
		stubBackend();
		const syntheticImage = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
		usePersistentMealStore.setState({ meals: [savedMeal({ image: syntheticImage })] });
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		expect(screen.getByAltText("Saved meal photo")).toBeTruthy();
		expect(baseElement.querySelector(".result-hero-photo")).toBeTruthy();
	});

	it("shows no circular score meter, gauge, or ring on the saved result", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		expect(baseElement.querySelector(".result-page [role='img'][aria-label*='score']")).toBeNull();
		expect(baseElement.querySelector(".result-page svg")).toBeNull();
		expect(baseElement.querySelector(".result-page .CircularProgressbar")).toBeNull();
	});

	it("offers no editing or save controls and never touches the current-meal draft store", async () => {
		stubBackend();
		renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		expect(screen.queryAllByRole("textbox")).toHaveLength(0);
		expect(screen.queryByLabelText("Save meal")).toBeNull();
		expect(screen.queryByLabelText("Add meal item")).toBeNull();
		expect(screen.queryByText(ITEM_LIST_EDIT_HELPER)).toBeNull();
		expect(screen.queryByText("Edit")).toBeNull();
		expect(screen.queryByText("Recalculate")).toBeNull();
		expect(screen.queryByText("Save to History")).toBeNull();

		// Viewing a saved meal must not build a draft (the old Recents bug).
		const currentMeal = useCurrentMealStore.getState().meal;
		expect(currentMeal.name).toBe("New Meal");
		expect(currentMeal.source_meal_id).toBeUndefined();
		expect(currentMeal.items).toHaveLength(0);
	});

	it("keeps the 'Hard to estimate' presentation and de-emphasises the nominal reading for low-quality saved meals", async () => {
		stubBackend();
		usePersistentMealStore.setState({ meals: [savedMeal({ estimate_quality: "low" })] });
		const { baseElement } = renderSavedMealDetail();

		expect(await screen.findByText("Hard to estimate from this meal")).toBeTruthy();
		expect(screen.getByText("Data quality: Low.")).toBeTruthy();
		expect(baseElement.querySelector(".result-quality")?.textContent).toContain("Data quality: Low. Uses rough fallback");
		expect(baseElement.querySelector(".result-quality")?.textContent).not.toContain("LowUses");

		// Declared J5 change: the reading is shown, but inside the quieter
		// "What we could read" note and never as the page's primary score block.
		const note = baseElement.querySelector(".result-nominal-note");
		expect(note).toBeTruthy();
		expect(note?.querySelector("h3")?.textContent).toBe("What we could read");
		expect(note).toContainElement(screen.getByText("Score: 360 · above internal reference (100)"));
		expect(baseElement.querySelector(".result-score")).toBeNull();
	});

	it("suppresses the reading entirely when an insufficient-data meal has no finite score", async () => {
		stubBackend();
		usePersistentMealStore.setState({ meals: [savedMeal({ estimate_quality: "low", acute_score: undefined })] });
		const { baseElement } = renderSavedMealDetail();

		expect(await screen.findByText("Hard to estimate from this meal")).toBeTruthy();
		expect(baseElement.querySelector(".result-nominal-note")).toBeNull();
		expect(baseElement.querySelector(".result-score")).toBeNull();
		expect(screen.queryByText(/^Score: /)).toBeNull();
		expect(screen.queryByText(ACUTE_SCORE_SCALE_EXPLAINER)).toBeNull();
		// Evidence stays visible; it is quietened, not hidden.
		expect(baseElement.querySelector(".result-evidence-muted")).toBeTruthy();
		expect(baseElement.querySelector(".result-evidence-name")?.textContent).toBe("Steamed rice");
	});

	it("renders evidence rows from stored values with no percentage and no load language", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		const evidence = baseElement.querySelector(".result-evidence") as HTMLElement;
		expect(evidence).toBeTruthy();
		// 200 kcal per serving * 2 servings.
		expect(evidence.querySelector(".result-evidence-kcal")?.textContent).toBe("≈ 400 kcal");
		expect(evidence.textContent).not.toContain("%");
		expect(evidence.textContent?.toLowerCase()).not.toContain("share of load");
		expect(evidence.textContent?.toLowerCase()).not.toContain("insulin load");
		expect(screen.getByText(CALORIE_BAR_NOTE)).toBeTruthy();
		evidence.querySelectorAll(".result-evidence-bar").forEach((bar) => expect(bar.getAttribute("aria-hidden")).toBe("true"));
	});

	it("reads driver-matched items first and keeps drivers that match no item", async () => {
		stubBackend();
		const twoItemMeal = savedMeal({
			items: [
				{ ...savedMeal().items[0], id: "item-salad", name: "Side salad" },
				{ ...savedMeal().items[0], id: "item-rice", name: "Steamed rice" },
			],
			main_insulin_drivers: ["steamed rice", "sweet sauce"],
		});
		usePersistentMealStore.setState({ meals: [twoItemMeal] });
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		const names = Array.from(baseElement.querySelectorAll(".result-evidence-name")).map((node) => node.textContent);
		expect(names).toEqual(["Steamed rice", "Side salad"]);
		// "sweet sauce" names no stored item but the backend still reported it.
		expect(screen.getByText("sweet sauce")).toBeTruthy();
	});

	it("omits bars for a saved meal whose items carry no calories", async () => {
		stubBackend();
		const zeroCalorieMeal = savedMeal({ items: [{ ...savedMeal().items[0], kcalPerServing: 0 }] });
		usePersistentMealStore.setState({ meals: [zeroCalorieMeal] });
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		expect(baseElement.querySelectorAll(".result-evidence-bar")).toHaveLength(0);
		expect(screen.queryByText(CALORIE_BAR_NOTE)).toBeNull();
		// The row itself still reports the item honestly.
		expect(baseElement.querySelector(".result-evidence-name")?.textContent).toBe("Steamed rice");
		expect(baseElement.querySelector(".result-evidence-kcal")?.textContent).toBe("≈ 0 kcal");
	});

	it("renders repeated result explanations without duplicate React keys", async () => {
		stubBackend();
		const repeatedDriver = "Used a direct Food Insulin Index match and scaled it by eaten energy.";
		const baseMeal = savedMeal();
		const repeatedItems = ["item-1", "item-2", "item-3"].map((id) => ({ ...baseMeal.items[0], id, why: repeatedDriver }));
		usePersistentMealStore.setState({ meals: [savedMeal({ items: repeatedItems, main_insulin_drivers: [repeatedDriver, repeatedDriver, repeatedDriver] })] });
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

		renderSavedMealDetail();

		// Three driver entries plus one why-line per item.
		expect(await screen.findAllByText(repeatedDriver)).toHaveLength(6);
		expect(consoleErrorSpy.mock.calls.some((call) => String(call[0]).includes("same key"))).toBe(false);
		consoleErrorSpy.mockRestore();
	});

	it("requires confirmation, then deletes backend-first and removes the meal locally", async () => {
		const fetchMock = stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		fireEvent.click(findDeleteButton(baseElement)!);

		expect(presentAlertMock).toHaveBeenCalledTimes(1);
		const alertOptions = presentAlertMock.mock.calls[0][0] as { header: string; buttons: Array<{ role?: string; handler?: () => void }> };
		expect(alertOptions.header).toBe("Delete saved meal?");

		const destructiveButton = alertOptions.buttons.find((button) => button.role === "destructive");
		expect(destructiveButton?.handler).toBeTruthy();
		destructiveButton!.handler!();

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/meals\/saved-meal-1$/), expect.objectContaining({ method: "DELETE" }));
		});
		await waitFor(() => {
			expect(usePersistentMealStore.getState().meals).toHaveLength(0);
		});
	});

	it("keeps the meal when the backend deletion fails", async () => {
		const fetchMock = stubBackend({ deleteOk: false });
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		fireEvent.click(findDeleteButton(baseElement)!);
		const alertOptions = presentAlertMock.mock.calls[0][0] as { buttons: Array<{ role?: string; handler?: () => void }> };
		alertOptions.buttons.find((button) => button.role === "destructive")!.handler!();

		// Wait until the backend DELETE actually ran, then confirm nothing was
		// removed locally — the UI must never pretend a failed delete succeeded.
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/meals\/saved-meal-1$/), expect.objectContaining({ method: "DELETE" }));
		});
		expect(usePersistentMealStore.getState().meals).toHaveLength(1);
		expect(usePersistentMealStore.getState().meals[0].id).toBe("saved-meal-1");
	});

	it("shows the delete control with a short label and an explicit accessible name", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		const deleteButton = findDeleteButton(baseElement);
		expect(deleteButton).toBeTruthy();
		expect(deleteButton?.textContent).toBe("Delete");
		expect(getAccessibleName(deleteButton!)).toBe("Delete saved meal");
		expect(screen.queryByText("Delete Saved Meal")).toBeNull();
	});

	it("shows a safe not-found state for an unknown meal id", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail("no-such-meal");

		expect(await screen.findByText("Meal Not Found")).toBeTruthy();
		expect(screen.queryByText(SAVED_MEAL_STATUS)).toBeNull();
		expect(findDeleteButton(baseElement)).toBeNull();
	});

	it("surfaces the rough-estimate notice exactly once, however many items are rough", async () => {
		stubBackend();
		const roughMeal = savedMeal({
			items: ["item-1", "item-2"].map((id) => ({ ...savedMeal().items[0], id, source: "macro_fallback", fii: undefined })),
		});
		usePersistentMealStore.setState({ meals: [roughMeal] });
		renderSavedMealDetail();

		expect(await screen.findByText(SAVED_MEAL_STATUS)).toBeTruthy();
		// getByText throws when the sealed notice is stacked more than once.
		expect(screen.getByText(ROUGH_ESTIMATE_NOTICE)).toBeTruthy();
		expect(screen.getAllByText("Source: Macro-based rough estimate")).toHaveLength(2);
	});

	it("keeps the unknown-items notice visible outside any disclosure", async () => {
		stubBackend();
		const unknownMeal = savedMeal({ items: [{ ...savedMeal().items[0], source: "unknown", fii: undefined }] });
		usePersistentMealStore.setState({ meals: [unknownMeal] });
		const { baseElement } = renderSavedMealDetail();

		const notice = await screen.findByText(UNKNOWN_ITEMS_NOTICE);
		expect(notice).toBeTruthy();
		expect(baseElement.querySelector("details")?.contains(notice)).toBe(false);
	});

	it("routes Check another meal to the Log Meal chooser", async () => {
		stubBackend();
		renderSavedMealDetail();

		fireEvent.click(await screen.findByText("Check another meal"));

		await waitFor(() => expect(window.location.pathname).toBe("/log-meal"));
		expect(await screen.findByText("How would you like to add it?")).toBeTruthy();
	});

	it("routes Done Home", async () => {
		stubBackend();
		renderSavedMealDetail();

		fireEvent.click(await screen.findByText("Done"));

		await waitFor(() => expect(window.location.pathname).toBe("/dashboard"));
		expect((await screen.findAllByText("Home")).length).toBeGreaterThan(0);
	});

	it("keeps advanced evidence closed by default without nesting cards", async () => {
		stubBackend();
		const { baseElement } = renderSavedMealDetail();
		await screen.findByText(SAVED_MEAL_STATUS);

		const disclosure = baseElement.querySelector(".result-advanced");
		expect(disclosure).toBeTruthy();
		expect(disclosure).not.toHaveAttribute("open");
		expect(disclosure).toContainElement(screen.getByText("Source: Direct FII match"));
		expect(disclosure?.querySelector("ion-card")).toBeNull();
		expect(baseElement.querySelector(".result-sheet ion-card")).toBeNull();
	});
});
