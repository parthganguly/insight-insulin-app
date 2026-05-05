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
	darkMode: boolean;
	toggleDarkMode: (value: boolean) => void;
	gender: Gender | null;
	setGender: (gender: Gender) => void;
	age: number | null;
	setAge: (age: number) => void;
	weight: number | null;
	setWeight: (weight: number) => void;
	height: number | null;
	setHeight: (height: number) => void;
	activityLevel: ActivityLevel | null;
	setActivityLevel: (level: ActivityLevel) => void;
};

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => ({
			darkMode: true,
			toggleDarkMode: (value) => {
				set({ darkMode: value });
				document.documentElement.classList.toggle("ion-palette-dark", value);
			},
			gender: null,
			setGender: (gender: Gender) => set({ gender }),
			age: null,
			setAge: (age: number) => set({ age }),
			weight: null,
			setWeight: (weight: number) => set({ weight }),
			height: null,
			setHeight: (height: number) => set({ height }),
			activityLevel: null,
			setActivityLevel: (level: ActivityLevel) => set({ activityLevel: level }),
		}),
		{
			name: "app-settings",
		}
	)
);

export { Gender, ActivityLevel };
