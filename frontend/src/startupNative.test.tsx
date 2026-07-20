import { describe, expect, it, vi } from "vitest";

// Native startup path: insets must be resolved and applied through the single
// application-level source before React renders, and the central
// safeAreaChanged/resume subscriptions must be registered.

const getSafeAreaInsets = vi.fn(async () => ({ insets: { top: 48, right: 0, bottom: 34, left: 0 } }));
const safeAreaAddListener = vi.fn(async () => ({ remove: async () => undefined }));
const appAddListener = vi.fn(async () => ({ remove: async () => undefined }));

vi.mock("@capacitor/core", () => ({
	Capacitor: { isNativePlatform: () => true },
}));

vi.mock("capacitor-plugin-safe-area", () => ({
	SafeArea: {
		getSafeAreaInsets: (...args: unknown[]) => getSafeAreaInsets(...(args as [])),
		addListener: (...args: unknown[]) => safeAreaAddListener(...(args as [])),
	},
}));

vi.mock("@capacitor/app", () => ({
	App: {
		addListener: (...args: unknown[]) => appAddListener(...(args as [])),
	},
}));

vi.mock("@capacitor/status-bar", () => ({
	StatusBar: { setStyle: vi.fn(async () => undefined) },
	Style: { Dark: "DARK", Light: "LIGHT" },
}));

describe("native startup bootstrap", () => {
	it("applies resolved insets to the root before rendering and subscribes centrally", async () => {
		const { bootstrap } = await import("./main");

		const container = document.createElement("div");
		document.body.appendChild(container);

		const root = document.documentElement;
		root.style.removeProperty("--app-safe-area-top");
		root.style.removeProperty("--app-safe-area-bottom");

		await bootstrap(container);

		expect(getSafeAreaInsets).toHaveBeenCalled();
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("48px");
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("34px");
		expect(safeAreaAddListener).toHaveBeenCalledWith("safeAreaChanged", expect.any(Function));
		expect(appAddListener).toHaveBeenCalledWith("resume", expect.any(Function));
	});
});
