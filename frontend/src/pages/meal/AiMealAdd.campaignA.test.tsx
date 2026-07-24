import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lifecycle = vi.hoisted(() => ({
	willEnter: null as null | (() => void),
	didLeave: null as null | (() => void),
}));
const cameraGetPhoto = vi.hoisted(() => vi.fn());

vi.mock("@ionic/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@ionic/react")>();
	return {
		...actual,
		useIonViewWillEnter: (callback: () => void) => {
			lifecycle.willEnter = callback;
		},
		useIonViewDidLeave: (callback: () => void) => {
			lifecycle.didLeave = callback;
		},
	};
});

vi.mock("@capacitor/camera", () => ({
	Camera: { getPhoto: cameraGetPhoto },
	CameraResultType: { Base64: "base64" },
	CameraSource: { Camera: "camera", Photos: "photos" },
}));

import App from "../../App";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { AI_EXTRACTION_UNAVAILABLE_MESSAGE, CAMERA_CANCELLED_MESSAGE } from "../../utils/aiFailureCopy";
import { AI_EXTRACTION_PRIVACY_DISCLOSURE } from "../../utils/safetyCopy";

const SYNTHETIC_IMAGE = "synthetic-image-payload";
const RAW_PROVIDER_DETAIL = "synthetic upstream provider stack detail";

const renderCamera = () => {
	window.history.replaceState({}, "", "/meals/new/ai");
	return render(<App />);
};

const capturePhoto = async () => {
	fireEvent.click(await screen.findByText("Take a photo"));
	await waitFor(() => expect(screen.getByAltText("Captured food 1")).toBeVisible());
};

const failedResponse = () => ({
	ok: false,
	status: 503,
	json: async () => ({ detail: RAW_PROVIDER_DETAIL }),
});

describe("Campaign A Smart Camera", () => {
	beforeEach(() => {
		localStorage.clear();
		lifecycle.willEnter = null;
		lifecycle.didLeave = null;
		cameraGetPhoto.mockReset();
		cameraGetPhoto.mockResolvedValue({ base64String: SYNTHETIC_IMAGE });
		usePersistentMealStore.setState({ meals: [] });
		useCurrentMealStore.getState().resetMeal();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows one labeled Analyze meal action, disabled until a synthetic image exists", async () => {
		renderCamera();

		const analyzeLabels = await screen.findAllByText("Analyze meal");
		expect(analyzeLabels).toHaveLength(1);
		expect(analyzeLabels[0]).toBeVisible();
		const analyzeButton = analyzeLabels[0].closest("ion-button") as HTMLIonButtonElement;
		expect(analyzeButton.disabled).toBe(true);

		await capturePhoto();
		await waitFor(() => expect(analyzeButton.disabled).toBe(false));
	});

	it("gives the capture frame a named region and represents captured photos as a list", async () => {
		renderCamera();

		expect(await screen.findByRole("region", { name: "Meal photo capture" })).toBeVisible();
		expect(screen.queryByRole("list", { name: "Captured meal photos" })).toBeNull();
		expect(screen.getByText("No photo captured yet")).toBeInTheDocument();

		await capturePhoto();

		const capturedPhotos = screen.getByRole("list", { name: "Captured meal photos" });
		expect(capturedPhotos).toBeVisible();
		expect(screen.getAllByRole("listitem")).toHaveLength(1);
		expect(screen.getByLabelText("Remove photo 1")).toBeVisible();
	});

	it("clears stale camera failure after gallery recovery and keeps it cleared as images change", async () => {
		cameraGetPhoto.mockRejectedValueOnce(new Error("User cancelled camera"));
		renderCamera();

		fireEvent.click(await screen.findByText("Take a photo"));
		expect(await screen.findByRole("alert")).toHaveTextContent(CAMERA_CANCELLED_MESSAGE);
		expect(document.body.textContent).not.toContain("User cancelled camera");

		cameraGetPhoto.mockResolvedValueOnce({ base64String: SYNTHETIC_IMAGE });
		fireEvent.click(screen.getByText("Choose from photos"));
		await waitFor(() => expect(screen.getByAltText("Captured food 1")).toBeVisible());
		expect(screen.queryByRole("alert")).toBeNull();
		const analyzeButton = screen.getByText("Analyze meal").closest("ion-button") as HTMLIonButtonElement;
		expect(analyzeButton.disabled).toBe(false);

		let rejectLateCamera: (reason: Error) => void = () => undefined;
		cameraGetPhoto.mockImplementationOnce(
			() =>
				new Promise((_, reject) => {
					rejectLateCamera = reject;
				}),
		);
		cameraGetPhoto.mockResolvedValueOnce({ base64String: `${SYNTHETIC_IMAGE}-second` });
		fireEvent.click(screen.getByText("Add another angle"));
		fireEvent.click(screen.getByText("Choose from photos"));
		await waitFor(() => expect(screen.getAllByAltText(/Captured food/)).toHaveLength(2));
		act(() => rejectLateCamera(new Error("Camera unavailable raw detail")));
		await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());

		fireEvent.click(screen.getByLabelText("Remove photo 1"));
		await waitFor(() => expect(screen.getAllByAltText(/Captured food/)).toHaveLength(1));
		expect(screen.queryByRole("alert")).toBeNull();
		expect(analyzeButton.disabled).toBe(false);

		fireEvent.click(screen.getByLabelText("Remove photo 1"));
		await waitFor(() => expect(screen.queryByAltText(/Captured food/)).toBeNull());
		expect(screen.queryByRole("alert")).toBeNull();
		expect(analyzeButton.disabled).toBe(true);
	});

	it("uses the human-language note label and never renders internal jargon", async () => {
		const { baseElement } = renderCamera();

		expect(await screen.findByText("Frame the whole meal")).toBeVisible();
		expect(baseElement.querySelector("ion-textarea[label=\"Anything the photo can't show? (optional)\"]")).toBeTruthy();
		expect(screen.queryByText(/Textual Description/i)).toBeNull();
		expect(baseElement.textContent).not.toMatch(/Textual Description/i);
	});

	it("shows the blocking reading state as the Analyze meal label itself, not a competing overlay", async () => {
		vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
		renderCamera();
		await capturePhoto();

		fireEvent.click(screen.getByText("Analyze meal"));

		const loadingLabel = await screen.findByText("Reading your meal photo…");
		const analyzeButton = loadingLabel.closest("ion-button") as HTMLIonButtonElement;
		expect(analyzeButton).toHaveClass("camera-analyze-button");
		expect(analyzeButton.disabled).toBe(true);
		expect(screen.queryByText("Analyze meal")).toBeNull();
	});

	it("renders curated failure copy, suppresses raw detail, and retries", async () => {
		const fetchMock = vi.fn(async () => failedResponse());
		vi.stubGlobal("fetch", fetchMock);
		renderCamera();
		await capturePhoto();

		fireEvent.click(screen.getByText("Analyze meal"));
		expect(await screen.findByRole("alert")).toHaveTextContent(AI_EXTRACTION_UNAVAILABLE_MESSAGE);
		expect(screen.queryByText(RAW_PROVIDER_DETAIL)).toBeNull();
		expect(document.body.textContent).not.toContain(RAW_PROVIDER_DETAIL);

		fireEvent.click(screen.getByText("Try again"));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
	});

	it("routes Enter manually instead to one clean editable manual item", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => failedResponse()));
		renderCamera();
		await capturePhoto();
		fireEvent.click(screen.getByText("Analyze meal"));
		await screen.findByRole("alert");

		fireEvent.click(screen.getByText("Enter manually instead"));

		await waitFor(() => expect(window.location.pathname).toBe("/meals/new"));
		const draft = useCurrentMealStore.getState().meal;
		expect(draft.name).toBe("New Meal");
		expect(draft.isAiDraft).toBe(false);
		expect(draft.backend_created_at).toBeUndefined();
		expect(draft.acute_score).toBeUndefined();
		expect(draft.items).toHaveLength(1);
		expect(draft.items[0].name).toBe("New Item");
	});

	it("clears captured images and errors on leave and on re-entry", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => failedResponse()));
		renderCamera();
		await capturePhoto();
		fireEvent.click(screen.getByText("Analyze meal"));
		await screen.findByRole("alert");

		act(() => lifecycle.didLeave?.());
		await waitFor(() => {
			expect(screen.queryByAltText("Captured food 1")).toBeNull();
			expect(screen.queryByRole("alert")).toBeNull();
			expect(screen.getByText("Analyze meal").closest("ion-button")).toHaveAttribute("disabled");
		});

		await capturePhoto();
		act(() => lifecycle.willEnter?.());
		await waitFor(() => expect(screen.queryByAltText("Captured food 1")).toBeNull());
	});

	it("keeps the privacy disclosure collapsed by default with the sealed wording revealed on demand", async () => {
		const { baseElement } = renderCamera();

		const details = (await screen.findByText("How your photo is used")).closest("details") as HTMLDetailsElement;
		expect(details).toBeTruthy();
		expect(details.open).toBe(false);
		expect(baseElement.querySelector("details.camera-privacy")?.textContent).toContain(AI_EXTRACTION_PRIVACY_DISCLOSURE);

		fireEvent.click(screen.getByText("How your photo is used"));
		expect(details.open).toBe(true);
		expect(screen.getByText(AI_EXTRACTION_PRIVACY_DISCLOSURE)).toBeVisible();
	});

	it("Cancel in the top chrome returns to the Log Meal chooser", async () => {
		renderCamera();

		fireEvent.click(await screen.findByText("Cancel"));

		await waitFor(() => expect(window.location.pathname).toBe("/log-meal"));
	});

	it("keeps the existing five-image quota", async () => {
		renderCamera();
		for (let index = 0; index < 5; index += 1) {
			const label = index === 0 ? "Take a photo" : "Add another angle";
			fireEvent.click(await screen.findByText(label));
			await waitFor(() => expect(screen.getAllByAltText(/Captured food/)).toHaveLength(index + 1));
		}

		expect(cameraGetPhoto).toHaveBeenCalledTimes(5);
		expect((screen.getByText("Add another angle").closest("ion-button") as HTMLIonButtonElement).disabled).toBe(true);
		expect((screen.getByText("Choose from photos").closest("ion-button") as HTMLIonButtonElement).disabled).toBe(true);
	});
});
