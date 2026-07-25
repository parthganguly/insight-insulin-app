import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import type { MealItem } from "../types/MealItem";
import { Unit } from "../types/MealItem";
import NeedsReviewCard from "./NeedsReviewCard";

const item: MealItem = {
	id: "synthetic-item",
	name: "Synthetic brown rice",
	servingSize: 1,
	servingUnit: Unit.Servings,
	amount: 1,
	kcalPerServing: 200,
	carbPerServing_g: 45,
	proteinPerServing_g: 5,
	fatPerServing_g: 2,
	satFatPerServing_g: 0.2,
	gi: 50,
};

describe("NeedsReviewCard", () => {
	test("returns null when the item has no review state", () => {
		const { container } = render(
			<NeedsReviewCard item={item} disabled={false} onEdit={vi.fn()} onConfirm={vi.fn()} />,
		);

		expect(container).toBeEmptyDOMElement();
	});

	test("renders the previous name and carried per-serving values", () => {
		render(
			<NeedsReviewCard
				item={{ ...item, needsReview: { previousName: "Synthetic white rice" } }}
				disabled={false}
				onEdit={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(screen.getByText('These values were for "Synthetic white rice". Check they still fit.')).toBeInTheDocument();
		expect(screen.getByText(/Per serving: 200 kcal.*45 g carbs.*5 g protein.*2 g fat.*0.2 g saturated fat.*GI 50/)).toBeInTheDocument();
	});

	test("wires both actions and propagates disabled", async () => {
		const reviewItem = { ...item, needsReview: { previousName: "Synthetic white rice" } };
		const onEdit = vi.fn();
		const onConfirm = vi.fn();
		const { container, rerender } = render(
			<NeedsReviewCard item={reviewItem} disabled={false} onEdit={onEdit} onConfirm={onConfirm} />,
		);

		fireEvent.click(screen.getByText("Edit values").closest("ion-button")!);
		fireEvent.click(screen.getByText("These still fit").closest("ion-button")!);
		expect(onEdit).toHaveBeenCalledWith(reviewItem);
		expect(onConfirm).toHaveBeenCalledWith(reviewItem.id);

		rerender(<NeedsReviewCard item={reviewItem} disabled onEdit={onEdit} onConfirm={onConfirm} />);
		// Ionic/Stencil custom elements reflect `disabled` onto the attribute
		// asynchronously (post-upgrade); wait rather than asserting immediately.
		await waitFor(() => container.querySelectorAll("ion-button").forEach((button) => expect(button).toHaveAttribute("disabled")));
	});
});
