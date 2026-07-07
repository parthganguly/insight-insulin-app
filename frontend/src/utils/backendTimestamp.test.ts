import { describe, expect, it } from "vitest";

import { parseBackendTimestampMs } from "./backendTimestamp";

// All expectations compare against Date.UTC epoch values, so these tests
// prove UTC interpretation regardless of the machine timezone they run in.
describe("parseBackendTimestampMs (issue #77)", () => {
	const FALLBACK = 123456789;

	it("parses a naive backend ISO string as UTC, not local time", () => {
		// Pre-fix backend serialization observed in the #76 audit.
		const parsed = parseBackendTimestampMs("2026-07-07T03:23:12.977801", FALLBACK);
		expect(parsed).toBe(Date.UTC(2026, 6, 7, 3, 23, 12, 977));
	});

	it("parses a naive string without fractional seconds as UTC", () => {
		expect(parseBackendTimestampMs("2026-07-07T03:23:12", FALLBACK)).toBe(Date.UTC(2026, 6, 7, 3, 23, 12));
	});

	it("parses an explicit UTC string unchanged", () => {
		expect(parseBackendTimestampMs("2026-07-07T03:23:12.977Z", FALLBACK)).toBe(Date.UTC(2026, 6, 7, 3, 23, 12, 977));
		expect(parseBackendTimestampMs("2026-07-07T03:23:12+00:00", FALLBACK)).toBe(Date.UTC(2026, 6, 7, 3, 23, 12));
	});

	it("respects a non-UTC offset when one is present", () => {
		// 08:53:12 IST is 03:23:12 UTC.
		expect(parseBackendTimestampMs("2026-07-07T08:53:12+05:30", FALLBACK)).toBe(Date.UTC(2026, 6, 7, 3, 23, 12));
	});

	it("keeps naive and offset forms of the same instant equal, preserving sort order", () => {
		const naive = parseBackendTimestampMs("2026-07-07T03:23:12", FALLBACK);
		const aware = parseBackendTimestampMs("2026-07-07T08:53:12+05:30", FALLBACK);
		const later = parseBackendTimestampMs("2026-07-07T04:00:00Z", FALLBACK);
		expect(naive).toBe(aware);
		expect(later).toBeGreaterThan(naive);
	});

	it("returns the fallback for unparseable input", () => {
		expect(parseBackendTimestampMs("not-a-date", FALLBACK)).toBe(FALLBACK);
		expect(parseBackendTimestampMs("", FALLBACK)).toBe(FALLBACK);
	});
});
