import config from "../../config.json";
import type { CatalogBrowse, ReferenceMealResponse, ReferencePreviewRequest, ReferenceResult, ReferenceSaveRequest } from "../types/experimentalReference";

const baseUrl = (import.meta.env.VITE_BACKEND_API_URL ?? config.backend_api_url ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

export class ReferenceApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly catalogVersion?: string) {
    super(code);
  }
}

async function read<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new ReferenceApiError(response.status, body?.detail?.code ?? "reference_request_failed", body?.detail?.catalog_version);
  return body as T;
}

// Construct the strict wire body. Published FII never enters legacy request fields.
export function referenceWireBody(request: ReferencePreviewRequest | ReferenceSaveRequest) {
  return {
    meal_name: request.meal_name,
    expected_catalog_version: request.expected_catalog_version,
    items: request.items.map(item => ({
      name: item.name, quantity: item.quantity, unit: item.unit,
      kcal_per_unit: item.kcal_per_unit, kcal_per_unit_unit: item.kcal_per_unit_unit,
      nutrition_origin: item.nutrition_origin, carb_g: item.carb_g,
      protein_g: item.protein_g, fat_g: item.fat_g, sat_fat_g: item.sat_fat_g,
      gi: item.gi, source_record_id: item.source_record_id,
    })),
    ...("client_request_id" in request ? { client_request_id: request.client_request_id, created_at: request.created_at } : {}),
  };
}

export async function browseReferences(): Promise<CatalogBrowse> {
  return read(await fetch(`${baseUrl}/reference-meals/catalog`));
}

export async function previewReference(request: ReferencePreviewRequest): Promise<{ persisted: false; assessment: ReferenceResult }> {
  return read(await fetch(`${baseUrl}/reference-meals/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(referenceWireBody(request)) }));
}

export async function saveReference(request: ReferenceSaveRequest): Promise<ReferenceMealResponse> {
  return read(await fetch(`${baseUrl}/reference-meals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(referenceWireBody(request)) }));
}

export async function readReference(mealId: string): Promise<ReferenceMealResponse> {
  return read(await fetch(`${baseUrl}/reference-meals/${encodeURIComponent(mealId)}`));
}
