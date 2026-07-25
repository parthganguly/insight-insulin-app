import React from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { SafeArea } from "capacitor-plugin-safe-area";
import { defineCustomElements } from "@ionic/pwa-elements/loader";
import App from "./App";
import { INK_MEDIA_QUERY, applyRootAppearance, resolveAppearance, type AppAppearance } from "./utils/appearance";

declare global {
	interface Window {
		__APP_STARTUP_READY?: boolean;
		__APP_APPEARANCE?: AppAppearance;
	}
}

/** zustand persist key written by settingsStore.ts; read-only here. */
export const SETTINGS_STORAGE_KEY = "app-settings";

/** Bounded wait for the first native inset resolution. Must stay well below
 * the native 6 s splash fail-open so a hung plugin can never block boot. */
export const INITIAL_INSET_TIMEOUT_MS = 3000;

export const SAFE_AREA_SIDES = ["top", "right", "bottom", "left"] as const;

type SafeAreaSide = (typeof SAFE_AREA_SIDES)[number];
export type SafeAreaInsetValues = Record<SafeAreaSide, number>;

export type SafeAreaSource = {
	requery: () => Promise<boolean>;
	push: (insets: SafeAreaInsetValues) => void;
	/** Neutralizes the source so no in-flight or later response can write. */
	dispose: () => void;
};

/**
 * Bounded re-query ladder run once after native startup.
 *
 * An Android font-scale change relaunches MainActivity and reloads the
 * WebView, so bootstrap runs again while the recreated window's insets are not
 * yet attached and the plugin still answers bottom = 0. On SM-M356B / API 36
 * the plugin's own answer became correct between ~322 ms and ~512 ms of
 * document time, but nothing told the page: the run was stationary, so no
 * orientationchange, no resize, no resume, and the plugin emitted no
 * safeAreaChanged. Evidence: reports/ux/premium-redesign/j4-confirm/evidence/
 * rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1.json
 *
 * These delays re-read across that readiness window and then stop for good.
 * The ladder is a fixed, finite list — it always ends, and it deliberately
 * does not stop early on two equal readings, because the first two readings
 * after a relaunch are equal *and wrong*.
 */
export const INSET_SETTLE_DELAYS_MS = [150, 400, 800, 1500, 2500] as const;

/**
 * Reads the persisted darkMode tri-state from the zustand persist payload
 * ({"state":{"darkMode":boolean|null,...},"version":n}) without importing the
 * store, so no store side effects run during startup. Absent, corrupt, or
 * non-boolean values resolve to null (follow OS).
 */
export function readPersistedDarkMode(storage: Pick<Storage, "getItem"> | null | undefined): boolean | null {
	try {
		const raw = storage?.getItem(SETTINGS_STORAGE_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		const state = (parsed as { state?: { darkMode?: unknown } } | null)?.state;
		return typeof state?.darkMode === "boolean" ? state.darkMode : null;
	} catch {
		return null;
	}
}

/**
 * Re-affirms the appearance the index.html pre-paint bootstrap applied, using
 * the same tri-state law: stored true → ink, stored false → paper,
 * null/corrupt → OS. Idempotent with the inline script, so no visual cut.
 */
export function bootstrapAppearance(root: HTMLElement = document.documentElement): AppAppearance {
	let storage: Pick<Storage, "getItem"> | null = null;
	try {
		storage = window.localStorage;
	} catch {
		storage = null;
	}

	let prefersInk = false;
	try {
		prefersInk = typeof window.matchMedia === "function" && window.matchMedia(INK_MEDIA_QUERY).matches;
	} catch {
		prefersInk = false;
	}

	const appearance = resolveAppearance({ darkMode: readPersistedDarkMode(storage), prefersInk });
	applyRootAppearance(root, appearance);
	window.__APP_APPEARANCE = appearance;
	return appearance;
}

function normalizeInsets(insets: SafeAreaInsetValues): SafeAreaInsetValues {
	const normalized = {} as SafeAreaInsetValues;
	for (const side of SAFE_AREA_SIDES) {
		const value = insets[side];
		normalized[side] = Number.isFinite(value) && value > 0 ? value : 0;
	}
	return normalized;
}

export function applyAppSafeArea(root: HTMLElement, insets: SafeAreaInsetValues): void {
	const normalized = normalizeInsets(insets);
	for (const side of SAFE_AREA_SIDES) {
		root.style.setProperty(`--app-safe-area-${side}`, `${normalized[side]}px`);
	}
}

/**
 * The single application-level safe-area source. Every write goes through a
 * monotonically increasing token so a stale asynchronous response can never
 * overwrite a newer rotation/resume value; pushed native events always rank
 * newest. Ionic consumes these via the one-time --ion-safe-area-* mapping in
 * variables.css.
 */
export function createSafeAreaSource(root: HTMLElement, getInsets: () => Promise<{ insets: SafeAreaInsetValues }>): SafeAreaSource {
	let issued = 0;
	let applied = 0;
	let disposed = false;
	let lastApplied: SafeAreaInsetValues | null = null;

	/** Touches the root only when a side actually differs, so the settle
	 * ladder's repeat reads cost nothing once the insets have stabilized. */
	const commit = (insets: SafeAreaInsetValues): void => {
		const normalized = normalizeInsets(insets);
		const previous = lastApplied;
		if (previous && SAFE_AREA_SIDES.every((side) => previous[side] === normalized[side])) return;
		lastApplied = normalized;
		applyAppSafeArea(root, normalized);
	};

	const requery = async (): Promise<boolean> => {
		if (disposed) return false;
		const token = ++issued;
		try {
			const { insets } = await getInsets();
			if (disposed || token <= applied) return false;
			applied = token;
			commit(insets);
			return true;
		} catch {
			return false;
		}
	};

	const push = (insets: SafeAreaInsetValues): void => {
		if (disposed) return;
		applied = ++issued;
		commit(insets);
	};

	const dispose = (): void => {
		disposed = true;
	};

	return { requery, push, dispose };
}

/**
 * Schedules the bounded settle ladder. Returns a canceller that clears every
 * outstanding timer; nothing reschedules, so once the last delay elapses no
 * timer remains armed.
 */
export function startInsetSettleWatch(source: SafeAreaSource, delays: readonly number[] = INSET_SETTLE_DELAYS_MS, win: Window = window): () => void {
	const timers = delays.map((delay) =>
		win.setTimeout(() => {
			void source.requery();
		}, delay)
	);

	return () => {
		for (const timer of timers) win.clearTimeout(timer);
	};
}

export async function resolveInsetsBeforeRender(source: SafeAreaSource, timeoutMs: number = INITIAL_INSET_TIMEOUT_MS): Promise<boolean> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<boolean>((resolve) => {
		timer = setTimeout(() => resolve(false), timeoutMs);
	});
	const resolved = await Promise.race([source.requery(), timeout]);
	clearTimeout(timer);
	return resolved;
}

/**
 * Splash readiness: called after the initial route shell commits. A stable
 * frame is scheduled with a double requestAnimationFrame before the native
 * splash hold (MainActivity polls window.__APP_STARTUP_READY) is released.
 */
export function markShellReady(win: Window = window): void {
	win.requestAnimationFrame(() => {
		win.requestAnimationFrame(() => {
			win.__APP_STARTUP_READY = true;
		});
	});
}

function subscribeToInsetChanges(source: SafeAreaSource): void {
	void SafeArea.addListener("safeAreaChanged", ({ insets }) => {
		source.push(insets);
	});
	void CapacitorApp.addListener("resume", () => {
		void source.requery();
	});
	window.addEventListener("resize", () => {
		void source.requery();
	});
	window.addEventListener("orientationchange", () => {
		void source.requery();
	});
}

export async function bootstrap(container: HTMLElement): Promise<() => void> {
	bootstrapAppearance();
	defineCustomElements(window);

	const teardowns: Array<() => void> = [];

	if (Capacitor.isNativePlatform()) {
		// Native insets must be resolved before React renders; browser/PWA
		// keeps the CSS env(safe-area-inset-*, 0px) fallback in variables.css.
		const source = createSafeAreaSource(document.documentElement, () => SafeArea.getSafeAreaInsets());
		await resolveInsetsBeforeRender(source);
		subscribeToInsetChanges(source);
		// The first reading after an Android configuration relaunch can precede
		// the window's insets; nothing else re-reads while the device is still.
		teardowns.push(startInsetSettleWatch(source));
		teardowns.push(() => source.dispose());
	}

	const root = createRoot(container);
	root.render(<App onShellReady={() => markShellReady()} />);

	return () => {
		for (const teardown of teardowns) teardown();
	};
}

const container = document.getElementById("root");
if (container) {
	void bootstrap(container);
}
