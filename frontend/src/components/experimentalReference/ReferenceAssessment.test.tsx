import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReferenceAssessment } from "./ReferenceAssessment";
import type { ReferenceResult } from "../../types/experimentalReference";

const item = {
  position: 0, inputs: { name: "Synthetic user dish", quantity: 1, unit: "serving", source_record_id: "BAO2011-002" },
  selection_label: "explicit_source_reference_not_verified_food_equivalence" as const,
  status: "calculated" as const, eaten_kcal: 200, reference_load: 0, reasons: [],
  source: { source_record_id: "BAO2011-002", source_food_wording: "Source dish", fii_mean: 0,
    uncertainty_type: "SEM" as const, uncertainty_value: 4,
    uncertainty_meaning: "published_food_mean_not_personal_interval" as const,
    reference_scale: "glucose=100", actual_test_energy_kJ: 1000, composition_basis_kJ: 1000,
    source_study: "Synthetic study", source_doi: "10.synthetic/example", source_table: "Table 1",
    source_printed_page: 1, source_row: 2, source_footnote: "Synthetic", population: "Study group",
    issue_ids: [], eligibility: [
      { use: "composition_energy" as const, status: "requires_review" as const, reasons: ["Composition review"] },
      { use: "experimental_fii_input" as const, status: "candidate" as const, reasons: ["Experimental source note"] },
      { use: "fibre_context" as const, status: "reference_only" as const, reasons: ["Fibre context note"] },
      { use: "gi_gl_calculation" as const, status: "reference_only" as const, reasons: ["GI context note"] },
    ],
  },
};
const result: ReferenceResult = { result_schema_version: "reference_meal_result_v1", formula_version: "experimental_reference_load_v1",
  catalog_version: "r2_sha256_synthetic", catalog_schema_version: "insight_reference_catalog_v1",
  eligibility_policy_version: "experimental_fii_input_v1", selection_policy_version: "explicit_source_id_v1",
  status: "experimental", reference_load_total: 0, items: [item], reasons: [] };

describe("experimental presentation", () => {
  it("shows genuine zero and distinct source evidence without acute score", () => {
    render(<ReferenceAssessment response={{ assessment_state: "evaluated", assessment: result, reasons: [] }} />);
    expect(screen.getByRole("heading", { name: "Experimental meal insulin-demand estimate" })).toBeInTheDocument();
    expect(screen.getByText("Reference load:").parentElement).toHaveTextContent("0");
    expect(screen.getByText(/uncertainty of the published group mean/i)).toHaveTextContent("not personal prediction uncertainty");
    expect(screen.getByText(/does not mean this exact food was measured/i)).toBeInTheDocument();
    expect(screen.getByText("Eligibility: Experimental source note")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Composition review");
    expect(document.body.textContent).not.toMatch(/acute score|\/30|legacy/i);
  });
  it("shows unavailable consumed items without a partial total or substitute zero", () => {
    const unavailable: ReferenceResult = { ...result, status: "unavailable", reference_load_total: null,
      items: [{ ...item, status: "unavailable", reference_load: null, reasons: [{ code: "requires_review", detail: "technical review" }] }],
      reasons: [{ code: "incomplete_consumed_items", detail: "technical" }] };
    render(<ReferenceAssessment response={{ assessment_state: "evaluated", assessment: unavailable, reasons: [] }} />);
    expect(screen.getByRole("heading", { name: "Experimental estimate unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Synthetic user dish" })).toBeInTheDocument();
    expect(screen.getByText("This reference needs further review.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Reference load: 0");
  });
  it("does not evaluate missing or damaged stored evidence", () => {
    const { rerender } = render(<ReferenceAssessment response={{ assessment_state: "not_evaluated", assessment: null, reasons: [] }} />);
    expect(screen.getByRole("heading", { name: "No experimental assessment saved" })).toBeInTheDocument();
    expect(screen.getByText(/not recomputed from the current catalog/i)).toBeInTheDocument();
    rerender(<ReferenceAssessment response={{ assessment_state: "evidence_error", assessment: null, reasons: [] }} />);
    expect(screen.getByRole("heading", { name: "Saved experimental evidence can’t be verified" })).toBeInTheDocument();
    expect(screen.getByText(/No replacement estimate is calculated/i)).toBeInTheDocument();
  });
  it("uses distinct labelled headings for multiple assessments", () => {
    const { container } = render(<><ReferenceAssessment response={{ assessment_state: "not_evaluated", assessment: null, reasons: [] }} /><ReferenceAssessment response={{ assessment_state: "evidence_error", assessment: null, reasons: [] }} /></>);
    const sections = Array.from(container.querySelectorAll("section"));
    expect(sections[0].getAttribute("aria-labelledby")).not.toBe(sections[1].getAttribute("aria-labelledby"));
    for (const section of sections) expect(section.querySelector("h2")?.id).toBe(section.getAttribute("aria-labelledby"));
  });
});
