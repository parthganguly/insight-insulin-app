import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

// Exercises the real index.html inline bootstrap script so the pre-paint
// appearance law (stored true → ink, stored false → paper, null/absent/
// corrupt → OS) is tested against the exact code the WebView executes.
// vitest runs with cwd = frontend/.

const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const inlineScript = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";

const PAPER_RGB = "rgb(250, 250, 248)"; // tokens.css --paper (paper), #fafaf8
const INK_RGB = "rgb(20, 22, 25)"; // tokens.css --paper (ink), #141619

const stubMatchMedia = (matches: boolean): void => {
	window.matchMedia = ((query: string) =>
		({
			matches,
			media: query,
			onchange: null,
			addListener: () => undefined,
			removeListener: () => undefined,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			dispatchEvent: () => false,
		}) as MediaQueryList) as typeof window.matchMedia;
};

const runInlineBootstrap = (): void => {
	window.eval(inlineScript);
};

describe("index.html startup appearance bootstrap", () => {
	beforeEach(() => {
		window.localStorage.clear();
		const root = document.documentElement;
		root.className = "";
		root.removeAttribute("style");
		delete window.__APP_APPEARANCE;
		delete window.__APP_STARTUP_READY;
	});

	it("exists and runs before the application bundle", () => {
		expect(inlineScript).not.toBe("");
		expect(indexHtml.indexOf(inlineScript)).toBeLessThan(indexHtml.indexOf('src="/src/main.tsx"'));
	});

	it("applies ink before boot when the persisted darkMode is true, even on a light OS", () => {
		window.localStorage.setItem("app-settings", JSON.stringify({ state: { darkMode: true }, version: 0 }));
		stubMatchMedia(false);
		runInlineBootstrap();
		expect(document.documentElement.classList.contains("app-appearance-ink")).toBe(true);
		expect(document.documentElement.classList.contains("app-appearance-paper")).toBe(false);
		expect(document.documentElement.style.colorScheme).toBe("dark");
		expect(document.documentElement.style.backgroundColor).toBe(INK_RGB);
		expect(window.__APP_APPEARANCE).toBe("ink");
	});

	it("applies paper before boot when the persisted darkMode is false, even on a dark OS", () => {
		window.localStorage.setItem("app-settings", JSON.stringify({ state: { darkMode: false }, version: 0 }));
		stubMatchMedia(true);
		runInlineBootstrap();
		expect(document.documentElement.classList.contains("app-appearance-paper")).toBe(true);
		expect(document.documentElement.classList.contains("app-appearance-ink")).toBe(false);
		expect(document.documentElement.style.colorScheme).toBe("light");
		expect(document.documentElement.style.backgroundColor).toBe(PAPER_RGB);
		expect(window.__APP_APPEARANCE).toBe("paper");
	});

	it("follows the OS when no preference is persisted", () => {
		stubMatchMedia(true);
		runInlineBootstrap();
		expect(document.documentElement.classList.contains("app-appearance-ink")).toBe(true);

		document.documentElement.className = "";
		stubMatchMedia(false);
		runInlineBootstrap();
		expect(document.documentElement.classList.contains("app-appearance-paper")).toBe(true);
	});

	it("follows the OS when the persisted payload is corrupt", () => {
		window.localStorage.setItem("app-settings", "{not json");
		stubMatchMedia(true);
		runInlineBootstrap();
		expect(document.documentElement.classList.contains("app-appearance-ink")).toBe(true);
		expect(window.__APP_APPEARANCE).toBe("ink");
	});

	it("follows the OS when the persisted darkMode is not a boolean", () => {
		window.localStorage.setItem("app-settings", JSON.stringify({ state: { darkMode: "yes" }, version: 0 }));
		stubMatchMedia(false);
		runInlineBootstrap();
		expect(document.documentElement.classList.contains("app-appearance-paper")).toBe(true);
	});

	it("initializes the readiness flag to false so the native splash stays held", () => {
		stubMatchMedia(false);
		runInlineBootstrap();
		expect(window.__APP_STARTUP_READY).toBe(false);
	});

	it("never paints pure black or pure white as the startup surface", () => {
		stubMatchMedia(true);
		runInlineBootstrap();
		const dark = document.documentElement.style.backgroundColor;
		expect(dark).not.toBe("rgb(0, 0, 0)");
		expect(dark).toBe(INK_RGB);

		document.documentElement.removeAttribute("style");
		document.documentElement.className = "";
		stubMatchMedia(false);
		runInlineBootstrap();
		const light = document.documentElement.style.backgroundColor;
		expect(light).not.toBe("rgb(255, 255, 255)");
		expect(light).toBe(PAPER_RGB);
	});
});
