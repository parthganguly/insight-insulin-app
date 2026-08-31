import {
	IonAlert,
	IonButton,
	IonContent,
	IonFooter,
	IonIcon,
	IonLoading,
	IonPage,
	useIonRouter,
} from "@ionic/react";
import { alertCircle } from "ionicons/icons";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import EvidenceRows from "../../components/EvidenceRows";
import ResultHero from "../../components/ResultHero";
import { MealPreviewResponse } from "../../api/api";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { isMaterialSnapshotFresh, useMealEstimateStore } from "../../stores/mealEstimateStore";
import { usePendingSaveStore } from "../../stores/pendingSaveStore";
import { Meal } from "../../types/Meal";
import { MealItem, Unit } from "../../types/MealItem";
import { calculateTotalItemCalories, calculateTotalItemCarbohydrates, calculateTotalItemSaturatedFat, getMealAcuteScore } from "../../utils";
import { getSavedResultScoreAriaLabel, getSavedResultScoreLine, SAVED_RESULT_SCALE_DISCLOSURE, SAVED_RESULT_SCORE_BOUNDARY } from "../../utils/acuteScoreDisplay";
import { calculateCurrentMealEstimate } from "../../utils/mealEstimateWorkflow";
import { armMealFlowBypass } from "../../utils/mealFlowGuard";
import { retrySaveIntent, saveCurrentEstimate } from "../../utils/mealSaveCoordinator";
import { getImpactPresentation, isHardToEstimatePresentation } from "../../utils/insulinImpactPresentation";
import { ADVANCED_DETAILS_LABEL } from "../../utils/mealDraftUx";
import { getResultCompositionLine } from "../../utils/resultPresentation";
import {
	APP_DISCLAIMER,
	MEAL_SCORE_DISCLAIMER,
	PROVIDED_FII_DISCLAIMER,
	ROUGH_ESTIMATE_NOTICE,
	UNKNOWN_ITEMS_NOTICE,
	getSavedResultSourceCopy,
	isRoughEstimateSource,
	isUnknownSource,
	shouldShowProvidedFiiDisclaimer,
} from "../../utils/safetyCopy";

export const UNSAVED_ESTIMATE_STATUS = "Estimate only — not saved";
export const STALE_ESTIMATE_MESSAGE = "You changed the meal after this estimate. Recalculate to update it.";
const getEstimateDiscardMessage = (phase?: "inFlight" | "ambiguous" | "rejected" | "conflicted"): string => {
	if (!phase) return "Nothing has been saved. Your meal draft and this estimate will be removed.";
	if (phase === "rejected") {
		return "A save attempt was sent and rejected. Discarding this draft and estimate does not remove that save-attempt status; discard it separately from the save status banner.";
	}
	return "A save attempt has already been sent. Discarding this draft and estimate does not cancel it. The meal may already be, or may later appear, in History.";
};

const toUnit = (value: string): Unit => Object.values(Unit).includes(value as Unit) ? value as Unit : Unit.Servings;

const previewItemsForDisplay = (preview: MealPreviewResponse): MealItem[] => preview.items.map((item, index) => ({
	id: `estimate-item-${index}`,
	name: item.name,
	servingSize: 1,
	servingUnit: toUnit(item.unit),
	amount: item.quantity,
	kcalPerServing: item.kcalPerUnit ?? 0,
	carbPerServing_g: item.carb_g ?? 0,
	proteinPerServing_g: item.protein_g,
	fatPerServing_g: item.fat_g,
	satFatPerServing_g: item.satFat_g ?? 0,
	gi: item.gi ?? 0,
	fii: item.fii_value ?? item.fii,
	source: item.fii_source,
	why: item.why,
}));

const MealEstimate = () => {
	const router = useIonRouter();
	const { pathname } = useLocation();
	const meal = useCurrentMealStore((state) => state.meal);
	const estimate = useMealEstimateStore();
	const intents = usePendingSaveStore((state) => state.intents);
	const [showDiscardAlert, setShowDiscardAlert] = useState(false);
	const validEstimate = estimate.preview !== null && estimate.frozenItems !== null && estimate.saveRequestId !== null && estimate.draftId === meal.id;
	const isFresh = validEstimate && isMaterialSnapshotFresh(meal, estimate.frozenItems);
	const intent = estimate.saveRequestId ? intents[estimate.saveRequestId] : undefined;

	useEffect(() => {
		if (pathname !== "/meals/estimate" || validEstimate) return;
		const destination = meal.items.length > 0 ? "/meals/new" : "/log-meal";
		router.push(destination, "back", "replace");
	}, [meal.items.length, pathname, router, validEstimate]);

	const displayMeal = useMemo<Meal | null>(() => {
		if (!estimate.preview) return null;
		return {
			id: meal.id,
			image: meal.image,
			name: meal.name,
			timestamp: meal.timestamp,
			items: previewItemsForDisplay(estimate.preview),
			acute_score: estimate.preview.acute_score,
			insulin_load_total: estimate.preview.insulin_load_total,
			kcal_total: estimate.preview.kcal_total,
			carbs_total: estimate.preview.carbs_total,
			protein_total: estimate.preview.protein_total,
			fat_total: estimate.preview.fat_total,
			estimate_quality: estimate.preview.estimate_quality,
			estimate_status: estimate.preview.estimate_status,
			main_insulin_drivers: estimate.preview.main_insulin_drivers,
		};
	}, [estimate.preview, meal.id, meal.image, meal.name, meal.timestamp]);

	if (!validEstimate || !displayMeal) return null;

	const impactPresentation = getImpactPresentation(displayMeal);
	const displayScore = getMealAcuteScore(displayMeal);
	const hardToEstimate = isHardToEstimatePresentation(impactPresentation);
	const showScore = !hardToEstimate && displayScore !== undefined;
	const showPartialModelOutput = hardToEstimate && displayScore !== undefined;
	const hasUnknownItems = displayMeal.items.some((item) => isUnknownSource(item.source));
	const hasRoughEstimateItems = displayMeal.items.some((item) => isRoughEstimateSource(item.source));
	const isSaving = intent?.phase === "inFlight";
	const canSave = isFresh && estimate.phase === "ready" && !intent;
	const canRetry = isFresh && intent?.phase === "ambiguous";
	const needsRecalculation = !isFresh || estimate.phase === "failed";

	const replaceWithSavedRoute = (destination: string) => router.push(destination, "forward", "replace");

	const handleSave = () => {
		if (canRetry && estimate.saveRequestId) {
			void retrySaveIntent(estimate.saveRequestId, { replaceRoute: replaceWithSavedRoute });
			return;
		}
		void saveCurrentEstimate({ replaceRoute: replaceWithSavedRoute });
	};

	const handleRecalculate = () => {
		void calculateCurrentMealEstimate();
	};

	const discardEstimate = () => {
		armMealFlowBypass("/log-meal");
		useMealEstimateStore.getState().clearEstimate();
		useCurrentMealStore.getState().resetMeal();
		setShowDiscardAlert(false);
		router.push("/log-meal", "root", "replace");
	};

	return (
		<IonPage>
			<IonContent className='result-page estimate-page' fullscreen>
				<ResultHero image={meal.image} mealName={meal.name} defaultHref='/meals/new' imageAlt='Meal estimate photo' />
				<main className='result-sheet'>
					<span className='meal-status-pill meal-status-estimate'>{UNSAVED_ESTIMATE_STATUS}</span>
					<h1 className='result-meal-name'>{meal.name}</h1>
					<p className='result-meal-meta'>{getResultCompositionLine(displayMeal)}</p>

					{needsRecalculation && (
						<div className='save-feedback-banner save-feedback-error stale-estimate-banner' role='status' aria-live='polite'>
							<IonIcon icon={alertCircle} aria-hidden='true' />
							<span>{estimate.error ?? STALE_ESTIMATE_MESSAGE}</span>
						</div>
					)}
					{intent?.lastError && (
						<div className='save-feedback-banner save-feedback-error' role='status' aria-live='polite'>
							<IonIcon icon={alertCircle} aria-hidden='true' />
							<span>{intent.lastError}</span>
						</div>
					)}

					<h2 className='result-verdict'>{impactPresentation.title}</h2>
					<p className='result-verdict-support'>{impactPresentation.description}</p>

					{showScore && (
						<div className='result-score' role='group' aria-label={getSavedResultScoreAriaLabel(displayScore)}>
							<p className='result-score-line' aria-hidden='true'>{getSavedResultScoreLine(displayScore)}</p>
							<p className='result-score-caption' aria-hidden='true'>{SAVED_RESULT_SCORE_BOUNDARY}</p>
						</div>
					)}
					{hasUnknownItems && <p className='result-notice'>{UNKNOWN_ITEMS_NOTICE}</p>}
					{hasRoughEstimateItems && <p className='result-notice'>{ROUGH_ESTIMATE_NOTICE}</p>}

					<EvidenceRows items={displayMeal.items} muted={hardToEstimate} />

					<details className='result-footnotes result-score-method'>
						<summary tabIndex={0}>How this score works</summary>
						<div className='result-footnotes-content'><p>{SAVED_RESULT_SCALE_DISCLOSURE}</p></div>
					</details>
					<details className='result-footnotes'>
						<summary tabIndex={0}>What this doesn't mean</summary>
						<div className='result-footnotes-content'><p>{MEAL_SCORE_DISCLAIMER}</p><p>{APP_DISCLAIMER}</p></div>
					</details>
					<details className='result-advanced advanced-details'>
						<summary tabIndex={0}>{ADVANCED_DETAILS_LABEL}</summary>
						<div className='advanced-details-content'>
							{showPartialModelOutput && displayScore !== undefined && (
								<section className='result-partial-output'>
									<h3 className='result-kicker'>Partial model output</h3>
									<p className='result-partial-line'>{getSavedResultScoreLine(displayScore)}</p>
									<p className='result-advanced-note'>Calculated only from items the current model could estimate; this does not represent a complete meal estimate.</p>
								</section>
							)}
							{displayMeal.items.map((item) => (
								<article className='result-advanced-item' key={item.id}>
									<h4 className='result-advanced-name'>{item.name}</h4>
									<div className='result-advanced-values'>
										<div className='result-advanced-row'><span>Calories</span><strong>{calculateTotalItemCalories(item)} kcal</strong></div>
										<div className='result-advanced-row'><span>Carbohydrates</span><strong>{calculateTotalItemCarbohydrates(item)} g</strong></div>
										<div className='result-advanced-row'><span>Saturated Fats</span><strong>{calculateTotalItemSaturatedFat(item)} g</strong></div>
									</div>
									<p>FII: {item.fii ?? ""}</p>
									<p>Glycemic Index: {item.gi}</p>
									<p>Model handling: {getSavedResultSourceCopy(item.source)}</p>
									{shouldShowProvidedFiiDisclaimer(item.source, item.fii) && <p className='result-advanced-note'>{PROVIDED_FII_DISCLAIMER}</p>}
								</article>
							))}
						</div>
					</details>
				</main>
				<IonLoading isOpen={estimate.phase === "loading" || isSaving} message={estimate.phase === "loading" ? "Recalculating estimate…" : "Saving to History…"} />
			</IonContent>

			<IonFooter className='result-dock estimate-dock'>
				{needsRecalculation ? (
					<IonButton expand='block' aria-label='Recalculate estimate' disabled={estimate.phase === "loading"} onClick={handleRecalculate}>Recalculate</IonButton>
				) : (
					<IonButton expand='block' aria-label={canRetry ? "Retry this save" : "Save to History"} disabled={(!canSave && !canRetry) || isSaving} onClick={handleSave}>
						{isSaving ? "Saving to History…" : canRetry ? "Retry this save" : "Save to History"}
					</IonButton>
				)}
				<div className='result-dock-secondary'>
					<IonButton expand='block' fill='clear' onClick={() => router.push("/meals/new", "back")}>Adjust meal</IonButton>
					<IonButton expand='block' fill='clear' color='medium' onClick={() => setShowDiscardAlert(true)}>Discard</IonButton>
				</div>
			</IonFooter>

			<IonAlert
				isOpen={showDiscardAlert}
				backdropDismiss={false}
				header='Discard this estimate?'
				message={getEstimateDiscardMessage(intent?.phase)}
				buttons={[
					{ text: "Keep estimate", role: "cancel", handler: () => setShowDiscardAlert(false) },
					{ text: "Discard", role: "destructive", handler: discardEstimate },
				]}
			/>
		</IonPage>
	);
};

export default MealEstimate;
