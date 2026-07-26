import { IonApp } from "@ionic/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ResultHero from "./ResultHero";

// Annotated Journal J5. Synthetic data only — the "photo" below is an inert
// 1x1 data URI, never a real meal photograph.
const SYNTHETIC_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const renderHero = (image: string | null, mealName = "Synthetic Demo Bowl") =>
	render(
		<IonApp>
			<MemoryRouter>
				<ResultHero image={image} mealName={mealName} />
			</MemoryRouter>
		</IonApp>,
	);

describe("ResultHero", () => {
	it("shows the saved photo when the meal carries one", () => {
		const { container } = renderHero(SYNTHETIC_IMAGE);

		const photo = screen.getByAltText("Saved meal photo") as HTMLImageElement;
		expect(photo.getAttribute("src")).toBe(SYNTHETIC_IMAGE);
		expect(container.querySelector(".result-hero-photo")).toBeTruthy();
		expect(container.querySelector(".typographic-plate")).toBeNull();
	});

	it("falls back to the typographic plate instead of a broken image", () => {
		const { container } = renderHero(null, "Oats with milk");

		expect(screen.queryByAltText("Saved meal photo")).toBeNull();
		expect(container.querySelector(".result-hero-plate")).toBeTruthy();
		// Monogram skips the connector word: "Oats with milk" -> "Om".
		expect(container.querySelector(".typographic-plate-monogram")?.textContent).toBe("Om");
	});

	it("keeps the plate decorative so the meal name is announced once", () => {
		const { container } = renderHero(null);
		expect(container.querySelector(".typographic-plate")?.getAttribute("aria-hidden")).toBe("true");
	});

	it("offers a labelled back control and no photo-editing affordance", () => {
		const { container } = renderHero(SYNTHETIC_IMAGE);

		expect(container.querySelector("ion-back-button[aria-label='Back']")).toBeTruthy();
		expect(screen.queryByText("Add a photo")).toBeNull();
	});

	it("scrims the hero for chrome legibility without overlaying text", () => {
		const { container } = renderHero(SYNTHETIC_IMAGE);
		const scrim = container.querySelector(".result-hero-scrim");
		expect(scrim).toBeTruthy();
		expect(scrim?.getAttribute("aria-hidden")).toBe("true");
		expect(scrim?.textContent).toBe("");
	});
});
