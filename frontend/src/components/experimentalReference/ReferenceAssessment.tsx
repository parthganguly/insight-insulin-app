import { useId } from "react";
import type { ItemResult, Reason, ReferenceMealResponse } from "../../types/experimentalReference";
import "./referencePicker.css";

const reasonCopy: Record<string, string> = {
  no_reference_selected: "No published reference was selected.",
  unknown_id: "The selected reference is unavailable.",
  reference_only: "This reference is for context only.",
  requires_review: "This reference needs further review.",
  missing_energy: "Reviewed energy is missing.",
  zero_energy: "A consumed item needs positive energy.",
  no_consumed_items: "No positive-quantity items were entered.",
  incomplete_consumed_items: "Some consumed items cannot be assessed.",
};

function safeReason(reason: Reason) { return reasonCopy[reason.code] ?? "This item cannot be assessed with the selected evidence."; }

export function ReferenceEvidenceRow({ item }: { item: ItemResult }) {
  const source = item.source;
  return <article aria-label={`Reference evidence for ${item.inputs.name}`}>
    <h3>{item.inputs.name}</h3>
    <p>{item.status === "not_consumed" ? "Not consumed" : item.status === "calculated" ? `Item reference load: ${item.reference_load}` : "Item estimate unavailable"}</p>
    {item.status === "unavailable" && <ul>{item.reasons.map((reason, i) => <li key={i}>{safeReason(reason)}</li>)}</ul>}
    {(source || item.reasons.length > 0) && <details className="reference-evidence">
      <summary>Source details for {item.inputs.name}</summary>
      {source && <>
      <dl>
        <dt>Original user food name</dt><dd>{item.inputs.name}</dd>
        <dt>Selected published reference</dt><dd>{source.source_food_wording} ({source.source_record_id})</dd>
        <dt>Source food wording</dt><dd>{source.source_food_wording}</dd>
        <dt>FII mean</dt><dd>{source.fii_mean ?? "Not reported"}</dd>
        <dt>SEM</dt><dd>{source.uncertainty_value ?? "Not reported"}. Uncertainty of the published group mean; not personal prediction uncertainty.</dd>
        <dt>Reference scale</dt><dd>{source.reference_scale}</dd>
        <dt>Actual test dose</dt><dd>{source.actual_test_energy_kJ} kJ</dd>
        <dt>Population</dt><dd>{source.population}</dd>
        <dt>Study</dt><dd>{source.source_study}</dd>
        <dt>DOI</dt><dd>{source.source_doi}</dd>
      </dl>
      <p>Selected published reference does not mean this exact food was measured.</p>
      </>}
      {item.reasons.length > 0 && <p>Technical reasons: {item.reasons.map(reason => `${reason.code}: ${reason.detail}`).join("; ")}</p>}
      {(source?.eligibility.find(e => e.use === "experimental_fii_input")?.reasons.length ?? 0) > 0 && <p>Eligibility: {source?.eligibility.find(e => e.use === "experimental_fii_input")?.reasons.join("; ")}</p>}
    </details>}
  </article>;
}

export function ReferenceAssessment({ response }: { response: Pick<ReferenceMealResponse, "assessment_state" | "assessment" | "reasons"> }) {
  const titleId = useId();
  if (response.assessment_state === "not_evaluated") return <section aria-labelledby={titleId}><h2 id={titleId}>No experimental assessment saved</h2><p>This meal predates or did not use the experimental reference assessment. It is not recomputed from the current catalog.</p></section>;
  if (response.assessment_state === "evidence_error" || !response.assessment) return <section aria-labelledby={titleId}><h2 id={titleId}>Saved experimental evidence can’t be verified</h2><p>The saved meal and nutrition remain available. No replacement estimate is calculated.</p></section>;
  const result = response.assessment;
  if (result.status === "unavailable" || result.reference_load_total === null) return <section aria-labelledby={titleId}>
    <h2 id={titleId}>Experimental estimate unavailable</h2>
    <p>A complete estimate is unavailable for this meal.</p>
    {result.items.filter(item => item.inputs.quantity > 0 && item.status === "unavailable").map(item => <ReferenceEvidenceRow key={item.position} item={item} />)}
    {result.items.filter(item => item.status !== "unavailable").map(item => <ReferenceEvidenceRow key={item.position} item={item} />)}
    {result.reasons.some(reason => reason.code === "no_consumed_items") && <p>{safeReason(result.reasons[0])}</p>}
  </section>;
  return <section aria-labelledby={titleId}>
    <h2 id={titleId}>Experimental meal insulin-demand estimate</h2>
    <p>Reference load: <strong>{result.reference_load_total}</strong></p>
    <p>Model-derived population-level estimate based on the meal amounts and explicitly selected published references. This is not a measured personal insulin response. Higher values only mean a larger calculated load under this experimental formula.</p>
    {result.items.map(item => <ReferenceEvidenceRow key={item.position} item={item} />)}
  </section>;
}
