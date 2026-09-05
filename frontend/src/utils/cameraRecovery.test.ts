import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CameraSource } from "@capacitor/camera";
import type { RestoredListenerEvent } from "@capacitor/app";
import { useCurrentMealStore } from "../stores/currentMealStore";
import { CAMERA_CANCELLED_MESSAGE } from "./aiFailureCopy";
import { bootstrapCameraRecovery, CAMERA_RECOVERY_MARKER, CAMERA_RECOVERY_MAX_AGE_MS, CAMERA_RECOVERY_WAIT_MS, clearCameraRecovery, getRecoverablePhoto, parseCameraRecovery, restoreCameraState, takeRecoveredSmartCamera, type CameraRecoveryEnvelope } from "./cameraRecovery";

const native = vi.hoisted(() => ({ listener: null as ((event: RestoredListenerEvent) => void) | null, photo: vi.fn() }));
vi.mock("@capacitor/core", async importOriginal => ({ ...await importOriginal<typeof import("@capacitor/core")>(), Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn(async (_name, listener) => { native.listener = listener; }) } }));
vi.mock("@capacitor/camera", async importOriginal => ({ ...await importOriginal<typeof import("@capacitor/camera")>(), Camera: { getPhoto: native.photo } }));

// jsdom lacks IndexedDB. Model asynchronous transaction commit/abort here;
// the physical WebView acceptance additionally exercises real IndexedDB.
let disk: unknown;
let failWrite = false;
let failRemove = false;
let failTransaction = false;
const installStorage = () => vi.stubGlobal("indexedDB", {
	open: () => {
		const request: Record<string, unknown> = {};
		queueMicrotask(() => {
			request.result = {
				close: () => undefined,
				transaction: (_store: string, mode: string) => {
					if (failTransaction) throw new Error("Synthetic missing object store");
					const transaction = {
						error: new Error("Synthetic storage failure"), oncomplete: () => undefined, onerror: () => undefined,
						objectStore: () => ({
							put: (value: unknown) => {
								queueMicrotask(() => { if (failWrite) transaction.onerror(); else { disk = structuredClone(value); transaction.oncomplete(); } });
							},
							get: () => {
								const read = { result: disk, onsuccess: () => undefined };
								queueMicrotask(() => { read.onsuccess(); if (failRemove && mode === "readwrite") transaction.onerror(); else transaction.oncomplete(); });
								return read;
							},
							delete: () => { if (!failRemove) disk = undefined; },
						}),
					};
					return transaction;
				},
			};
			(request.onsuccess as () => void)();
		});
		return request;
	},
});

const envelope = (): CameraRecoveryEnvelope => ({
	version: 1, nonce: "synthetic-nonce", createdAt: Date.now(), source: CameraSource.Camera,
	flow: "smart-camera", caller: "/meals/new", destination: "/meals/new/ai",
	meal: { ...useCurrentMealStore.getState().meal, name: "Synthetic review", image: "data:image/jpeg;base64,prior-draft-photo" },
	smart: { images: ["data:image/jpeg;base64,prior-camera-photo"], note: "Synthetic note", error: "", failureKind: null },
});
const success: RestoredListenerEvent = { pluginId: "Camera", methodName: "getPhoto", success: true, data: { format: "jpeg", base64String: "new-photo", exif: {} } };
const seed = (value: CameraRecoveryEnvelope) => { disk = value; localStorage.setItem(CAMERA_RECOVERY_MARKER, value.nonce); };

beforeEach(() => {
	disk = undefined; failWrite = false; failRemove = false; failTransaction = false; native.listener = null; native.photo.mockReset();
	localStorage.clear(); takeRecoveredSmartCamera(); useCurrentMealStore.getState().resetMeal();
	window.history.replaceState(null, "", "/dashboard"); installStorage();
});
afterEach(async () => { await clearCameraRecovery(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Camera recovery envelope and application state", () => {
	it("accepts a complete draft without losing optional review/scientific fields", () => {
		const value = envelope();
		value.meal.items = [{ id: "item", name: "Corrected component", servingSize: 100, servingUnit: "g" as never, amount: 1, kcalPerServing: 120, carbPerServing_g: 24, satFatPerServing_g: 0, gi: 50, needsReview: { previousName: "Proposal" }, draftProvenance: "user_reviewed" }];
		expect(parseCameraRecovery(value)).toEqual(value);
	});
	it.each([null, {}, { version: 2 }, { ...envelope(), nonce: "" }, { ...envelope(), createdAt: 0 }, { ...envelope(), createdAt: Date.now() + 60000 }, { ...envelope(), meal: {} }, { ...envelope(), destination: "/settings" }])("rejects missing, malformed, wrong-schema or stale state: %j", value => {
		expect(parseCameraRecovery(value)).toBeNull();
	});
	it("expires at the explicit age boundary", () => {
		const value = envelope();
		expect(parseCameraRecovery(value, value.createdAt + CAMERA_RECOVERY_MAX_AGE_MS)).toBeNull();
	});
	it.each(["proteinPerServing_g", "fatPerServing_g", "fii", "source", "why", "draftProvenance"])("rejects malformed optional item field %s", field => {
		const value = envelope();
		value.meal.items = [{ id: "item", name: "Synthetic", servingSize: 1, servingUnit: "g" as never, amount: 1, kcalPerServing: 1, carbPerServing_g: 1, satFatPerServing_g: 0, gi: 0, [field]: {} }];
		expect(parseCameraRecovery(value)).toBeNull();
	});
	it.each(["/log-meal", "/meals/new"] as const)("restores Smart Camera and its exact caller %s once", caller => {
		const value = { ...envelope(), caller };
		restoreCameraState(value, success);
		expect(window.location.pathname).toBe("/meals/new/ai");
		expect(useCurrentMealStore.getState().meal).toEqual(value.meal);
		expect(takeRecoveredSmartCamera()).toEqual({ ...value.smart, caller, images: [...value.smart!.images, "data:image/jpeg;base64,new-photo"] });
		expect(takeRecoveredSmartCamera()).toBeNull();
	});
	it("Preview applies only the new photo to the complete pre-camera draft", () => {
		const value: CameraRecoveryEnvelope = { ...envelope(), flow: "preview-photo", destination: "/meals/new", smart: null };
		restoreCameraState(value, success);
		expect(window.location.pathname).toBe("/meals/new");
		expect(useCurrentMealStore.getState().meal).toEqual({ ...value.meal, image: "data:image/jpeg;base64,new-photo" });
		expect(takeRecoveredSmartCamera()).toBeNull();
	});
	it("restored cancellation preserves work and uses curated copy", () => {
		const value = envelope();
		restoreCameraState(value, { pluginId: "Camera", methodName: "getPhoto", success: false, error: { message: "User cancelled photos app" } });
		expect(takeRecoveredSmartCamera()).toEqual({ ...value.smart, caller: value.caller, error: CAMERA_CANCELLED_MESSAGE, failureKind: "camera" });
		expect(useCurrentMealStore.getState().meal).toEqual(value.meal);
	});
});

describe("native boundary durability and lifetime", () => {
	it("commits large prior photos before launch; stores only a nonce in localStorage; clears on success", async () => {
		const value = envelope();
		value.smart!.images = Array(5).fill("x".repeat(835884));
		native.photo.mockImplementation(async () => {
			expect((disk as CameraRecoveryEnvelope).smart?.images).toEqual(value.smart!.images);
			expect(localStorage.getItem(CAMERA_RECOVERY_MARKER)).toHaveLength(36);
			expect(JSON.stringify(localStorage)).not.toContain("Synthetic review");
			return success.data;
		});
		await expect(getRecoverablePhoto(CameraSource.Photos, value)).resolves.toEqual(success.data);
		expect(disk).toBeUndefined(); expect(localStorage.getItem(CAMERA_RECOVERY_MARKER)).toBeNull();
	});
	it("clears on normal rejection", async () => {
		native.photo.mockRejectedValue(new Error("User cancelled photos app"));
		await expect(getRecoverablePhoto(CameraSource.Camera, envelope())).rejects.toThrow("cancelled");
		expect(disk).toBeUndefined(); expect(localStorage.getItem(CAMERA_RECOVERY_MARKER)).toBeNull();
	});
	it("does not open an external activity when durable storage fails", async () => {
		failWrite = true;
		await expect(getRecoverablePhoto(CameraSource.Camera, envelope())).rejects.toThrow();
		expect(native.photo).not.toHaveBeenCalled();
	});
	it("rejects callback-side storage setup errors without hanging launch or bootstrap", async () => {
		failTransaction = true;
		await expect(getRecoverablePhoto(CameraSource.Camera, envelope())).rejects.toThrow("missing object store");
		expect(native.photo).not.toHaveBeenCalled();
		await expect(bootstrapCameraRecovery()).resolves.toBeUndefined();
	});
	it("explicit exit clears the pending record without waiting for native return", async () => {
		let complete: (photo: unknown) => void = () => undefined;
		native.photo.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
		const pending = getRecoverablePhoto(CameraSource.Camera, envelope());
		await vi.waitFor(() => expect(native.photo).toHaveBeenCalled());
		await clearCameraRecovery();
		expect(disk).toBeUndefined(); expect(localStorage.getItem(CAMERA_RECOVERY_MARKER)).toBeNull();
		complete(success.data); await pending;
	});
	it("captures early retained events, ignores unrelated results and consumes once", async () => {
		seed(envelope());
		const boot = bootstrapCameraRecovery();
		native.listener?.({ ...success, pluginId: "Other" });
		expect(window.location.pathname).toBe("/dashboard");
		native.listener?.(success);
		await boot;
		expect(window.location.pathname).toBe("/meals/new/ai");
		expect(disk).toBeUndefined(); expect(localStorage.getItem(CAMERA_RECOVERY_MARKER)).toBeNull();
		window.history.replaceState(null, "", "/dashboard");
		await bootstrapCameraRecovery(); native.listener?.(success);
		expect(window.location.pathname).toBe("/dashboard");
	});
	it("recovers pre-camera work once when the native result is absent", async () => {
		vi.useFakeTimers(); seed(envelope());
		const boot = bootstrapCameraRecovery();
		await vi.advanceTimersByTimeAsync(CAMERA_RECOVERY_WAIT_MS);
		await boot;
		expect(window.location.pathname).toBe("/meals/new/ai");
		expect(takeRecoveredSmartCamera()?.images).toHaveLength(1);
		expect(disk).toBeUndefined();
	});
	it("still applies the consumed photo if disk deletion fails, and cannot replay it", async () => {
		seed(envelope());
		const boot = bootstrapCameraRecovery();
		await vi.waitFor(() => expect(native.listener).toBeTruthy());
		// Reading succeeds; only the delete transaction fails.
		failRemove = true;
		native.listener?.(success);
		await boot;
		expect(window.location.pathname).toBe("/meals/new/ai");
		expect(takeRecoveredSmartCamera()?.images).toHaveLength(2);
		expect(localStorage.getItem(CAMERA_RECOVERY_MARKER)).toBeNull();
		failRemove = false;
		window.history.replaceState(null, "", "/dashboard");
		await bootstrapCameraRecovery();
		expect(window.location.pathname).toBe("/dashboard"); expect(disk).toBeUndefined();
	});
	it("purges stale data and ignores orphan native photos", async () => {
		seed({ ...envelope(), createdAt: 0 });
		const boot = bootstrapCameraRecovery(); native.listener?.(success); await boot;
		expect(window.location.pathname).toBe("/dashboard"); expect(disk).toBeUndefined();
	});
});
