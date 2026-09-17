import { useId, useState } from "react";
import type { CatalogBrowseRecord } from "../../types/experimentalReference";
import "./referencePicker.css";

export function ReferencePicker({ itemName, quantity, records, selectedId, onChange }: {
  itemName: string; quantity: number; records: CatalogBrowseRecord[];
  selectedId: string | null; onChange: (sourceRecordId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const visible = records.filter(record => `${record.source_food_wording} ${record.source_record_id} ${record.food_category}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const selected = records.find(record => record.source_record_id === selectedId);
  return <section className="reference-picker" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>Select a published reference for {itemName}</h3>
    <p>Search helps you find a source record. Selection is explicit and does not verify that your food was measured.</p>
    {quantity === 0 && <p>No reference is required for a zero-quantity item.</p>}
    <label htmlFor={`${id}-search`}>Search published references</label>
    <input id={`${id}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} />
    <p role="status">{visible.length} references found</p>
    {selected && <p>Selected: {selected.source_food_wording} ({selected.source_record_id}) <button type="button" onClick={() => onChange(null)}>Clear selected reference</button></p>}
    <ul aria-label="Published reference results">{visible.map(record => <li key={record.source_record_id}>
      <strong>{record.source_food_wording}</strong> ({record.source_record_id}) — {record.eligibility.status.replaceAll("_", " ")}
      <span> · FII mean {record.fii_mean ?? "unreported"}; SEM {record.fii_sem ?? "unreported"}; {record.actual_test_energy_kJ} kJ test dose</span>
      <details><summary>Study and eligibility for {record.source_record_id}</summary>
        <dl>
          <dt>Study</dt><dd>{record.source_study}</dd>
          <dt>DOI</dt><dd>{record.source_doi}</dd>
          <dt>Reference scale</dt><dd>{record.reference_scale ?? "Unreported"}</dd>
          <dt>Eligibility</dt><dd>{record.eligibility.status.replaceAll("_", " ")}</dd>
          <dt>Eligibility reasons</dt><dd>{record.eligibility.reasons.length ? record.eligibility.reasons.join("; ") : "None reported"}</dd>
        </dl>
      </details>
      {record.eligibility.status === "candidate" && <button type="button" aria-label={`Select published reference ${record.source_food_wording} ${record.source_record_id} for ${itemName}`} onClick={() => onChange(record.source_record_id)}>Select reference</button>}
      {record.eligibility.status !== "candidate" && <span> — Not eligible for experimental calculation</span>}
    </li>)}</ul>
  </section>;
}
