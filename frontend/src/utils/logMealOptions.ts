export type LogMealOptionId = "photo" | "manual" | "previous";

export type LogMealOption = {
	id: LogMealOptionId;
	title: string;
	description: string;
};

export const LOG_MEAL_OPTIONS: readonly LogMealOption[] = [
	{ id: "photo", title: "Take a photo", description: "Point the camera at your meal." },
	{ id: "manual", title: "Enter manually", description: "Type the meal and its parts yourself." },
	{ id: "previous", title: "Log a previous meal again", description: "Repeat something you've checked before." },
] as const;
