import React from "react";

import { MealItem } from "../types/MealItem";
import { getItemCalorieShares, hasCalorieShareBars, orderItemsByDriver } from "../utils/resultPresentation";
import { humanizeFiiSource } from "../utils/safetyCopy";

// Annotated Journal J5 evidence rows.
//
// What a bar means is a product decision, not a styling one. The saved meal
// carries no per-item insulin load (see utils/resultPresentation.ts), so these
// bars express each item's share of the meal's CALORIES and the page says so
// out loud. No percentage is printed: a number like "64%" beside a food name
// would read as its share of the score, which stored data cannot support.
export const CALORIE_BAR_NOTE = "Bars compare each item's calories within this meal — not its share of the score.";

type EvidenceRowsProps = {
	items: MealItem[];
	drivers: string[];
	// Insufficient-data results keep their evidence visible but visually quieter.
	muted?: boolean;
};

const EvidenceRows = ({ items, drivers, muted = false }: EvidenceRowsProps) => {
	if (items.length === 0 && drivers.length === 0) return null;

	const orderedItems = orderItemsByDriver(items, drivers);
	const shares = getItemCalorieShares(orderedItems);
	const showBars = hasCalorieShareBars(orderedItems);

	return (
		<section className={`result-evidence${muted ? " result-evidence-muted" : ""}`} aria-labelledby='result-evidence-heading'>
			<h3 id='result-evidence-heading' className='result-kicker'>What drove it</h3>

			{drivers.length > 0 && (
				<p className='result-drivers'>
					<span className='result-drivers-label'>Main drivers</span>
					<span className='result-drivers-list'>
						{drivers.map((driver, index) => (
							<React.Fragment key={`${index}-${driver}`}>
								{index > 0 && <span className='result-driver-separator' aria-hidden='true'> · </span>}
								<span className='result-driver'>{driver}</span>
							</React.Fragment>
						))}
					</span>
				</p>
			)}

			{shares.length > 0 && (
				<ul className='result-evidence-rows'>
					{shares.map(({ item, kcal, fraction }, index) => {
						const whyLine = item.why?.trim() ? item.why.trim() : humanizeFiiSource(item.source);
						return (
							<li className='result-evidence-row' key={`${index}-${item.id}`}>
								<span className='result-evidence-name'>{item.name}</span>
								<span className='result-evidence-kcal'>{"≈"} {kcal} kcal</span>
								<span className='result-evidence-portion'>{item.amount} {item.servingUnit}</span>
								<span className='result-evidence-why'>{whyLine}</span>
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
