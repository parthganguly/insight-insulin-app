// src/stores/settingsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

enum Gender {
	Male = "male",
	Female = "female",
}

enum ActivityLevel {
	Sedentary = "sedentary",
	Light = "light",
	Moderate = "moderate",
	Active = "active",
	VeryActive = "very_active",
}

type SettingsState = {
	darkMode: boolean | null;
	toggleDarkMode: (value: boolean | null) => void;
};

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => ({
			darkMode: null,
			toggleDarkMode: (value) => set({ darkMode: value }),
		}),
		{
			name: "app-settings",
			version: 1,
			migrate: (persistedState) => {
				const darkMode = (persistedState as { darkMode?: unknown } | null)?.darkMode;
				return { darkMode: typeof darkMode === "boolean" ? darkMode : null };
			},
			partialize: (state) => ({ darkMode: state.darkMode }),
		}
	)
);

export { Gender, ActivityLevel };
