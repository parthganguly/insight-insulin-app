import { App as CapacitorApp, type RestoredListenerEvent } from "@capacitor/app";
import { Camera, CameraResultType, CameraSource, type Photo } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import type { Meal } from "../types/Meal";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { describeCameraFailure } from "./aiFailureCopy";
import { getMealFlowBaseline, restoreMealFlowBaseline, type MealFlowBaseline } from "./mealFlowGuard";

export const CAMERA_RECOVERY_DB = "insight-camera-recovery";
export const CAMERA_RECOVERY_MARKER = "insight-camera-pending";
export const CAMERA_RECOVERY_MAX_AGE_MS = 15 * 60 * 1000;
export const CAMERA_RECOVERY_WAIT_MS = 3000;
type Caller = "/log-meal" | "/meals/new";
export type SmartCameraState = { images: string[]; note: string; error: string; failureKind: "analysis" | "camera" | null };
export type CameraRecoveryContext = {
	flow: "smart-camera" | "preview-photo";
	caller: Caller;
	meal: Meal;
	smart: SmartCameraState | null;
};
export type CameraRecoveryEnvelope = CameraRecoveryContext & {
	version: 1;
	nonce: string;
	createdAt: number;
	source: CameraSource;
	destination: "/meals/new/ai" | "/meals/new";
	baseline?: MealFlowBaseline | null;
};

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const optionalFields = (value: Record<string, unknown>, keys: string[], validate: (field: unknown) => boolean) => keys.every(key => value[key] === undefined || validate(value[key]));
const string = (value: unknown) => typeof value === "string";

export function parseCameraRecovery(value: unknown, now = Date.now()): CameraRecoveryEnvelope | null {
	if (!isObject(value) || value.version !== 1 || typeof value.nonce !== "string" || !value.nonce || !finite(value.createdAt) || value.createdAt > now || now - value.createdAt >= CAMERA_RECOVERY_MAX_AGE_MS) return null;
	if (value.source !== CameraSource.Camera && value.source !== CameraSource.Photos) return null;
	if (value.caller !== "/log-meal" && value.caller !== "/meals/new") return null;
	const meal = value.meal;
	if (!isObject(meal) || typeof meal.id !== "string" || !meal.id || typeof meal.name !== "string" || !finite(meal.timestamp) || (meal.image !== null && typeof meal.image !== "string") || !Array.isArray(meal.items)) return null;
	if (!meal.items.every(item => isObject(item) && typeof item.id === "string" && typeof item.name === "string" && typeof item.servingUnit === "string" && ["servingSize", "amount", "kcalPerServing", "carbPerServing_g", "satFatPerServing_g", "gi"].every(key => finite(item[key])) && (item.needsReview === undefined || (isObject(item.needsReview) && typeof item.needsReview.previousName === "string")))) return null;
	if (!meal.items.every(item => optionalFields(item, ["proteinPerServing_g", "fatPerServing_g", "fii"], finite) && optionalFields(item, ["image", "source", "why"], string) && (item.draftProvenance === undefined || ["ai_proposed", "user_reviewed", "user_entered"].includes(item.draftProvenance)))) return null;
	if (!optionalFields(meal, ["acute_score", "insulin_load_total", "kcal_total", "carbs_total", "protein_total", "fat_total"], finite) || !optionalFields(meal, ["backend_created_at", "source_meal_id", "estimate_quality"], string)) return null;
	if ((meal.isAiDraft !== undefined && typeof meal.isAiDraft !== "boolean") || (meal.calorie_source !== undefined && meal.calorie_source !== "meal_estimate" && meal.calorie_source !== "item_sum") || (meal.estimate_status !== undefined && meal.estimate_status !== "estimated" && meal.estimate_status !== "insufficient_data") || (meal.main_insulin_drivers !== undefined && (!Array.isArray(meal.main_insulin_drivers) || !meal.main_insulin_drivers.every(string)))) return null;
	if (meal.estimate !== undefined && (!isObject(meal.estimate) || !["estimated_calories", "estimated_carbs_g", "estimated_fat_g", "confidence", "serving_count"].every(key => finite((meal.estimate as Record<string, unknown>)[key])) || typeof meal.estimate.serving_type !== "string")) return null;
	if (value.baseline != null && (!isObject(value.baseline) || value.baseline.mealId !== meal.id || typeof value.baseline.fingerprint !== "string")) return null;
	if (value.flow === "smart-camera") {
		const smart = value.smart;
		if (value.destination !== "/meals/new/ai" || !isObject(smart) || !Array.isArray(smart.images) || smart.images.length > 5 || !smart.images.every(image => typeof image === "string") || typeof smart.note !== "string" || typeof smart.error !== "string" || (smart.failureKind !== null && smart.failureKind !== "analysis" && smart.failureKind !== "camera")) return null;
	} else if (value.flow !== "preview-photo" || value.destination !== "/meals/new" || value.caller !== "/meals/new" || value.smart !== null) return null;
	return value as CameraRecoveryEnvelope;
}

// One purpose-limited record. IndexedDB accepts the multi-MB photos that must
// never enter localStorage; transaction completion precedes external launch.
function recoveryRecord(operation: "read" | "write" | "remove", value?: CameraRecoveryEnvelope, nonce?: string): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(CAMERA_RECOVERY_DB, 1);
		request.onupgradeneeded = () => request.result.createObjectStore("pending");
		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error("Camera recovery storage unavailable"));
		request.onsuccess = () => {
			const db = request.result;
			try {
				const transaction = db.transaction("pending", operation === "read" ? "readonly" : "readwrite");
				const store = transaction.objectStore("pending");
				let result: unknown;
				transaction.oncomplete = () => { db.close(); resolve(result); };
				transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error); };
				if (operation === "write") store.put(value, "active");
				else {
					const read = store.get("active");
					read.onsuccess = () => {
						result = read.result;
						if (operation === "remove" && (!nonce || (isObject(result) && result.nonce === nonce))) store.delete("active");
					};
				}
			} catch (error) {
				db.close();
				reject(error);
			}
		};
	});
}

let activeNonce: string | null = null;
let expiry: ReturnType<typeof setTimeout> | undefined;
let recoveredSmart: (SmartCameraState & { caller: Caller }) | null = null;

function removeMarker(nonce?: string): void {
	if (!nonce || localStorage.getItem(CAMERA_RECOVERY_MARKER) === nonce) localStorage.removeItem(CAMERA_RECOVERY_MARKER);
}

export function takeRecoveredSmartCamera() {
	const result = recoveredSmart;
	recoveredSmart = null;
	return result;
}

export async function clearCameraRecovery(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;
	const nonce = activeNonce;
	activeNonce = null;
	clearTimeout(expiry);
	if (nonce) {
		removeMarker(nonce);
		await recoveryRecord("remove", undefined, nonce);
	}
}

export async function getRecoverablePhoto(source: CameraSource, context: CameraRecoveryContext): Promise<Photo> {
	if (!Capacitor.isNativePlatform()) return Camera.getPhoto({ resultType: CameraResultType.Base64, source, quality: 90, saveToGallery: false });
	if (activeNonce) throw new Error("Camera already open");
	const nonce = crypto.randomUUID();
	activeNonce = nonce;
	try {
		await recoveryRecord("write", { ...context, version: 1, nonce, source, createdAt: Date.now(), destination: context.flow === "smart-camera" ? "/meals/new/ai" : "/meals/new", baseline: getMealFlowBaseline(context.meal.id) });
		if (activeNonce !== nonce) throw new Error("Camera cancelled");
		// A 36-character nonce only: a consumed result stays consumed even if
		// IndexedDB cleanup fails. Never put draft fields or photos here.
		localStorage.setItem(CAMERA_RECOVERY_MARKER, nonce);
		expiry = setTimeout(() => { void clearCameraRecovery().catch(() => undefined); }, CAMERA_RECOVERY_MAX_AGE_MS);
		return await Camera.getPhoto({ resultType: CameraResultType.Base64, source, quality: 90, saveToGallery: false });
	} finally {
		if (activeNonce === nonce) { activeNonce = null; clearTimeout(expiry); }
		removeMarker(nonce);
		// A failure to delete must not hide an otherwise successful live photo.
		await recoveryRecord("remove", undefined, nonce).catch(() => undefined);
	}
}

export function restoreCameraState(envelope: CameraRecoveryEnvelope, event: RestoredListenerEvent | null): void {
	const data: unknown = event?.data;
	const image = event?.success === true && isObject(data) && typeof data.base64String === "string" && data.base64String.length > 0 && data.format === "jpeg"
		? `data:image/jpeg;base64,${data.base64String}` : null;
	useCurrentMealStore.getState().setMeal(envelope.flow === "preview-photo" && image ? { ...envelope.meal, image } : envelope.meal);
	restoreMealFlowBaseline(envelope.baseline ?? null);
	if (envelope.smart) {
		const smart = envelope.smart;
		recoveredSmart = {
			...smart, caller: envelope.caller,
			images: image ? [...smart.images, image].slice(0, 5) : smart.images,
			error: image ? "" : describeCameraFailure(new Error(event?.error?.message ?? "Camera unavailable")),
			failureKind: image ? null : "camera",
		};
	}
	// Runs before IonReactRouter exists, so neither its stack nor a draft
	// blocker can intercept restoration. The explicit caller survives separately.
	window.history.replaceState(null, "", envelope.destination);
}

export async function bootstrapCameraRecovery(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;
	let accept: (event: RestoredListenerEvent) => void = () => undefined;
	const restored = new Promise<RestoredListenerEvent>(resolve => { accept = resolve; });
	// App 7.0.1 retains events until its first listener. Register before any
	// async storage/inset work; ignore every unrelated plugin/method.
	await CapacitorApp.addListener("appRestoredResult", event => {
		if (event.pluginId === "Camera" && event.methodName === "getPhoto") accept(event);
	});
	const raw = await recoveryRecord("read").catch(() => null);
	const envelope = parseCameraRecovery(raw);
	if (!envelope || localStorage.getItem(CAMERA_RECOVERY_MARKER) !== envelope.nonce) {
		removeMarker();
		await recoveryRecord("remove").catch(() => undefined);
		accept = () => undefined;
		return;
	}
	let timer: ReturnType<typeof setTimeout> | undefined;
	const event = await Promise.race([restored, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), CAMERA_RECOVERY_WAIT_MS); })]);
	clearTimeout(timer);
	accept = () => undefined;
	removeMarker(envelope.nonce);
	// The nonce is already consumed; failed disk cleanup must not lose the
	// valid result in hand. A later boot purges records without that nonce.
	await recoveryRecord("remove", undefined, envelope.nonce).catch(() => undefined);
	// No native payload (including picker implementations with no saved call):
	// recover the pre-activity work once, with existing curated failure copy.
	restoreCameraState(envelope, event);
}
