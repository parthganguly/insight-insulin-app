import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { ReferenceApiError } from "../../api/experimentalReference";
import { syntheticItemInput, syntheticItemResult } from "../../api/referenceFixtures";
import type { CatalogBrowseRecord, ItemResult } from "../../types/experimentalReference";
import { ReferenceEvidenceRow } from "./ReferenceAssessment";
import { ReferenceCatalogStaleNotice } from "./ReferenceCatalogStaleNotice";
import { ReferencePicker } from "./ReferencePicker";

it("keeps every R3A interactive control in the scoped 44px rule", () => {
  const record: CatalogBrowseRecord = {
    source_record_id: "BAO2011-001", source_food_wording: "Synthetic food", food_category: "Test",
    fii_mean: 1, fii_sem: null, source_study: "Synthetic study", source_doi: "10.synthetic/test",
    reference_scale: "glucose=100", actual_test_energy_kJ: 1000,
    eligibility: { use: "experimental_fii_input", status: "candidate", reasons: [] },
  };
  const item: ItemResult = syntheticItemResult({
    inputs: syntheticItemInput({ name: "Synthetic meal item", quantity: 1, unit: "serving", kcal_per_unit: null, kcal_per_unit_unit: null, carb_g: null, source_record_id: null }),
    status: "unavailable", eaten_kcal: null, reference_load: null, source: null,
    reasons: [{ code: "no_reference_selected", detail: "No selection" }],
  });
  const { container } = render(<>
    <ReferencePicker itemName="Synthetic meal item" quantity={1} records={[record]} selectedId={record.source_record_id} onChange={vi.fn()} />
    <ReferenceCatalogStaleNotice error={new ReferenceApiError(409, "stale_catalog_version")} onBrowseAgain={vi.fn()} />
    <ReferenceEvidenceRow item={item} />
  </>);
  const selectors = [
    '.reference-picker input[type="search"]', '.reference-picker button', '.reference-picker summary',
    '.reference-catalog-stale button', '.reference-evidence summary',
  ];
  const css = readFileSync(resolve("src/components/experimentalReference/referencePicker.css"), "utf8");
  const touchRule = css.match(/([^{}]+)\{\s*min-height:\s*44px;\s*\}/)?.[1] ?? "";
  for (const selector of selectors) {
    expect(container.querySelector(selector)).not.toBeNull();
    expect(touchRule).toContain(selector);
  }
  expect(css).toContain(":focus-visible");
});
