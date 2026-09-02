import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "./settingsStore";

describe("settings persistence v1", () => {
	beforeEach(() => {
		window.localStorage.clear();
		useSettingsStore.setState({ darkMode: null });
	});

	it.each([true, null])("preserves %s appearance and removes legacy body values during v0 hydration", async (darkMode) => {
		window.localStorage.setItem("app-settings", JSON.stringify({
			state: { darkMode, gender: "female", age: 30, weight: 70, height: 175, activityLevel: "sedentary" },
			version: 0,
		}));

		await useSettingsStore.persist.rehydrate();

		expect(useSettingsStore.getState().darkMode).toBe(darkMode);
		expect(JSON.parse(window.localStorage.getItem("app-settings") ?? "")).toEqual({ state: { darkMode }, version: 1 });
	});

	it.each([
		["malformed JSON", "{not json"],
		["partial state", JSON.stringify({ state: { gender: "male" }, version: 0 })],
	])("boots with System appearance for %s", async (_label, payload) => {
		window.localStorage.setItem("app-settings", payload);

		await expect(useSettingsStore.persist.rehydrate()).resolves.toBeUndefined();

		expect(useSettingsStore.getState().darkMode).toBeNull();
	});
});
