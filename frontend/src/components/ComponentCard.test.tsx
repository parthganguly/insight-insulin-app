import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import type { MealItem } from "../types/MealItem";
import { Unit } from "../types/MealItem";
import ComponentCard from "./ComponentCard";

const item: MealItem = {
	id: "synthetic-item",
	name: "Synthetic lentils",
	servingSize: 100,
	servingUnit: Unit.Grams,
	amount: 1,
	kcalPerServing: 116,
	carbPerServing_g: 20,
	proteinPerServing_g: 9,
	fatPerServing_g: 0.4,
	satFatPerServing_g: 0.1,
	gi: 32,
};

const renderCard = (overrides: Partial<React.ComponentProps<typeof ComponentCard>> = {}) => {
	const props: React.ComponentProps<typeof ComponentCard> = {
		item,
		provenanceCopy: null,
		draftHint: null,
		disabled: false,
		onOpenEditor: vi.fn(),
		onAdjustAmount: vi.fn(),
		onUpdateAmount: vi.fn(),
		onUpdateUnit: vi.fn(),
		parseNumericInput: vi.fn((value: string) => Number(value)),
		...overrides,
	};

	return { ...render(<ComponentCard {...props} />), props };
};

describe("ComponentCard", () => {
	test("renders provenance, draft hint, and review marker only when supplied", () => {
		const { rerender } = renderCard({
			item: { ...item, needsReview: { previousName: "Synthetic beans" } },
			provenanceCopy: "Entered by you",
			draftHint: "Draft values",
		});

		expect(screen.getByText("Entered by you")).toBeInTheDocument();
		expect(screen.getByText("Draft values")).toBeInTheDocument();
		expect(screen.getByText("Values under review")).toBeInTheDocument();

		rerender(
			<ComponentCard
				item={item}
				provenanceCopy={null}
				draftHint={null}
				disabled={false}
				onOpenEditor={vi.fn()}
				onAdjustAmount={vi.fn()}
				onUpdateAmount={vi.fn()}
				onUpdateUnit={vi.fn()}
				parseNumericInput={Number}
			/>,
		);

		expect(screen.queryByText("Entered by you")).toBeNull();
		expect(screen.queryByText("Draft values")).toBeNull();
		expect(screen.queryByText("Values under review")).toBeNull();
	});

	test("propagates disabled to every interactive child", async () => {
		const { container } = renderCard({ disabled: true });

		const controls = container.querySelectorAll("button, ion-button, ion-input, ion-select");
		expect(controls).toHaveLength(6);
		// ion-select never reflects `disabled` onto the HTML attribute (only
		// ion-button/ion-input do) — check the property, which every one of
		// these custom elements sets regardless of attribute reflection.
		await waitFor(() => controls.forEach((control) => expect((control as unknown as { disabled: boolean }).disabled).toBe(true)));
	});

	test("wires editor, stepper, amount, and unit callbacks with item arguments", () => {
		const onOpenEditor = vi.fn();
		const onAdjustAmount = vi.fn();
		const onUpdateAmount = vi.fn();
		const onUpdateUnit = vi.fn();
		const parseNumericInput = vi.fn(() => 2.75);
		const { container } = renderCard({
			onOpenEditor,
			onAdjustAmount,
			onUpdateAmount,
			onUpdateUnit,
			parseNumericInput,
		});

		fireEvent.click(screen.getByRole("button", { name: item.name }));
		expect(onOpenEditor).toHaveBeenCalledWith(item);

		fireEvent.click(container.querySelector(`[aria-label="Decrease ${item.name} portion"]`)!);
		fireEvent.click(container.querySelector(`[aria-label="Increase ${item.name} portion"]`)!);
		expect(onAdjustAmount).toHaveBeenNthCalledWith(1, item.id, -0.5);
		expect(onAdjustAmount).toHaveBeenNthCalledWith(2, item.id, 0.5);

		const amountInput = container.querySelector('ion-input[label="Amount"]')!;
		fireEvent(amountInput, new CustomEvent("ionInput", { bubbles: true, detail: { value: "2.75" } }));
		expect(parseNumericInput).toHaveBeenCalledWith("2.75", item.amount);
		expect(onUpdateAmount).toHaveBeenCalledWith(item.id, 2.75);

		const unitSelect = container.querySelector('ion-select[label="Unit"]')!;
		fireEvent(unitSelect, new CustomEvent("ionChange", { bubbles: true, detail: { value: Unit.Cups } }));
		expect(onUpdateUnit).toHaveBeenCalledWith(item.id, Unit.Cups);

		fireEvent.click(screen.getByText("Edit details").closest("ion-button")!);
		expect(onOpenEditor).toHaveBeenLastCalledWith(item);
		expect(onOpenEditor).toHaveBeenCalledTimes(2);
	});
});
