import { IonItem } from "@ionic/react";
import React from "react";
import { Meal } from "../types/Meal";
import { getPreviousMealMetaLine } from "../utils/journalPresentation";
import JournalEntryBody from "./JournalEntryBody";

export const PREVIOUS_MEAL_ACTION_LINE = "Use as new draft";

type PreviousMealEntryCardProps = {
	meal: Meal;
	onSelect: () => void;
};

// The explicit reuse affordance (issue #123). Selecting an entry starts a new
// editable draft and always lands on the confirmation screen, so the
// destination is hardwired and there is no read-only mode: this card can never
// stand in for the History entry that opens a saved result. The saved meal's
// own score and data quality are deliberately absent from the caption, because
// the draft this starts is re-scored only after the user reviews it.
const PreviousMealEntryCard: React.FC<PreviousMealEntryCardProps> = ({ meal, onSelect }) => {
	const accessibleId = React.useId();
	const nameId = `${accessibleId}-name`;
	const metaId = `${accessibleId}-meta`;
	const actionId = `${accessibleId}-action`;

	return (
		<IonItem
			lines='none'
			detail={false}
			button
			routerLink='/meals/new'
			className='journal-entry-card previous-meal-entry-card'
			aria-labelledby={`${nameId} ${metaId} ${actionId}`}
			onClick={onSelect}
		>
			<JournalEntryBody
				meal={meal}
				metaLine={getPreviousMealMetaLine(meal)}
				nameId={nameId}
				metaId={metaId}
				actionLine={PREVIOUS_MEAL_ACTION_LINE}
				actionId={actionId}
			/>
		</IonItem>
	);
};

export default PreviousMealEntryCard;
