import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeMealPreviewResponse, postMealPreviewToAPI } from "./api";

const rawPreview = (overrides: Record<string, unknown> = {}) => ({
	id: "must-not-survive",
	created_at: "2026-08-01T00:00:00Z",
	meal_name: "Synthetic preview",
	items: [],
	insulin_load_total: 0,
	acute_score: 0,
	kcal_total: 0,
	carbs_total: 0,
	protein_total: 0,
	fat_total: 0,
	estimate_quality: "high",
	estimate_status: "insufficient_data",
	main_insulin_drivers: [],
	persisted: false,
	...overrides,
});

describe("B2-2 preview API boundary", () => {
	afterEach(() => { vi.unstubAllGlobals(); });

	it("normalizes preview without fabricating saved identity or time", () => {
		const preview = normalizeMealPreviewResponse(rawPreview());
		expect(preview.persisted).toBe(false);
		expect(preview.estimate_status).toBe("insufficient_data");
		expect(preview).not.toHaveProperty("id");
		expect(preview).not.toHaveProperty("created_at");
	});

	it("constructs a narrow preview wire body that cannot leak client_request_id", async () => {
		const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
			void input;
			void init;
			return { ok: true, json: async () => rawPreview() };
		});
		vi.stubGlobal("fetch", fetchMock);

		await postMealPreviewToAPI({
			meal_name: "Synthetic preview",
			items: [],
			client_request_id: "must-not-leak",
		} as never);

		const [, init] = fetchMock.mock.calls[0];
		expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/meals\/preview$/);
		expect(JSON.parse(String((init as RequestInit).body))).toEqual({ meal_name: "Synthetic preview", items: [] });
	});

	it("treats insufficient_data as a successful preview response", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => rawPreview() })));
		await expect(postMealPreviewToAPI({ meal_name: "Synthetic preview", items: [] })).resolves.toMatchObject({
			estimate_status: "insufficient_data",
			persisted: false,
		});
	});
});
