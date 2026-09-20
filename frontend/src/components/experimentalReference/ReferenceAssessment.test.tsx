import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReferenceAssessment } from "./ReferenceAssessment";
import type { ReferenceResult } from "../../types/experimentalReference";

import { syntheticItemInput, syntheticItemResult, syntheticResult, syntheticSourceEvidence } from "../../api/referenceFixtures";

const item = syntheticItemResult({
  inputs: syntheticItemInput({ name: "Synthetic user dish", quantity: 1, unit: "serving", kcal_per_unit: 200, kcal_per_unit_unit: "serving", carb_g: null }),
  eaten_kcal: 200, reference_load: 0,
  source: syntheticSourceEvidence({
    source_food_wording: "Source dish", fii_mean: 0, uncertainty_value: 4,
    source_doi: "10.synthetic/example", source_footnote: "Synthetic", population: "Study group",
    eligibility: [
      { use: "composition_energy", status: "requires_review", reasons: ["Composition review"] },
      { use: "experimental_fii_input", status: "candidate", reasons: ["Experimental source note"] },
      { use: "fibre_context", status: "reference_only", reasons: ["Fibre context note"] },
      { use: "gi_gl_calculation", status: "reference_only", reasons: ["GI context note"] },
    ],
  }),
});
const result: ReferenceResult = syntheticResult({ reference_load_total: 0, items: [item] });

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
