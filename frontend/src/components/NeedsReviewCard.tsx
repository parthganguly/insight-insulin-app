import { IonButton } from "@ionic/react";

import type { MealItem } from "../types/MealItem";
import { NEEDS_REVIEW_ACTION, NEEDS_REVIEW_KICKER } from "../utils/mealDraftUx";

type NeedsReviewCardProps = {
	item: MealItem;
	disabled: boolean;
	onEdit: (item: MealItem) => void;
	onConfirm: (id: string) => void;
};

const NeedsReviewCard = ({ item, disabled, onEdit, onConfirm }: NeedsReviewCardProps) => {
	if (!item.needsReview) return null;

	return (
		<article className='needs-review-card' role='status' aria-live='polite' data-item-id={item.id}>
			<p className='needs-review-kicker'>{NEEDS_REVIEW_KICKER}</p>
			<h2>{item.name}</h2>
			<p className='needs-review-copy'>These values were for "{item.needsReview.previousName}". Check they still fit.</p>
			<p className='carried-nutrition-summary'>
				Per serving: {item.kcalPerServing} kcal · {item.carbPerServing_g} g carbs · {item.proteinPerServing_g ?? 0} g protein · {item.fatPerServing_g ?? 0} g fat · {item.satFatPerServing_g} g saturated fat · GI {item.gi}
			</p>
			<p className='needs-review-action-copy'>{NEEDS_REVIEW_ACTION}</p>
			<div className='needs-review-actions'>
				<IonButton fill='outline' onClick={() => onEdit(item)} disabled={disabled}>Edit values</IonButton>
				<IonButton onClick={() => onConfirm(item.id)} disabled={disabled}>These still fit</IonButton>
			</div>
		</article>
	);
};

export default NeedsReviewCard;
