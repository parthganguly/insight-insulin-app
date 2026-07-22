import { Meal } from "../types/Meal";
import { getMealAcuteScore } from "../utils";
import { getEstimateQualityCopy } from "./safetyCopy";

const startOfLocalDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const getPartOfDay = (hour: number): string => {
	if (hour < 5) return "night";
	if (hour < 12) return "morning";
	if (hour < 14) return "noon";
	if (hour < 18) return "afternoon";
	return "evening";
};

export const getHomeFolioLine = (now = new Date()): string => {
	const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
	return `${weekday} ${getPartOfDay(now.getHours())}`;
};

export const getJournalDayLabel = (timestamp: number, now = new Date()): string => {
	const mealDate = new Date(timestamp);
	if (!Number.isFinite(mealDate.getTime())) return "Date unavailable";

	const dayDifference = Math.round((startOfLocalDay(now) - startOfLocalDay(mealDate)) / 86_400_000);
	if (dayDifference === 0) return "Today";
	if (dayDifference === 1) return "Yesterday";

	return mealDate.toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
};

export type JournalMealGroup = {
	label: string;
	meals: Meal[];
};

export const groupJournalMealsByDay = (meals: Meal[], now = new Date()): JournalMealGroup[] => {
	const groups: JournalMealGroup[] = [];
	let previousLabel: string | null = null;

	for (const meal of meals) {
		const label = getJournalDayLabel(meal.timestamp, now);
		if (label !== previousLabel) {
			groups.push({ label, meals: [meal] });
			previousLabel = label;
		} else {
			groups.at(-1)?.meals.push(meal);
		}
	}

	return groups;
};

export const getTypographicPlateMonogram = (mealName: string): string => {
	const connectorWords = new Set(["and", "with", "the", "of"]);
	const words = mealName
		.trim()
		.split(/\s+/)
		.filter((word) => word && !connectorWords.has(word.toLocaleLowerCase()));
	if (words.length === 0) return "?";

	const initials = words.slice(0, 2).map((word) => word[0]);
	return initials.map((initial, index) => (index === 0 ? initial.toLocaleUpperCase() : initial.toLocaleLowerCase())).join("");
};

export const getJournalEntryMetaLine = (meal: Meal): string => {
	const mealDate = new Date(meal.timestamp);
	const time = Number.isFinite(mealDate.getTime())
		? mealDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
		: "Time unavailable";
	const score = getMealAcuteScore(meal);
	const quality = meal.estimate_quality ? getEstimateQualityCopy(meal.estimate_quality).label : null;
	const parts = [time];

	if (score !== undefined) parts.push(`estimate ${score}`);
	if (quality) parts.push(`Data quality: ${quality}`);

	return parts.join(" · ");
};
