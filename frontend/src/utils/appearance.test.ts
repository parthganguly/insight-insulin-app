import { describe, expect, it } from "vitest";

import {
	applyRootAppearance,
	INK_APPEARANCE_CLASS,
	normalizeDarkModePreference,
	PAPER_APPEARANCE_CLASS,
	resolveAppearance,
} from "./appearance";

describe("appearance", () => {
	it("uses paper when darkMode is null and the system preference is light", () => {
		expect(resolveAppearance({ darkMode: null, prefersInk: false })).toBe("paper");
	});

	it("uses ink when darkMode is null and the system preference is dark", () => {
		expect(resolveAppearance({ darkMode: null, prefersInk: true })).toBe("ink");
	});

	it("lets true force ink while the system preference is light", () => {
		expect(resolveAppearance({ darkMode: true, prefersInk: false })).toBe("ink");
	});

	it("lets false force paper while the system preference is dark", () => {
		expect(resolveAppearance({ darkMode: false, prefersInk: true })).toBe("paper");
	});

	it("tracks system preference changes while darkMode is null", () => {
		expect(resolveAppearance({ darkMode: null, prefersInk: false })).toBe("paper");
		expect(resolveAppearance({ darkMode: null, prefersInk: true })).toBe("ink");
	});

	it("ignores system preference changes while an explicit override exists", () => {
		expect(resolveAppearance({ darkMode: true, prefersInk: false })).toBe("ink");
		expect(resolveAppearance({ darkMode: true, prefersInk: true })).toBe("ink");
		expect(resolveAppearance({ darkMode: false, prefersInk: false })).toBe("paper");
		expect(resolveAppearance({ darkMode: false, prefersInk: true })).toBe("paper");
	});

	it("retains a previously persisted true value as an explicit ink override", () => {
		expect(normalizeDarkModePreference(true)).toBe(true);
		expect(resolveAppearance({ darkMode: true, prefersInk: false })).toBe("ink");
	});

	it("retains a previously persisted false value as an explicit paper override", () => {
		expect(normalizeDarkModePreference(false)).toBe(false);
		expect(resolveAppearance({ darkMode: false, prefersInk: true })).toBe("paper");
	});

	it("applies mutually exclusive root classes and the matching color scheme", () => {
		const root = document.createElement("html");

		applyRootAppearance(root, "ink");
		expect(root).toHaveClass(INK_APPEARANCE_CLASS);
		expect(root).not.toHaveClass(PAPER_APPEARANCE_CLASS);
		expect(root.style.colorScheme).toBe("dark");

		applyRootAppearance(root, "paper");
		expect(root).toHaveClass(PAPER_APPEARANCE_CLASS);
		expect(root).not.toHaveClass(INK_APPEARANCE_CLASS);
		expect(root.style.colorScheme).toBe("light");
	});

	it("treats malformed or absent persisted values as null and follows the system", () => {
		expect(normalizeDarkModePreference(undefined)).toBeNull();
		expect(normalizeDarkModePreference(null)).toBeNull();
		expect(normalizeDarkModePreference("true")).toBeNull();
		expect(normalizeDarkModePreference(1)).toBeNull();
		expect(resolveAppearance({ darkMode: undefined, prefersInk: false })).toBe("paper");
		expect(resolveAppearance({ darkMode: "malformed", prefersInk: true })).toBe("ink");
	});
});
