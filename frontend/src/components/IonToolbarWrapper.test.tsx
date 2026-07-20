import React from "react";
import { render } from "@testing-library/react";
import IonToolbarWrapper from "./IonToolbarWrapper";

test("renders declaratively with the app-toolbar class and no inline inset padding", () => {
	const { container } = render(
		<IonToolbarWrapper>
			<span>Title</span>
		</IonToolbarWrapper>
	);

	const toolbar = container.querySelector("ion-toolbar");
	expect(toolbar).not.toBeNull();
	expect(toolbar?.classList.contains("app-toolbar")).toBe(true);
	// Safe-area padding comes from the centralized --app-safe-area-* source,
	// never from a per-toolbar inline mutation.
	expect((toolbar as HTMLElement).style.paddingTop).toBe("");
	expect(toolbar?.getAttribute("style")).toBeNull();
});

test("preserves caller classes alongside app-toolbar", () => {
	const { container } = render(
		<IonToolbarWrapper className='custom-toolbar'>
			<span>Title</span>
		</IonToolbarWrapper>
	);

	const toolbar = container.querySelector("ion-toolbar");
	expect(toolbar?.classList.contains("app-toolbar")).toBe(true);
	expect(toolbar?.classList.contains("custom-toolbar")).toBe(true);
});
