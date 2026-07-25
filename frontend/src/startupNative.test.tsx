import { afterEach, describe, expect, it, vi } from "vitest";

// Native startup path: insets must be resolved and applied through the single
// application-level source before React renders, and the central
// safeAreaChanged/resume subscriptions must be registered.

const settledInsets = async () => ({ insets: { top: 48, right: 0, bottom: 34, left: 0 } });
const getSafeAreaInsets = vi.fn(settledInsets);
const safeAreaAddListener = vi.fn(async () => ({ remove: async () => undefined }));
const appAddListener = vi.fn(async () => ({ remove: async () => undefined }));
const defineCustomElements = vi.hoisted(() => vi.fn());

// This integration test exercises the native bootstrap boundary, not the
// application tree or PWA camera elements. Loading those real dependencies
// adds unrelated cold-transform work, backend hydration, and a queued
// `appload` event that can fire after jsdom teardown.
vi.mock("./App", () => ({ default: () => null }));
vi.mock("@ionic/pwa-elements/loader", () => ({ defineCustomElements }));

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

const mountContainer = (): HTMLElement => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	return container;
};

/** Lets a listener-triggered requery resolve; the ladder delays are all ≥150ms. */
const flushRequery = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const clearRootInsets = (): HTMLElement => {
	const root = document.documentElement;
	for (const side of ["top", "right", "bottom", "left"]) root.style.removeProperty(`--app-safe-area-${side}`);
	return root;
};

describe("native startup bootstrap", () => {
	afterEach(() => {
		vi.useRealTimers();
		getSafeAreaInsets.mockReset();
		getSafeAreaInsets.mockImplementation(settledInsets);
	});

	it("applies resolved insets to the root before rendering and subscribes centrally", async () => {
		const { bootstrap } = await import("./main");

		const container = mountContainer();
		const root = clearRootInsets();

		const teardown = await bootstrap(container);

		expect(defineCustomElements).toHaveBeenCalledWith(window);
		expect(getSafeAreaInsets).toHaveBeenCalled();
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("48px");
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("34px");
		expect(safeAreaAddListener).toHaveBeenCalledWith("safeAreaChanged", expect.any(Function));
		expect(appAddListener).toHaveBeenCalledWith("resume", expect.any(Function));

		teardown();
	});

	it("recovers the Android font-scale relaunch without any orientation, resize, or resume event", async () => {
		// Device reproduction (SM-M356B / API 36): the relaunched WebView reads
		// bottom 0 at startup, the plugin answers 48 a few hundred ms later, and
		// nothing else ever fires while the phone lies still.
		const { bootstrap } = await import("./main");
		vi.useFakeTimers();

		let reads = 0;
		getSafeAreaInsets.mockImplementation(async () => {
			reads += 1;
			return { insets: { top: 38, right: 0, bottom: reads === 1 ? 0 : 48, left: 0 } };
		});

		const container = mountContainer();
		const root = clearRootInsets();

		const teardown = await bootstrap(container);
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("0px");

		await vi.advanceTimersByTimeAsync(2500);

		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("48px");
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("38px");
		// No timer may outlive the ladder, and no event was dispatched above.
		expect(vi.getTimerCount()).toBe(0);

		teardown();
	});

	it("still re-queries on resize and orientationchange", async () => {
		const { bootstrap } = await import("./main");

		const container = mountContainer();
		const root = clearRootInsets();
		const teardown = await bootstrap(container);

		getSafeAreaInsets.mockImplementation(async () => ({ insets: { top: 30, right: 48, bottom: 0, left: 34 } }));

		window.dispatchEvent(new Event("resize"));
		await flushRequery();
		expect(root.style.getPropertyValue("--app-safe-area-right")).toBe("48px");

		getSafeAreaInsets.mockImplementation(async () => ({ insets: { top: 38, right: 0, bottom: 48, left: 0 } }));
		window.dispatchEvent(new Event("orientationchange"));
		await flushRequery();
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("48px");

		teardown();
	});

	it("stops honouring inset updates after teardown", async () => {
		const { bootstrap } = await import("./main");

		const container = mountContainer();
		const root = clearRootInsets();
		const teardown = await bootstrap(container);

		teardown();
		getSafeAreaInsets.mockImplementation(async () => ({ insets: { top: 99, right: 99, bottom: 99, left: 99 } }));
		window.dispatchEvent(new Event("resize"));
		await flushRequery();

		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("48px");
	});
});
