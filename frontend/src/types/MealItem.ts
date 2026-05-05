export enum Unit {
	Grams = "g",
	Milliliters = "ml",
	Pieces = "pcs",
	Slices = "slice",
	Cups = "cup",
	Tablespoons = "tbsp",
	Servings = "serving",
}

export type MealItem = {
	id: string;
	name: string;
	image?: string;

	servingSize: number;
	servingUnit: Unit;
	amount: number;
	kcalPerServing: number;
	carbPerServing_g: number;
	proteinPerServing_g?: number;
	fatPerServing_g?: number;
	satFatPerServing_g: number;
	source?: string;
	why?: string;

	fii: number;
	gi: number;
};
