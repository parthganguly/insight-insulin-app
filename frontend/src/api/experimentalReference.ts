import config from "../../config.json";
import {
  decodeCatalog,
  decodeMealList,
  decodeMealResponse,
  decodePreviewResponse,
  type ReferenceListDecode,
} from "./referenceDecode";
import type {
  CatalogBrowse,
  ReferenceMealResponse,
  ReferencePreviewRequest,
  ReferencePreviewResponse,
  ReferenceSaveRequest,
} from "../types/experimentalReference";

export const referenceBaseUrl = (import.meta.env.VITE_BACKEND_API_URL ?? config.backend_api_url ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
export const referenceSaveEndpoint = `${referenceBaseUrl}/reference-meals`;

/** One finite deadline for every reference call. Abort controls client waiting, not server work. */
export const REFERENCE_HTTP_DEADLINE_MS = 30_000;

// Curated codes only. Arbitrary server text never becomes an error code, and
// no response body or reviewed request is ever logged or displayed (D10).
const KNOWN_CODES = new Set([
  "stale_catalog_version",
  "request_id_conflict",
  "catalog_unavailable",
  "invalid_reference_request",
  "unsupported_numeric_result",
  "unsupported_compatibility_result",
  "save_failed",
  "meal_not_found",
]);

export const GENERIC_PROTOCOL_CODE = "reference_protocol_error";
export const GENERIC_FAILURE_CODE = "reference_request_failed";
export const NETWORK_CODE = "reference_network_error";

export class ReferenceApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly catalogVersion?: string) {
    super(code);
    this.name = "ReferenceApiError";
  }

  /**
   * C3: only the reference route's own structured `meal_not_found` body proves
   * one record is absent. A generic FastAPI 404, an HTML 404, a malformed body
   * or an unmounted router is a route/protocol/configuration problem.
   */
  get isProtocolAbsence(): boolean {
    return this.status === 404 && this.code === "meal_not_found";
  }

  /** No response was seen at all, so a mutation's outcome is unknown. */
  get isTransportFailure(): boolean {
    return this.status === 0;
  }
}

const curateCode = (detail: unknown, fallback: string): string => {
  const code = detail && typeof detail === "object" ? (detail as Record<string, unknown>).code : undefined;
  return typeof code === "string" && KNOWN_CODES.has(code) ? code : fallback;
};

const catalogVersionOf = (detail: unknown): string | undefined => {
  const value = detail && typeof detail === "object" ? (detail as Record<string, unknown>).catalog_version : undefined;
  return typeof value === "string" ? value : undefined;
};

async function parseBody(response: Response): Promise<{ parsed: true; body: unknown } | { parsed: false }> {
  try {
    return { parsed: true, body: await response.json() };
  } catch {
    // A non-JSON body (HTML 503, proxy page, truncated stream) keeps its HTTP
    // status and gets a generic code instead of being echoed anywhere.
    return { parsed: false };
  }
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  // R04: `fetch` resolving means headers arrived, NOT that the operation
  // finished. The body is a second, separately stallable stream, so the
  // deadline has to stay armed until the whole operation settles — otherwise a
  // server that sends headers and then stalls leaves the UI waiting forever
  // despite an advertised 30-second limit.
  const deadline = setTimeout(() => controller.abort(), REFERENCE_HTTP_DEADLINE_MS);
  try {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch {
      throw new ReferenceApiError(0, NETWORK_CODE);
    }

    const body = await parseBody(response);
    // A body that stalled past the deadline is NOT a protocol error with a
    // status: we never read a usable response, so the outcome is unknown and
    // an in-flight save must stay ambiguous rather than look rejected.
    if (!body.parsed && controller.signal.aborted) throw new ReferenceApiError(0, NETWORK_CODE);

    if (!response.ok) {
      if (!body.parsed) throw new ReferenceApiError(response.status, GENERIC_PROTOCOL_CODE);
      const detail = (body.body as Record<string, unknown> | null)?.detail;
      throw new ReferenceApiError(response.status, curateCode(detail, GENERIC_FAILURE_CODE), catalogVersionOf(detail));
    }
    if (!body.parsed) throw new ReferenceApiError(response.status, GENERIC_PROTOCOL_CODE);
    return body.body;
  } finally {
    clearTimeout(deadline);
  }
}

export type ReferenceWireItem = {
  name: string;
  quantity: number;
  unit: string;
  kcal_per_unit: number | null;
  kcal_per_unit_unit: string | null;
  nutrition_origin: string;
  carb_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  gi: number | null;
  source_record_id: string | null;
};

/**
 * The strict wire body, with every optional value written explicitly
 * (including real nulls and the declared nutrition origin) so later
 * correspondence checks are deterministic (C2). Published FII never enters a
 * legacy `fii`/`fii_value` request field.
 */
export function referenceWireBody(request: ReferencePreviewRequest | ReferenceSaveRequest) {
  return {
    meal_name: request.meal_name,
    expected_catalog_version: request.expected_catalog_version,
    items: request.items.map((item): ReferenceWireItem => ({
      name: item.name, quantity: item.quantity, unit: item.unit,
      kcal_per_unit: item.kcal_per_unit, kcal_per_unit_unit: item.kcal_per_unit_unit,
      nutrition_origin: item.nutrition_origin, carb_g: item.carb_g,
      protein_g: item.protein_g, fat_g: item.fat_g, sat_fat_g: item.sat_fat_g,
      gi: item.gi, source_record_id: item.source_record_id,
    })),
    ...("client_request_id" in request ? { client_request_id: request.client_request_id, created_at: request.created_at } : {}),
  };
}

const jsonPost = (body: string): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
});

export async function browseReferences(): Promise<CatalogBrowse> {
  return decodeCatalog(await requestJson(`${referenceBaseUrl}/reference-meals/catalog`));
}

export async function previewReference(request: ReferencePreviewRequest): Promise<ReferencePreviewResponse> {
  const body = await requestJson(`${referenceBaseUrl}/reference-meals/preview`, jsonPost(JSON.stringify(referenceWireBody(request))));
  return decodePreviewResponse(body, request);
}

/**
 * Sends the exact frozen bytes of an already-journaled save. The coordinator
 * uses this for both the first dispatch and every explicit retry, so a retry
 * can never re-map, re-serialize or re-identify the request.
 */
export async function postReferenceSaveJson(endpoint: string, wireJson: string): Promise<ReferenceMealResponse> {
  return decodeMealResponse(await requestJson(endpoint, jsonPost(wireJson)), "save");
}

export async function readReference(mealId: string): Promise<ReferenceMealResponse> {
	const entry = decodeMealResponse(await requestJson(`${referenceBaseUrl}/reference-meals/${encodeURIComponent(mealId)}`), "detail");
	// N3: the server must answer about the record asked for. A valid response
	// carrying a different saved ID is a protocol failure for this read: it
	// establishes nothing about the requested record, must not be retried as
	// a generation race, and must never delete or relabel cached content.
	if (entry.legacy_compatibility.id !== mealId) {
		throw new ReferenceApiError(200, GENERIC_PROTOCOL_CODE);
	}
	return entry;
}

export async function listReferences(): Promise<ReferenceListDecode> {
  return decodeMealList(await requestJson(`${referenceBaseUrl}/reference-meals`));
}

export async function deleteReference(mealId: string): Promise<void> {
  const controller = new AbortController();
  // R04: the same deadline rule applies to the DELETE error body. A 204 has no
  // body and completes immediately; anything else still has to be read.
  const deadline = setTimeout(() => controller.abort(), REFERENCE_HTTP_DEADLINE_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${referenceBaseUrl}/reference-meals/${encodeURIComponent(mealId)}`, { method: "DELETE", signal: controller.signal });
    } catch {
      throw new ReferenceApiError(0, NETWORK_CODE);
    }
    if (response.status === 204) return;
    const body = await parseBody(response);
    if (!body.parsed && controller.signal.aborted) throw new ReferenceApiError(0, NETWORK_CODE);
    if (!body.parsed) throw new ReferenceApiError(response.status, GENERIC_PROTOCOL_CODE);
    // The legacy delete handler answers a missing row with a plain string
    // detail, so a DELETE 404 is never self-certifying absence. Reconciliation
    // goes through the reference detail protocol instead (C3).
    const detail = (body.body as Record<string, unknown> | null)?.detail;
    throw new ReferenceApiError(response.status, curateCode(detail, GENERIC_FAILURE_CODE));
  } finally {
    clearTimeout(deadline);
  }
}
