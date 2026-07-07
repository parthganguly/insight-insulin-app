import { describe, expect, it } from "vitest";

import { AiExtractionHttpError } from "../api/api";
import {
	AI_EXTRACTION_NETWORK_MESSAGE,
	AI_EXTRACTION_UNAVAILABLE_MESSAGE,
	CAMERA_CANCELLED_MESSAGE,
	CAMERA_UNAVAILABLE_MESSAGE,
	describeAiExtractionFailure,
	describeCameraFailure,
	isCameraCancellation,
} from "./aiFailureCopy";

describe("describeAiExtractionFailure (issue #74)", () => {
	it("maps the missing-key backend error to curated copy without leaking internals", () => {
		const legacyDetail = new AiExtractionHttpError(400, "OPENAI_API_KEY environment variable is not set");
		const currentDetail = new AiExtractionHttpError(400, "AI meal extraction is not configured on this server");

		for (const error of [legacyDetail, currentDetail]) {
			const message = describeAiExtractionFailure(error);
			expect(message).toBe(AI_EXTRACTION_UNAVAILABLE_MESSAGE);
			expect(message).not.toContain("OPENAI_API_KEY");
			expect(message.toLowerCase()).toContain("manually");
		}
	});

	it("maps provider/backend HTTP errors of any status to the unavailable copy", () => {
		for (const status of [429, 500, 502, 503]) {
			expect(describeAiExtractionFailure(new AiExtractionHttpError(status, "upstream provider detail"))).toBe(AI_EXTRACTION_UNAVAILABLE_MESSAGE);
		}
	});

	it("maps fetch network failures to the connection copy", () => {
		expect(describeAiExtractionFailure(new TypeError("Failed to fetch"))).toBe(AI_EXTRACTION_NETWORK_MESSAGE);
	});

	it("falls back to the unavailable copy for unknown errors", () => {
		expect(describeAiExtractionFailure(new Error("unexpected"))).toBe(AI_EXTRACTION_UNAVAILABLE_MESSAGE);
		expect(describeAiExtractionFailure(undefined)).toBe(AI_EXTRACTION_UNAVAILABLE_MESSAGE);
	});
});

describe("describeCameraFailure (issue #74)", () => {
	it("treats Capacitor cancellation errors as a gentle non-scary message", () => {
		const cancellation = new Error("User cancelled photos app");
		expect(isCameraCancellation(cancellation)).toBe(true);
		expect(describeCameraFailure(cancellation)).toBe(CAMERA_CANCELLED_MESSAGE);
	});

	it("treats denied/unavailable camera errors as unavailable with fallbacks", () => {
		for (const error of [new Error("Permission denied"), new Error("Camera unavailable"), undefined]) {
			expect(describeCameraFailure(error)).toBe(CAMERA_UNAVAILABLE_MESSAGE);
		}
		expect(CAMERA_UNAVAILABLE_MESSAGE.toLowerCase()).toContain("manually");
	});
});
