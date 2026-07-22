import { IonItem } from "@ionic/react";
import React from "react";
import { Meal } from "../types/Meal";
import { getJournalEntryMetaLine } from "../utils/journalPresentation";
import TypographicPlate from "./TypographicPlate";

type JournalEntryCardProps = {
	meal: Meal;
};

// A journal entry is a history/review affordance (issue #89): it opens the
// saved meal's read-only detail with its canonical score intact. Reuse as a
// new draft belongs only to the explicit previous-meal picker.
const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ meal }) => {
	const accessibleId = React.useId();
	const nameId = `${accessibleId}-name`;
	const metaId = `${accessibleId}-meta`;

	return (
		<IonItem
			lines='none'
			detail={false}
			button
			routerLink={`/meals/saved/${encodeURIComponent(meal.id)}`}
			className='journal-entry-card'
			aria-labelledby={`${nameId} ${metaId}`}
		>
			<article className='journal-entry-card-content'>
				{meal.image ? <img className='journal-entry-image' src={meal.image} alt='' /> : <TypographicPlate mealName={meal.name} />}
				<div className='journal-entry-caption'>
					<h3 id={nameId}>{meal.name}</h3>
					<p id={metaId}>{getJournalEntryMetaLine(meal)}</p>
				</div>
			</article>
		</IonItem>
	);
};

export default JournalEntryCard;
