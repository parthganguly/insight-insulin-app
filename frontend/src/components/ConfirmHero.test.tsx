import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import ConfirmHero from "./ConfirmHero";

describe("ConfirmHero", () => {
	test("renders the typographic plate and add-photo action without a photo", () => {
		const onAddPhoto = vi.fn();
		const { container } = render(
			<ConfirmHero image={null} mealName='Synthetic supper' disabled={false} onAddPhoto={onAddPhoto} />,
		);

		expect(container.querySelector(".confirm-typographic-plate")).not.toBeNull();
		expect(screen.queryByAltText("Captured food")).toBeNull();

		fireEvent.click(screen.getByText("Add a photo").closest("ion-button")!);
		expect(onAddPhoto).toHaveBeenCalledTimes(1);
	});

	test("renders the photo branch without the add-photo action", () => {
		const { container } = render(
			<ConfirmHero image='data:image/png;base64,synthetic' mealName='Synthetic supper' disabled={false} onAddPhoto={vi.fn()} />,
		);

		expect(screen.getByAltText("Captured food")).toHaveAttribute("src", "data:image/png;base64,synthetic");
		expect(container.querySelector(".confirm-typographic-plate")).toBeNull();
		expect(screen.queryByText("Add a photo")).toBeNull();
	});

	test("disables both hero actions", async () => {
		const { container } = render(
			<ConfirmHero image={null} mealName='Synthetic supper' disabled onAddPhoto={vi.fn()} />,
		);

		// Ionic/Stencil custom elements reflect the `disabled` prop onto the
		// attribute asynchronously (post-upgrade), so assert with waitFor
		// rather than immediately after render.
		await waitFor(() => {
			expect(container.querySelector(".confirm-hero-back")).toHaveAttribute("disabled");
			expect(screen.getByText("Add a photo").closest("ion-button")).toHaveAttribute("disabled");
		});
	});
});
