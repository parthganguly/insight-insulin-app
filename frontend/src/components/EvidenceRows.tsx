import { MealItem } from "../types/MealItem";
import { getItemCalorieShares, hasCalorieShareBars } from "../utils/resultPresentation";
import { getSavedResultSourceCopy } from "../utils/safetyCopy";

// Annotated Journal J5 evidence rows.
//
// What a bar means is a product decision, not a styling one. The saved meal
// carries no per-item insulin load (see utils/resultPresentation.ts), so these
// bars express each item's share of the meal's CALORIES and the page says so
// out loud. No percentage is printed: a number like "64%" beside a food name
// would read as its share of the score, which stored data cannot support.
export const CALORIE_BAR_NOTE = "Bars show each item’s share of this meal’s calories only. They do not show share of the relative score.";

type EvidenceRowsProps = {
	items: MealItem[];
	// Insufficient-data results keep their evidence visible but visually quieter.
	muted?: boolean;
};

const EvidenceRows = ({ items, muted = false }: EvidenceRowsProps) => {
	if (items.length === 0) return null;

	const shares = getItemCalorieShares(items);
	const showBars = hasCalorieShareBars(items);

	return (
		<section className={`result-evidence${muted ? " result-evidence-muted" : ""}`} aria-labelledby='result-evidence-heading'>
			<h3 id='result-evidence-heading' className='result-kicker'>How this estimate was built</h3>

			{shares.length > 0 && (
				<ul className='result-evidence-rows'>
					{shares.map(({ item, kcal, fraction }, index) => {
						return (
							<li className='result-evidence-row' key={`${index}-${item.id}`}>
								<span className='result-evidence-name'>{item.name}</span>
								<span className='result-evidence-kcal'>{"≈"} {kcal} kcal</span>
								<span className='result-evidence-portion'>{item.amount} {item.servingUnit}</span>
								<span className='result-evidence-why'>{getSavedResultSourceCopy(item.source)}</span>
								{showBars && (
									<span className='result-evidence-bar' aria-hidden='true'>
										<i style={{ width: `${(fraction * 100).toFixed(2)}%` }} />
									</span>
								)}
							</li>
						);
					})}
				</ul>
			)}

			{showBars && <p className='result-evidence-bar-note'>{CALORIE_BAR_NOTE}</p>}
		</section>
	);
};

export default EvidenceRows;
