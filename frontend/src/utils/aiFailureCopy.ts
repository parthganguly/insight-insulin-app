// User-facing failure copy for the Smart Camera / AI extraction flow (issue #74).
// Raw backend or AI-provider error text must never be shown in the UI: every
// failure is mapped to one of these curated messages, and the manual-entry
// fallback is offered alongside them.

import { AiExtractionHttpError } from "../api/api";

export const AI_EXTRACTION_UNAVAILABLE_MESSAGE =
	"AI meal extraction is not available right now. You can add the meal manually instead.";

export const AI_EXTRACTION_NETWORK_MESSAGE =
	"Could not reach the server to analyze the meal. Check your connection and try again, or add the meal manually.";

export const CAMERA_CANCELLED_MESSAGE = "No photo was taken. You can try again, upload a photo, or add the meal manually.";

export const CAMERA_UNAVAILABLE_MESSAGE =
	"The camera is not available on this device or browser. You can upload a photo or add the meal manually.";

const errorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	return typeof error === "string" ? error : "";
};

// Capacitor reports user dismissal of the camera/photo picker as an error with
// "cancel" in the message (e.g. "User cancelled photos app").
export const isCameraCancellation = (error: unknown): boolean => /cancel/i.test(errorMessage(error));

export const describeCameraFailure = (error: unknown): string =>
	isCameraCancellation(error) ? CAMERA_CANCELLED_MESSAGE : CAMERA_UNAVAILABLE_MESSAGE;

export const describeAiExtractionFailure = (error: unknown): string => {
	// fetch signals network-level failures as TypeError; everything the backend
	// answered (missing key, provider errors, bad responses) gets the generic
	// "not available" copy so no internal detail leaks to the user.
	if (error instanceof AiExtractionHttpError) return AI_EXTRACTION_UNAVAILABLE_MESSAGE;
	if (error instanceof TypeError) return AI_EXTRACTION_NETWORK_MESSAGE;
	return AI_EXTRACTION_UNAVAILABLE_MESSAGE;
};
