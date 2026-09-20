import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReferencePicker } from "./ReferencePicker";
import type { CatalogBrowseRecord } from "../../types/experimentalReference";

const record = (id: string, status: CatalogBrowseRecord["eligibility"]["status"]): CatalogBrowseRecord => ({
  source_record_id: id, source_food_wording: "Rice", food_category: "Grain", fii_mean: 50, fii_sem: 4,
  source_study: "Synthetic study", source_doi: "10.synthetic/example", reference_scale: "glucose=100",
  actual_test_energy_kJ: 1000, eligibility: { use: "experimental_fii_input", status, reasons: status === "candidate" ? [] : ["source review required"] },
});
const records = [record("BAO2011-001", "candidate"), record("BAO2011-002", "candidate"),
  record("BELL2016-S1-001", "reference_only"), record("BELL2016-S1-017", "requires_review")];

describe("explicit reference picker", () => {
  it("keeps similar wording distinct and never selects through search", async () => {
    const onChange = vi.fn(); const user = userEvent.setup();
    render(<ReferencePicker itemName="My rice" quantity={1} records={records} selectedId={null} onChange={onChange} />);
    await user.type(screen.getByRole("searchbox", { name: "Search published references" }), "rice");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: /Select published reference/ })).toHaveLength(2);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("BAO2011-001");
    expect(screen.getByRole("list", { name: "Published reference results" })).toBeInTheDocument();
    // M02: eligibility is shown with the approved display labels. "candidate"
    // means eligible under the source policy, never a search or food match.
    expect(screen.getAllByText(/Reference only — not selectable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Requires source review — not selectable/i).length).toBeGreaterThan(0);
    // The raw policy enum is still exposed, unchanged, in source details.
    expect(screen.getAllByText(/\(reference_only\)|\(requires_review\)/).length).toBeGreaterThan(0);
    // Match/recommendation language must never appear.
    expect(document.body.textContent).not.toMatch(/search match|best match|recommend/i);
    const studyDetails = screen.getByText("Study and eligibility for BELL2016-S1-017").closest("details")!;
    expect(studyDetails).toHaveTextContent("Synthetic study");
    expect(studyDetails).toHaveTextContent("10.synthetic/example");
    expect(studyDetails).toHaveTextContent("glucose=100");
    expect(studyDetails).toHaveTextContent("source review required");
  });
  it("clears selection and explains zero quantity", async () => {
    const onChange = vi.fn(); const user = userEvent.setup();
    render(<ReferencePicker itemName="My rice" quantity={0} records={records} selectedId="BAO2011-002" onChange={onChange} />);
    expect(screen.getByText(/No reference is required for a zero-quantity item/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear selected reference" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
