import { useId } from "react";
import type { ItemResult, ReferenceMealResponse, ReferenceResult } from "../../types/experimentalReference";
import {
	NUTRIENT_LABELS,
	REFERENCE_UNAVAILABLE_TEXT,
	describeReason,
	formatNutrientTotal,
	formatReferenceNumber,
	speakReferenceNumber,
	summariseReferenceNutrition,
	type ReferenceNutrientKey,
} from "../../utils/referencePresentation";
import "./referencePicker.css";

// A computed reference load uses the shared display helper (freeze D1).
// Published FII and SEM are printed as the source values they are.
function ReferenceNumber({ value }: { value: number | null }) {
  const displayed = formatReferenceNumber(value);
  const spoken = speakReferenceNumber(value);
  if (displayed === null) return <>{REFERENCE_UNAVAILABLE_TEXT}</>;
  return <span aria-label={spoken ?? undefined}><span aria-hidden={spoken !== displayed ? "true" : undefined}>{displayed}</span></span>;
}

export function ReferenceEvidenceRow({ item }: { item: ItemResult }) {
  const source = item.source;
  return <article aria-label={`Reference evidence for ${item.inputs.name}`}>
    <h3>{item.inputs.name}</h3>
    <p>{item.status === "not_consumed"
      ? "Not consumed"
      : item.status === "calculated"
        ? <>Item reference load: <ReferenceNumber value={item.reference_load} /></>
        : "Item estimate unavailable"}</p>
    {item.status === "unavailable" && <ul>{item.reasons.map((reason, i) => <li key={i}>{describeReason(reason)}</li>)}</ul>}
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

const NUTRIENT_ORDER: ReferenceNutrientKey[] = ["kcal", "carb_g", "protein_g", "fat_g", "sat_fat_g"];

/**
 * Reviewed nutrition read back from validated inputs only. A nutrient total is
 * unknown when any consumed row is missing it; known values stay labelled as
 * partial rather than being presented as a complete total.
 */
export function ReferenceReviewedNutrition({ result }: { result: ReferenceResult }) {
  const totals = summariseReferenceNutrition(result);
  if (!totals) return null;
  const rows = NUTRIENT_ORDER.map((key) => [key, formatNutrientTotal(totals[key], key)] as const).filter(([, value]) => value !== null);
  if (rows.length === 0) return null;
  return <section aria-label="Reviewed nutrition">
    <h3>Reviewed nutrition</h3>
    <dl>{rows.map(([key, value]) => <div key={key}>
      <dt>{NUTRIENT_LABELS[key]}</dt>
      <dd>{value?.text}{value?.partial ? " — known items only; at least one consumed item has no value for this nutrient" : ""}</dd>
    </div>)}</dl>
    <p>These are the amounts you reviewed, not a measurement.</p>
  </section>;
}

export function ReferenceAssessment({ response }: { response: Pick<ReferenceMealResponse, "assessment_state" | "assessment" | "reasons"> }) {
  const titleId = useId();
  if (response.assessment_state === "not_evaluated") return <section aria-labelledby={titleId}><h2 id={titleId}>No experimental assessment saved</h2><p>This meal predates or did not use the experimental reference assessment. It is not recomputed from the current catalog.</p><p>Reviewed nutrition is unavailable for this meal in the reference view.</p></section>;
  if (response.assessment_state === "evidence_error" || !response.assessment) return <section aria-labelledby={titleId}><h2 id={titleId}>Saved experimental evidence can’t be verified</h2><p>The saved meal is still in your history. Its reviewed nutrition came from the same saved evidence, so it cannot be shown here either. No replacement estimate is calculated.</p></section>;
  const result = response.assessment;
  if (result.status === "unavailable" || result.reference_load_total === null) return <section aria-labelledby={titleId}>
    <h2 id={titleId}>Experimental estimate unavailable</h2>
    <p>A complete estimate is unavailable for this meal.</p>
    {result.items.filter(item => item.inputs.quantity > 0 && item.status === "unavailable").map(item => <ReferenceEvidenceRow key={item.position} item={item} />)}
    {result.items.filter(item => item.status !== "unavailable").map(item => <ReferenceEvidenceRow key={item.position} item={item} />)}
    {result.reasons.some(reason => reason.code === "no_consumed_items") && <p>{describeReason(result.reasons[0])}</p>}
    <ReferenceReviewedNutrition result={result} />
  </section>;
  return <section aria-labelledby={titleId}>
    <h2 id={titleId}>Experimental meal insulin-demand estimate</h2>
    <p>Reference load: <strong><ReferenceNumber value={result.reference_load_total} /></strong></p>
    <p>Model-derived population-level estimate based on the meal amounts and explicitly selected published references. This is not a measured personal insulin response. Higher values only mean a larger calculated load under this experimental formula.</p>
    {result.items.map(item => <ReferenceEvidenceRow key={item.position} item={item} />)}
    <ReferenceReviewedNutrition result={result} />
  </section>;
}
