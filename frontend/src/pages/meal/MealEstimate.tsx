import {
	IonButton,
	IonContent,
	IonFooter,
	IonPage,
	IonSpinner,
	useIonRouter,
} from "@ionic/react";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import EvidenceRows from "../../components/EvidenceRows";
import ResultHero from "../../components/ResultHero";
import { MealPreviewResponse } from "../../api/api";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { isMaterialSnapshotFresh, useMealEstimateStore } from "../../stores/mealEstimateStore";
import { canDispatchReferenceSave, isReferenceIntent, usePendingSaveStore } from "../../stores/pendingSaveStore";
import { ReferenceAssessment } from "../../components/experimentalReference/ReferenceAssessment";
import { REFERENCE_PREVIEW_MODE } from "../../utils/experimentalPresentationGate";
import { isReferenceDraft } from "../../utils/referenceDraft";
import { calculateCurrentReferenceEstimate, describeReferenceErrorCode } from "../../utils/mealEstimateWorkflow";
import { referenceSaveCopy, retryReferenceSaveIntent, saveCurrentReferenceEstimate } from "../../utils/mealSaveCoordinator";
import { Meal } from "../../types/Meal";
import { MealItem, Unit } from "../../types/MealItem";
import { calculateTotalItemCalories, calculateTotalItemCarbohydrates, calculateTotalItemSaturatedFat, getMealAcuteScore } from "../../utils";
import { getSavedResultScoreAriaLabel, getSavedResultScoreLine, SAVED_RESULT_SCALE_DISCLOSURE, SAVED_RESULT_SCORE_BOUNDARY } from "../../utils/acuteScoreDisplay";
import { calculateCurrentMealEstimate } from "../../utils/mealEstimateWorkflow";
import { doesPendingSaveCoverCurrentDraft } from "../../utils/mealFlowGuard";
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

export const STALE_ESTIMATE_MESSAGE = "This estimate describes the meal before your changes. Recalculate before saving.";
export const RECALCULATING_ESTIMATE_MESSAGE = "Estimating your updated meal…";
export const RECALCULATION_FAILURE_MESSAGE = "Couldn't update this estimate. Try again.";

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

const LegacyMealEstimate = () => {
	const router = useIonRouter();
	const { pathname } = useLocation();
	const editable = useCurrentMealStore((state) => state.meal);
	const meal = isReferenceDraft(editable) ? null : editable;
	const estimate = useMealEstimateStore();
	const intents = usePendingSaveStore((state) => state.intents);
	const validEstimate = meal !== null && estimate.contract === "legacy" && estimate.preview !== null && estimate.frozenItems !== null && estimate.saveRequestId !== null && estimate.draftId === meal.id;
	const isFresh = validEstimate && meal !== null && isMaterialSnapshotFresh(meal, estimate.frozenItems);
	const rawIntent = estimate.saveRequestId ? intents[estimate.saveRequestId] : undefined;
	const intent = rawIntent && !isReferenceIntent(rawIntent) ? rawIntent : undefined;

	useEffect(() => {
		if (pathname !== "/meals/estimate" || validEstimate) return;
		const destination = (meal?.items.length ?? 0) > 0 ? "/meals/new" : "/log-meal";
		router.push(destination, "back", "replace");
	}, [meal?.items.length, pathname, router, validEstimate]);

	const displayMeal = useMemo<Meal | null>(() => {
		if (!estimate.preview || !meal) return null;
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
	}, [estimate.preview, meal]);

	if (!validEstimate || !displayMeal || !meal) return null;

	const impactPresentation = getImpactPresentation(displayMeal);
	const displayScore = getMealAcuteScore(displayMeal);
	const hardToEstimate = isHardToEstimatePresentation(impactPresentation);
	const showScore = !hardToEstimate && displayScore !== undefined;
	const showPartialModelOutput = hardToEstimate && displayScore !== undefined;
	const hasUnknownItems = displayMeal.items.some((item) => isUnknownSource(item.source));
	const hasRoughEstimateItems = displayMeal.items.some((item) => isRoughEstimateSource(item.source));
	const ownsTransientIntent = (intent?.phase === "inFlight" || intent?.phase === "ambiguous")
		&& doesPendingSaveCoverCurrentDraft({
			editRevision: useCurrentMealStore.getState().editRevision,
			meal,
			estimateDraftId: estimate.draftId,
			saveRequestId: estimate.saveRequestId,
			intent,
		});
	const hasBackgroundTransientIntent = (intent?.phase === "inFlight" || intent?.phase === "ambiguous") && !ownsTransientIntent;
	const isSaving = intent?.phase === "inFlight" && ownsTransientIntent;
	const isAmbiguous = intent?.phase === "ambiguous" && ownsTransientIntent;
	const isRejected = intent?.phase === "rejected";
	const isConflicted = intent?.phase === "conflicted";
	const isRecalculating = estimate.phase === "loading";
	const recalculationFailed = estimate.phase === "failed";
	const canSave = isFresh && estimate.phase === "ready" && !intent;
	const canRetry = isFresh && isAmbiguous;
	const needsRecalculation = !isFresh || recalculationFailed;
	const footerLabel = needsRecalculation
		? "Recalculate"
		: isSaving
			? "Saving to History…"
			: canRetry
				? "Retry this save"
				: hasBackgroundTransientIntent
					? "Save attempt pending"
				: isRejected
						? "Save was not completed"
						: isConflicted
							? "Save needs review"
							: "Save to History";
	const footerDisabled = needsRecalculation
		? isRecalculating
		: isSaving || isRejected || isConflicted || (!canSave && !canRetry);
	const persistenceStatusIsLive = isSaving || isAmbiguous || isRejected || isConflicted;

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

	return (
		<IonPage>
			<IonContent className='result-page estimate-page' fullscreen>
				<ResultHero image={meal.image} mealName={meal.name} defaultHref='/meals/new' imageAlt='Meal estimate photo' />
				<main className='result-sheet'>
					<h1 className='result-meal-name'>{meal.name}</h1>
					<p className='result-meal-meta'>{getResultCompositionLine(displayMeal)}</p>
					<div className='estimate-identity-actions'>
						<IonButton fill='clear' size='small' onClick={() => router.push("/meals/new", "back")}>Adjust meal</IonButton>
					</div>

					{needsRecalculation && (
						<section className='estimate-model-status' role='status' aria-live='polite' aria-atomic='true'>
							<p className='estimate-stale-copy'>{STALE_ESTIMATE_MESSAGE}</p>
							{isRecalculating && (
								<p className='estimate-model-activity'><IonSpinner name='crescent' aria-hidden='true' />{RECALCULATING_ESTIMATE_MESSAGE}</p>
							)}
							{recalculationFailed && <p className='estimate-model-error'>{RECALCULATION_FAILURE_MESSAGE}</p>}
						</section>
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
			</IonContent>

			<IonFooter className='result-dock estimate-dock'>
				<div
					className='estimate-footer-state'
					role={persistenceStatusIsLive ? "status" : undefined}
					aria-live={persistenceStatusIsLive ? "polite" : undefined}
					aria-atomic={persistenceStatusIsLive ? "true" : undefined}
				>
					{canRetry && <p className='estimate-footer-support'>{intent?.lastError}</p>}
					<IonButton
						expand='block'
						aria-label={needsRecalculation ? "Recalculate estimate" : footerLabel}
						disabled={footerDisabled}
						onClick={needsRecalculation ? handleRecalculate : handleSave}
					>
						{isSaving && <IonSpinner name='crescent' aria-hidden='true' />}
						{footerLabel}
					</IonButton>
				</div>
			</IonFooter>
		</IonPage>
	);
};

export const REFERENCE_RESULT_KICKER = "Experimental reference preview — not a medical result";
export const REFERENCE_NO_ESTIMATE_MESSAGE = "There is no calculated estimate for this draft. Go back and calculate one.";
export const REFERENCE_STALE_ESTIMATE_MESSAGE = "This estimate describes the meal before your changes. Calculate again before saving.";

/**
 * Reference-mode result. The entire legacy interpretation subtree — verdict,
 * acute score, partial model output, estimate quality and FII-source copy —
 * is absent here rather than hidden, and no legacy chronic trend is requested
 * anywhere in this mode.
 *
 * Exported for focused lifecycle tests (N1).
 */
export const ReferenceMealEstimate = () => {
	const router = useIonRouter();
	const { pathname } = useLocation();
	const editable = useCurrentMealStore((state) => state.meal);
	const materialRevision = useCurrentMealStore((state) => state.materialRevision);
	const reference = useMealEstimateStore((state) => state.reference);
	const contract = useMealEstimateStore((state) => state.contract);
	const intents = usePendingSaveStore((state) => state.intents);
	const draft = isReferenceDraft(editable) ? editable : null;

	const hasResult = contract === "reference" && reference.phase === "ready" && reference.result !== null && reference.saveRequestId !== null;
	const isFresh = hasResult && draft !== null && reference.draftId === draft.id && reference.materialRevision === materialRevision;
	// N1: a legitimate in-flight recalculation or a failed one for THIS draft
	// is a valid session, not an invalid direct entry. Only a route visit with
	// no estimate state for the current draft recovers via redirect.
	const hasSession = contract === "reference" && draft !== null && reference.draftId === draft.id
		&& (hasResult || reference.phase === "loading" || reference.phase === "read_error" || reference.phase === "offline");
	const isRecalculating = hasSession && !hasResult && reference.phase === "loading";
	const rawIntent = reference.saveRequestId ? intents[reference.saveRequestId] : undefined;
	const intent = rawIntent && isReferenceIntent(rawIntent) ? rawIntent : undefined;

	useEffect(() => {
		if (pathname !== "/meals/estimate" || hasSession) return;
		router.push((draft?.items.length ?? 0) > 0 ? "/meals/new" : "/log-meal", "back", "replace");
	}, [draft?.items.length, hasSession, pathname, router]);

	if (!hasSession || !draft) return null;

	const isSaving = intent?.phase === "inFlight";
	const canRetry = intent?.phase === "ambiguous";
	const canSave = isFresh && !intent && canDispatchReferenceSave(draft.id);
	const footerLabel = !isFresh
		? "Calculate again"
		: isSaving
			? "Saving to History…"
			: canRetry
				? "Retry this save"
				: intent
					? "Save needs review"
					: "Save to History";
	const statusIsLive = Boolean(intent);

	const handlePrimary = () => {
		if (!isFresh) {
			if (reference.phase === "loading") return;
			void calculateCurrentReferenceEstimate();
			return;
		}
		if (canRetry && reference.saveRequestId) {
			void retryReferenceSaveIntent(reference.saveRequestId, { replaceRoute: (destination) => router.push(destination, "forward", "replace") });
			return;
		}
		void saveCurrentReferenceEstimate({ replaceRoute: (destination) => router.push(destination, "forward", "replace") });
	};

	// N1: a valid session without a result yet (recalculating) or with a
	// failed recalculation stays on this route with its draft: loading or
	// error copy plus retry, Save never enabled, no values recreated.
	if (!hasResult || !reference.result) {
		return (
			<IonPage>
				<IonContent className='result-page estimate-page' fullscreen>
					<ResultHero image={draft.image} mealName={draft.name} defaultHref='/meals/new' imageAlt='Meal estimate photo' />
					<main className='result-sheet'>
						<p className='confirmation-kicker'>{REFERENCE_RESULT_KICKER}</p>
						<h1 className='result-meal-name'>{draft.name}</h1>
						{isRecalculating ? (
							<section className='estimate-model-status' role='status' aria-live='polite' aria-atomic='true'>
								<p className='estimate-stale-copy'>Recalculating your estimate…</p>
							</section>
						) : (
							<section className='estimate-model-status' role='alert'>
								<p className='estimate-stale-copy'>{describeReferenceErrorCode(reference.errorCode, reference.phase)}</p>
							</section>
						)}
					</main>
				</IonContent>
				<IonFooter className='result-dock estimate-dock'>
					<div className='estimate-footer-state'>
						<IonButton
							expand='block'
							aria-label={isRecalculating ? "Calculating estimate" : "Calculate again"}
							disabled={isRecalculating}
							onClick={handlePrimary}
						>
							{isRecalculating ? "Calculating…" : "Calculate again"}
						</IonButton>
					</div>
				</IonFooter>
			</IonPage>
		);
	}

	return (
		<IonPage>
			<IonContent className='result-page estimate-page' fullscreen>
				<ResultHero image={draft.image} mealName={draft.name} defaultHref='/meals/new' imageAlt='Meal estimate photo' />
				<main className='result-sheet'>
					<p className='confirmation-kicker'>{REFERENCE_RESULT_KICKER}</p>
					<h1 className='result-meal-name'>{draft.name}</h1>
					<div className='estimate-identity-actions'>
						<IonButton fill='clear' size='small' onClick={() => router.push("/meals/new", "back")}>Adjust meal</IonButton>
					</div>

					{!isFresh && (
						<section className='estimate-model-status' role='status' aria-live='polite' aria-atomic='true'>
							<p className='estimate-stale-copy'>{REFERENCE_STALE_ESTIMATE_MESSAGE}</p>
						</section>
					)}

					<ReferenceAssessment response={{ assessment_state: "evaluated", assessment: reference.result, reasons: reference.result.reasons }} />

					<details className='result-footnotes'>
						<summary tabIndex={0}>What this doesn&rsquo;t mean</summary>
						<div className='result-footnotes-content'>
							<p>{APP_DISCLAIMER}</p>
						</div>
					</details>
				</main>
			</IonContent>

			<IonFooter className='result-dock estimate-dock'>
				<div
					className='estimate-footer-state'
					role={statusIsLive ? "status" : undefined}
					aria-live={statusIsLive ? "polite" : undefined}
					aria-atomic={statusIsLive ? "true" : undefined}
				>
					{intent && <p className='estimate-footer-support'>{referenceSaveCopy[intent.phase]}</p>}
					<IonButton
						expand='block'
						aria-label={footerLabel}
						disabled={isSaving || (isFresh && !canSave && !canRetry)}
						onClick={handlePrimary}
					>
						{isSaving && <IonSpinner name='crescent' aria-hidden='true' />}
						{footerLabel}
					</IonButton>
				</div>
			</IonFooter>
		</IonPage>
	);
};

// The flag is fixed at build time, so this branch never reorders hooks.
const MealEstimate = () => (REFERENCE_PREVIEW_MODE ? <ReferenceMealEstimate /> : <LegacyMealEstimate />);

export default MealEstimate;
