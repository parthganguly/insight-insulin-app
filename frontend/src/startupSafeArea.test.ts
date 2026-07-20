import { afterEach, describe, expect, it, vi } from "vitest";
import { INITIAL_INSET_TIMEOUT_MS, SETTINGS_STORAGE_KEY, applyAppSafeArea, bootstrapAppearance, createSafeAreaSource, markShellReady, readPersistedDarkMode, resolveInsetsBeforeRender, type SafeAreaInsetValues } from "./main";

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
