import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INITIAL_INSET_TIMEOUT_MS, INSET_SETTLE_DELAYS_MS, SAFE_AREA_SIDES, SETTINGS_STORAGE_KEY, applyAppSafeArea, bootstrapAppearance, createSafeAreaSource, markShellReady, readPersistedDarkMode, resolveInsetsBeforeRender, startInsetSettleWatch, type SafeAreaInsetValues } from "./main";

const insets = (top: number, right = 0, bottom = 0, left = 0): SafeAreaInsetValues => ({ top, right, bottom, left });

const freshRoot = (): HTMLElement => document.createElement("div");

describe("persisted darkMode reader", () => {
	const storageWith = (value: string | null): Pick<Storage, "getItem"> => ({ getItem: () => value });

	it("reads the zustand persist payload tri-state", () => {
		expect(readPersistedDarkMode(storageWith(JSON.stringify({ state: { darkMode: true }, version: 0 })))).toBe(true);
		expect(readPersistedDarkMode(storageWith(JSON.stringify({ state: { darkMode: false }, version: 0 })))).toBe(false);
		expect(readPersistedDarkMode(storageWith(JSON.stringify({ state: { darkMode: null }, version: 0 })))).toBeNull();
	});

	it("returns null for absent, corrupt, unreadable, or non-boolean payloads", () => {
		expect(readPersistedDarkMode(storageWith(null))).toBeNull();
		expect(readPersistedDarkMode(storageWith("{corrupt"))).toBeNull();
		expect(readPersistedDarkMode(storageWith(JSON.stringify({ state: { darkMode: "yes" } })))).toBeNull();
		expect(readPersistedDarkMode(storageWith(JSON.stringify({ version: 0 })))).toBeNull();
		expect(readPersistedDarkMode(null)).toBeNull();
		expect(
			readPersistedDarkMode({
				getItem: () => {
					throw new Error("storage unreadable");
				},
			})
		).toBeNull();
	});
});

describe("bootstrap appearance re-affirmation", () => {
	afterEach(() => {
		window.localStorage.clear();
	});

	it("applies stored ink before render regardless of the OS scheme", () => {
		window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ state: { darkMode: true }, version: 0 }));
		const root = freshRoot();
		expect(bootstrapAppearance(root)).toBe("ink");
		expect(root.classList.contains("app-appearance-ink")).toBe(true);
		expect(root.style.colorScheme).toBe("dark");
		expect(window.__APP_APPEARANCE).toBe("ink");
	});

	it("applies stored paper before render regardless of the OS scheme", () => {
		window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ state: { darkMode: false }, version: 0 }));
		const root = freshRoot();
		expect(bootstrapAppearance(root)).toBe("paper");
		expect(root.classList.contains("app-appearance-paper")).toBe(true);
		expect(root.style.colorScheme).toBe("light");
	});
});

describe("centralized safe-area source", () => {
	it("writes all four --app-safe-area-* variables on the root", () => {
		const root = freshRoot();
		applyAppSafeArea(root, insets(48, 1, 34, 2));
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("48px");
		expect(root.style.getPropertyValue("--app-safe-area-right")).toBe("1px");
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("34px");
		expect(root.style.getPropertyValue("--app-safe-area-left")).toBe("2px");
	});

	it("clamps negative or non-finite inset values to 0px", () => {
		const root = freshRoot();
		applyAppSafeArea(root, insets(-5, Number.NaN, Number.POSITIVE_INFINITY, 0));
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("0px");
		expect(root.style.getPropertyValue("--app-safe-area-right")).toBe("0px");
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("0px");
		expect(root.style.getPropertyValue("--app-safe-area-left")).toBe("0px");
	});

	it("resolves and applies insets through requery", async () => {
		const root = freshRoot();
		const source = createSafeAreaSource(root, async () => ({ insets: insets(48, 0, 34, 0) }));
		await expect(source.requery()).resolves.toBe(true);
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("48px");
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("34px");
	});

	it("never lets a stale asynchronous response overwrite a newer pushed value", async () => {
		const root = freshRoot();
		let release: ((value: { insets: SafeAreaInsetValues }) => void) | undefined;
		const source = createSafeAreaSource(
			root,
			() =>
				new Promise((resolve) => {
					release = resolve;
				})
		);

		const stale = source.requery();
		// A rotation event arrives after the pull was issued.
		source.push(insets(100));
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("100px");

		release?.({ insets: insets(48) });
		await expect(stale).resolves.toBe(false);
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("100px");
	});

	it("never lets an older requery overwrite a newer requery", async () => {
		const root = freshRoot();
		const pending: Array<(value: { insets: SafeAreaInsetValues }) => void> = [];
		const source = createSafeAreaSource(
			root,
			() =>
				new Promise((resolve) => {
					pending.push(resolve);
				})
		);

		const first = source.requery();
		const second = source.requery();

		// The newer request resolves first (portrait → landscape settled).
		pending[1]({ insets: insets(0, 60, 0, 0) });
		await expect(second).resolves.toBe(true);
		// The stale response arrives late and must be discarded.
		pending[0]({ insets: insets(48) });
		await expect(first).resolves.toBe(false);

		expect(root.style.getPropertyValue("--app-safe-area-right")).toBe("60px");
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("0px");
	});

	it("swallows plugin failures without writing anything", async () => {
		const root = freshRoot();
		const source = createSafeAreaSource(root, async () => {
			throw new Error("plugin unavailable");
		});
		await expect(source.requery()).resolves.toBe(false);
		expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("");
	});
});

describe("bounded startup waits", () => {
	it("gives up on the initial inset resolution after the bounded timeout", async () => {
		vi.useFakeTimers();
		try {
			const root = freshRoot();
			const source = createSafeAreaSource(root, () => new Promise(() => undefined));
			const resolution = resolveInsetsBeforeRender(source);
			await vi.advanceTimersByTimeAsync(INITIAL_INSET_TIMEOUT_MS);
			await expect(resolution).resolves.toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("keeps the JS-side inset wait strictly below the native 6 s splash fail-open", () => {
		expect(INITIAL_INSET_TIMEOUT_MS).toBeLessThan(6000);
	});
});

describe("post-relaunch inset settle ladder", () => {
	const LADDER_SPAN_MS = Math.max(...INSET_SETTLE_DELAYS_MS);

	/**
	 * Reproduces the observed SM-M356B / API 36 font-scale relaunch: the plugin
	 * answers bottom 0 for the first reads of the reloaded document and the real
	 * inset afterwards. No orientationchange, resize, pause/resume, or user
	 * interaction ever occurs in these tests — the ladder is the only mechanism
	 * that can recover the value, which is exactly what the device showed.
	 */
	const relaunchPlugin = (zeroReads: number) => {
		let calls = 0;
		return {
			calls: () => calls,
			getInsets: async (): Promise<{ insets: SafeAreaInsetValues }> => {
				calls += 1;
				return { insets: calls <= zeroReads ? insets(38, 0, 0, 0) : insets(38, 0, 48, 0) };
			},
		};
	};

	it("adopts a later non-zero plugin result with no orientation, resize, resume, or interaction", async () => {
		vi.useFakeTimers();
		try {
			const root = freshRoot();
			const plugin = relaunchPlugin(1);
			const source = createSafeAreaSource(root, plugin.getInsets);

			// The startup read lands before the relaunched window's insets attach.
			await source.requery();
			expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("0px");

			startInsetSettleWatch(source);
			await vi.advanceTimersByTimeAsync(LADDER_SPAN_MS);

			expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("48px");
			expect(root.style.getPropertyValue("--app-safe-area-top")).toBe("38px");
		} finally {
			vi.useRealTimers();
		}
	});

	it("stops writing once the insets stabilize and arms no timer past the ladder", async () => {
		vi.useFakeTimers();
		try {
			const root = freshRoot();
			const plugin = relaunchPlugin(1);
			const source = createSafeAreaSource(root, plugin.getInsets);
			await source.requery();

			const setProperty = vi.spyOn(root.style, "setProperty");
			startInsetSettleWatch(source);
			await vi.advanceTimersByTimeAsync(LADDER_SPAN_MS);

			// One four-side write: the step that first saw 48px. Every later step
			// reads the same value and touches nothing.
			expect(setProperty).toHaveBeenCalledTimes(SAFE_AREA_SIDES.length);
			expect(plugin.calls()).toBe(1 + INSET_SETTLE_DELAYS_MS.length);
			expect(vi.getTimerCount()).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});

	it("reads and writes nothing more once the watch is cancelled", async () => {
		vi.useFakeTimers();
		try {
			const root = freshRoot();
			const plugin = relaunchPlugin(1);
			const source = createSafeAreaSource(root, plugin.getInsets);
			await source.requery();

			const cancel = startInsetSettleWatch(source);
			cancel();
			await vi.advanceTimersByTimeAsync(LADDER_SPAN_MS);

			expect(plugin.calls()).toBe(1);
			expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("0px");
			expect(vi.getTimerCount()).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});

	it("discards an in-flight response that resolves after disposal", async () => {
		const root = freshRoot();
		let release: ((value: { insets: SafeAreaInsetValues }) => void) | undefined;
		const source = createSafeAreaSource(
			root,
			() =>
				new Promise((resolve) => {
					release = resolve;
				})
		);

		const pending = source.requery();
		source.dispose();
		release?.({ insets: insets(38, 0, 48, 0) });

		await expect(pending).resolves.toBe(false);
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("");
	});

	it("ignores a pushed native event after disposal", () => {
		const root = freshRoot();
		const source = createSafeAreaSource(root, async () => ({ insets: insets(0) }));
		source.dispose();
		source.push(insets(38, 0, 48, 0));
		expect(root.style.getPropertyValue("--app-safe-area-bottom")).toBe("");
	});

	it("keeps the ladder finite and spanning the observed readiness window", () => {
		// The device showed the plugin still wrong at ~322 ms of document time
		// and correct by ~512 ms, so the ladder must straddle that and end.
		expect(INSET_SETTLE_DELAYS_MS.length).toBeGreaterThan(1);
		expect(INSET_SETTLE_DELAYS_MS.some((delay) => delay <= 400)).toBe(true);
		expect(INSET_SETTLE_DELAYS_MS.some((delay) => delay >= 800)).toBe(true);
		expect(LADDER_SPAN_MS).toBeLessThanOrEqual(3000);
	});

	it("leaves the Ionic variables mapped to the app source it just corrected", () => {
		// jsdom does not resolve var() in custom properties, so the mapping is
		// asserted structurally: --ion-safe-area-* is declared only as
		// var(--app-safe-area-*), which the ladder writes.
		const variablesCss = readFileSync(resolve(process.cwd(), "src/theme/variables.css"), "utf8");
		for (const side of SAFE_AREA_SIDES) {
			expect(variablesCss).toContain(`--ion-safe-area-${side}: var(--app-safe-area-${side})`);
		}
	});
});

describe("splash readiness signal", () => {
	it("marks startup ready only after a stable second frame", () => {
		const frames: FrameRequestCallback[] = [];
		const win = {
			requestAnimationFrame: (callback: FrameRequestCallback) => {
				frames.push(callback);
				return frames.length;
			},
		} as unknown as Window;

		markShellReady(win);
		expect(win.__APP_STARTUP_READY).toBeUndefined();

		frames.shift()?.(0);
		expect(win.__APP_STARTUP_READY).toBeUndefined();

		frames.shift()?.(0);
		expect(win.__APP_STARTUP_READY).toBe(true);
	});
});
