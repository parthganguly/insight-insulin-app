import React from "react";
import { Meal } from "../types/Meal";
import TypographicPlate from "./TypographicPlate";

type JournalEntryBodyProps = {
	meal: Meal;
	metaLine: string;
	nameId: string;
	metaId: string;
	actionLine?: string;
	actionId?: string;
};

// The shared journal-entry presentation (issue #123). It renders the photo or
// typographic plate and the caption, and nothing else: no route, no store, no
// handler, no notion of which page owns it. Each wrapper supplies its own
// metadata line and its own label ids, so History and the previous-meal picker
// can look like one system without becoming behaviourally interchangeable.
const JournalEntryBody: React.FC<JournalEntryBodyProps> = ({ meal, metaLine, nameId, metaId, actionLine, actionId }) => (
	<article className='journal-entry-card-content'>
		{meal.image ? <img className='journal-entry-image' src={meal.image} alt='' /> : <TypographicPlate mealName={meal.name} />}
		<div className='journal-entry-caption'>
			<h3 id={nameId}>{meal.name}</h3>
			<p id={metaId}>{metaLine}</p>
			{actionLine ? (
				<p className='journal-entry-action' id={actionId}>
					{actionLine}
				</p>
			) : null}
		</div>
	</article>
);

export default JournalEntryBody;
