import { describe, expect, it, vi } from "vitest";

// Browser/PWA startup path: the native safe-area source, its subscriptions and
// the post-relaunch settle ladder are all confined to the native branch, so the
// browser keeps the CSS env(safe-area-inset-*, 0px) fallback in variables.css
// untouched. Mirrors the isolation of startupNative.test.tsx.

const getSafeAreaInsets = vi.fn(async () => ({ insets: { top: 48, right: 0, bottom: 34, left: 0 } }));
const safeAreaAddListener = vi.fn(async () => ({ remove: async () => undefined }));
const appAddListener = vi.fn(async () => ({ remove: async () => undefined }));
const defineCustomElements = vi.hoisted(() => vi.fn());

vi.mock("./App", () => ({ default: () => null }));
vi.mock("@ionic/pwa-elements/loader", () => ({ defineCustomElements }));

vi.mock("@capacitor/core", () => ({
	Capacitor: { isNativePlatform: () => false },
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

describe("browser startup bootstrap", () => {
	it("never queries the plugin, subscribes, or overrides the CSS env() fallback", async () => {
		const { bootstrap } = await import("./main");

		const container = document.createElement("div");
		document.body.appendChild(container);

		const root = document.documentElement;
		for (const side of ["top", "right", "bottom", "left"]) root.style.removeProperty(`--app-safe-area-${side}`);

		const teardown = await bootstrap(container);

		expect(defineCustomElements).toHaveBeenCalledWith(window);
		expect(getSafeAreaInsets).not.toHaveBeenCalled();
		expect(safeAreaAddListener).not.toHaveBeenCalled();
		expect(appAddListener).not.toHaveBeenCalled();

		// Nothing inline on the root: variables.css keeps env(safe-area-inset-*).
		for (const side of ["top", "right", "bottom", "left"]) {
			expect(root.style.getPropertyValue(`--app-safe-area-${side}`)).toBe("");
		}

		// The settle ladder is native-only, so teardown has nothing to cancel and
		// no later timer can write.
		teardown();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(getSafeAreaInsets).not.toHaveBeenCalled();
	});
});
