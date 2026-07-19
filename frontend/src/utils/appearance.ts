export type AppAppearance = "paper" | "ink";
export type DarkModePreference = boolean | null;

export const PAPER_APPEARANCE_CLASS = "app-appearance-paper";
export const INK_APPEARANCE_CLASS = "app-appearance-ink";
export const INK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

type AppearanceInputs = {
	darkMode: unknown;
	prefersInk: boolean;
};

export const normalizeDarkModePreference = (value: unknown): DarkModePreference => (typeof value === "boolean" ? value : null);

export const resolveAppearance = ({ darkMode, prefersInk }: AppearanceInputs): AppAppearance => {
	const explicitPreference = normalizeDarkModePreference(darkMode);
	if (explicitPreference !== null) {
		return explicitPreference ? "ink" : "paper";
	}
	return prefersInk ? "ink" : "paper";
};

export const applyRootAppearance = (root: HTMLElement, appearance: AppAppearance): void => {
	root.classList.toggle(PAPER_APPEARANCE_CLASS, appearance === "paper");
	root.classList.toggle(INK_APPEARANCE_CLASS, appearance === "ink");
	root.style.colorScheme = appearance === "ink" ? "dark" : "light";
};
