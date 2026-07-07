// Backend meal timestamps have always meant UTC (issue #77). The backend now
// serializes created_at with an explicit UTC marker ("Z"/"+00:00"), but a
// naive ISO string (no offset) can still appear — from pre-fix values cached
// in localStorage or an older backend build — and Date.parse reads such
// strings as *local* time, which shifted displayed meal times by the UTC
// offset (about 5h30 in Asia/Kolkata). Pin naive strings to UTC instead.
const NAIVE_ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const parseBackendTimestampMs = (createdAt: string, fallback: number): number => {
	const trimmed = createdAt.trim();
	const candidate = NAIVE_ISO_DATE_TIME.test(trimmed) ? `${trimmed.replace(" ", "T")}Z` : trimmed;
	const parsed = Date.parse(candidate);
	return Number.isFinite(parsed) ? parsed : fallback;
};
