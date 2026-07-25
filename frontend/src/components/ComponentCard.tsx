import { IonButton, IonInput, IonSelect, IonSelectOption } from "@ionic/react";

import type { MealItem } from "../types/MealItem";
import { Unit } from "../types/MealItem";
import {
	calculateTotalItemCalories,
	calculateTotalItemCarbohydrates,
	calculateTotalItemSaturatedFat,
} from "../utils";
import { ADVANCED_DETAILS_LABEL } from "../utils/mealDraftUx";
import {
	PROVIDED_FII_DISCLAIMER,
	ROUGH_ESTIMATE_NOTICE,
	UNKNOWN_ITEMS_NOTICE,
	humanizeFiiSource,
	isRoughEstimateSource,
	isUnknownSource,
	shouldShowProvidedFiiDisclaimer,
} from "../utils/safetyCopy";

type ComponentCardProps = {
	item: MealItem;
	provenanceCopy: string | null;
	draftHint: string | null;
	disabled: boolean;
	onOpenEditor: (item: MealItem) => void;
	onAdjustAmount: (id: string, delta: number) => void;
	onUpdateAmount: (id: string, amount: number) => void;
	onUpdateUnit: (id: string, unit: string) => void;
	parseNumericInput: (value: string, fallback?: number) => number;
};

const ComponentCard = ({
	item,
	provenanceCopy,
	draftHint,
	disabled,
	onOpenEditor,
	onAdjustAmount,
	onUpdateAmount,
	onUpdateUnit,
	parseNumericInput,
}: ComponentCardProps) => (
	<article className='component-card' data-component-card data-item-id={item.id}>
		<div className='component-card-heading'>
			<button className='component-name-button' type='button' onClick={() => onOpenEditor(item)} disabled={disabled}>
				{item.name}
			</button>
			{item.needsReview && <span className='component-review-marker'>Values under review</span>}
			{provenanceCopy && <span className='draft-provenance'>{provenanceCopy}</span>}
			{draftHint && <span className='draft-item-hint'>{draftHint}</span>}
		</div>

		<div className='portion-adjust-row'>
			<IonButton aria-label={`Decrease ${item.name} portion`} size='small' fill='outline' onClick={() => onAdjustAmount(item.id, -0.5)} disabled={disabled}>-</IonButton>
			<IonInput
				type='number'
				inputMode='decimal'
				fill='outline'
				label='Amount'
				labelPlacement='stacked'
				value={item.amount}
				min={0}
				onIonInput={(event) => onUpdateAmount(item.id, parseNumericInput(event.detail.value ?? "", item.amount))}
				disabled={disabled}
			/>
			<IonButton aria-label={`Increase ${item.name} portion`} size='small' fill='outline' onClick={() => onAdjustAmount(item.id, 0.5)} disabled={disabled}>+</IonButton>
			<IonSelect
				label='Unit'
				labelPlacement='stacked'
				fill='outline'
				interface='popover'
				value={item.servingUnit}
				onIonChange={(event) => onUpdateUnit(item.id, event.detail.value)}
				disabled={disabled}
			>
				{Object.values(Unit).map((unit) => <IonSelectOption key={unit} value={unit}>{unit}</IonSelectOption>)}
			</IonSelect>
		</div>

		<details className='advanced-details component-advanced-details'>
			<summary>{ADVANCED_DETAILS_LABEL}</summary>
			<div className='advanced-details-content component-advanced-content'>
				<div className='component-detail-row'><span>Calories</span><strong>{item.kcalPerServing} kcal</strong></div>
				<div className='component-detail-row'><span>Carbs</span><strong>{item.carbPerServing_g} g</strong></div>
				<div className='component-detail-row'><span>Protein</span><strong>{item.proteinPerServing_g ?? 0} g</strong></div>
				<div className='component-detail-row'><span>Fat</span><strong>{item.fatPerServing_g ?? 0} g</strong></div>
				<div className='component-detail-row'><span>Saturated fat</span><strong>{item.satFatPerServing_g} g</strong></div>
				<div className='component-detail-row'><span>GI</span><strong>{item.gi}</strong></div>
				<div className='component-detail-row'><span>FII</span><strong>{item.fii ?? "Not available"}</strong></div>
				<div className='component-detail-row'><span>Source</span><strong>{item.source ? humanizeFiiSource(item.source) : "Not available"}</strong></div>
				<div className='component-detail-row'><span>Total calories</span><strong>{calculateTotalItemCalories(item)} kcal</strong></div>
				<div className='component-detail-row'><span>Total carbs</span><strong>{calculateTotalItemCarbohydrates(item)} g</strong></div>
				<div className='component-detail-row'><span>Total saturated fat</span><strong>{calculateTotalItemSaturatedFat(item)} g</strong></div>
				{shouldShowProvidedFiiDisclaimer(item.source, item.fii) && <p className='component-disclaimer'>{PROVIDED_FII_DISCLAIMER}</p>}
				{isRoughEstimateSource(item.source) && <p className='component-disclaimer'>{ROUGH_ESTIMATE_NOTICE}</p>}
				{isUnknownSource(item.source) && <p className='component-disclaimer'>{UNKNOWN_ITEMS_NOTICE}</p>}
			</div>
		</details>

		<IonButton className='component-edit-button' fill='clear' onClick={() => onOpenEditor(item)} disabled={disabled}>Edit details</IonButton>
	</article>
);

export default ComponentCard;
