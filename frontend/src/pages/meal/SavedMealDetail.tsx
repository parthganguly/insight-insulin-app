import {
	IonBackButton,
	IonButton,
	IonButtons,
	IonCard,
	IonContent,
	IonFooter,
	IonHeader,
	IonLoading,
	IonPage,
	IonTitle,
	IonToast,
	useIonAlert,
	useIonRouter,
} from "@ionic/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { deleteMealEverywhere, syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import EvidenceRows from "../../components/EvidenceRows";
import ResultHero from "../../components/ResultHero";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import {
	calculateTotalItemCalories,
	calculateTotalItemCarbohydrates,
	calculateTotalItemSaturatedFat,
	getMealAcuteScore,
} from "../../utils";
import { getImpactPresentation, isHardToEstimatePresentation } from "../../utils/insulinImpactPresentation";
import { ADVANCED_DETAILS_LABEL, SAVED_MEAL_STATUS } from "../../utils/mealDraftUx";
import {
	APP_DISCLAIMER,
	MEAL_SCORE_DISCLAIMER,
	PROVIDED_FII_DISCLAIMER,
	ROUGH_ESTIMATE_NOTICE,
	getSavedResultSourceCopy,
	getSavedResultUnknownItemsNotice,
	isRoughEstimateSource,
	isUnknownSource,
	shouldShowProvidedFiiDisclaimer,
} from "../../utils/safetyCopy";
import {
	SAVED_RESULT_SCALE_DISCLOSURE,
	SAVED_RESULT_SCORE_BOUNDARY,
	getSavedResultScoreAriaLabel,
	getSavedResultScoreLine,
} from "../../utils/acuteScoreDisplay";
import { getResultCompositionLine, getResultLoggedLine } from "../../utils/resultPresentation";

// Read-only saved-meal detail view (issues #89/#125). Dashboard Recents opens
// saved meals here so their canonical acute_score and item/source facts can be
// presented without turning estimate_quality, main_insulin_drivers, or legacy
// item why text into user-facing scientific authority. The meal is rendered
// straight from the persistent store and is never passed through
// buildDraftFromSavedMeal — that trust boundary belongs exclusively to the
// Meals-tab "tap a meal to reuse it" flow, which still creates a fresh
// editable draft. This screen offers no editing and no way to save a copy.
//
// Annotated Journal J5 (issue #120) rebuilt the presentation as a Porcelain
// Journal page under design-constitution §6.7-interim. J7 retains that hero,
// editorial identity, hairline evidence, and anchored dock while applying the
// frozen relative-score, model-coverage, and software-action provenance
// contract. No scoring, persistence, deletion, routing, or canonical backend
// token changes are made here.
const SavedMealDetail: React.FC = () => {
	const { mealId } = useParams<{ mealId: string }>();
	// react-router v5 does not decode URL params; Dashboard encodes the id.
	// A malformed hand-typed link (e.g. a stray "%") must fall through to the
	// not-found state instead of throwing during render.
	let decodedMealId: string | null = null;
	try {
		decodedMealId = decodeURIComponent(mealId);
	} catch {
		decodedMealId = null;
	}
	const meal = usePersistentMealStore((s) => (decodedMealId === null ? undefined : s.meals.find((m) => m.id === decodedMealId)));

	const router = useIonRouter();
	const [presentAlert] = useIonAlert();
	const [isDeleting, setIsDeleting] = useState(false);
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");

	useEffect(() => {
		// Private-beta hydration: show backend-seeded/saved meals on a fresh load
		// (including a direct link to this page). Fails soft offline.
		void syncMealsFromBackend();
	}, []);

	const performMealDeletion = async () => {
		if (!meal) return;
		// Same delete integrity as the review screen (issue #78): backend-first,
		// and the local copy only goes away after the backend deletion succeeded.
		setIsDeleting(true);
		const result = await deleteMealEverywhere(meal);
		setIsDeleting(false);

		if (!result.deleted) {
			setToastMessage("Couldn't delete this meal, so it is still saved. Check that the app can reach the server and try again.");
			setShowToast(true);
			return;
		}

		router.goBack();
	};

	const handleDeleteMeal = () => {
		if (!meal) return;
		// Everything on this screen is already persisted history, so deletion is
		// destructive and permanent — always confirm first.
		void presentAlert({
			header: "Delete saved meal?",
			message: "This permanently removes the saved meal from your history.",
			buttons: [
				{ text: "Cancel", role: "cancel" },
				{ text: "Delete", role: "destructive", handler: () => void performMealDeletion() },
			],
		});
	};

	if (!meal) {
		return (
			<IonPage>
				<IonHeader>
					<IonToolbarWrapper className='ion-text-left'>
						<IonButtons slot='start'>
							<IonBackButton defaultHref='/dashboard' />
						</IonButtons>
						<IonTitle>Saved Meal</IonTitle>
					</IonToolbarWrapper>
				</IonHeader>
				<IonContent className='ion-padding'>
					<IonCard className='app-card empty-state-card'>
						<h1>Meal Not Found</h1>
						<p>This meal isn't in your saved history on this device. It may have been deleted.</p>
					</IonCard>
				</IonContent>
			</IonPage>
		);
	}

	const impactPresentation = getImpactPresentation(meal);
	const displayScore = getMealAcuteScore(meal);
	const isHardToEstimate = isHardToEstimatePresentation(impactPresentation);
	const showAcuteScoreDetails = !isHardToEstimate && displayScore !== undefined;
	// Issue #125: a finite value on the canonical hard-to-estimate path is only
	// a partial model output. It stays available for auditability inside
	// Advanced details and never receives normal-result prominence.
	const showPartialModelOutput = isHardToEstimate && displayScore !== undefined;
	const unknownItemNames = meal.items.filter((item) => isUnknownSource(item.source)).map((item) => item.name);
	const hasUnknownItems = unknownItemNames.length > 0;
	// One notice for the meal, not one per item: the constitution forbids the
	// same disclaimer stacking on a single screen. Per-item provenance stays
	// visible on each evidence row and in Advanced details.
	const hasRoughEstimateItems = meal.items.some((item) => isRoughEstimateSource(item.source));

	return (
		<IonPage>
			<IonContent className='result-page' fullscreen>
				<ResultHero image={meal.image} mealName={meal.name} />

				<main className='result-sheet'>
					<span className='meal-status-pill meal-status-saved'>{SAVED_MEAL_STATUS}</span>
					<h1 className='result-meal-name'>{meal.name}</h1>
					<p className='result-meal-meta'>{getResultCompositionLine(meal)}</p>
					<p className='result-meal-meta'>{getResultLoggedLine(meal)}</p>

					<h2 className='result-verdict'>{impactPresentation.title}</h2>
					<p className='result-verdict-support'>{impactPresentation.description}</p>

					{showAcuteScoreDetails && (
						<div className='result-score' role='group' aria-label={getSavedResultScoreAriaLabel(displayScore)}>
							<p className='result-score-line' aria-hidden='true'>{getSavedResultScoreLine(displayScore)}</p>
							<p className='result-score-caption' aria-hidden='true'>{SAVED_RESULT_SCORE_BOUNDARY}</p>
						</div>
					)}

					{hasUnknownItems && <p className='result-notice'>{getSavedResultUnknownItemsNotice(unknownItemNames)}</p>}
					{hasRoughEstimateItems && <p className='result-notice'>{ROUGH_ESTIMATE_NOTICE}</p>}

					<EvidenceRows items={meal.items} muted={isHardToEstimate} />

					<details className='result-footnotes result-score-method'>
						<summary tabIndex={0}>How this score works</summary>
						<div className='result-footnotes-content'>
							<p>{SAVED_RESULT_SCALE_DISCLOSURE}</p>
						</div>
					</details>

					<details className='result-footnotes'>
						<summary tabIndex={0}>What this doesn't mean</summary>
						<div className='result-footnotes-content'>
							<p>{MEAL_SCORE_DISCLAIMER}</p>
							<p>{APP_DISCLAIMER}</p>
						</div>
					</details>

					<details className='result-advanced advanced-details'>
						<summary tabIndex={0}>{ADVANCED_DETAILS_LABEL}</summary>
						<div className='advanced-details-content'>
							{showPartialModelOutput && displayScore !== undefined && (
								<section className='result-partial-output' aria-labelledby='result-partial-output-heading'>
									<h3 id='result-partial-output-heading' className='result-kicker'>Partial model output</h3>
									<p className='result-partial-line'>{getSavedResultScoreLine(displayScore)}</p>
									<p className='result-advanced-note'>Calculated only from items the current model could estimate; this does not represent a complete meal estimate.</p>
								</section>
							)}
							{meal.items.length === 0 ? (
								<p className='result-advanced-empty'>This saved meal has no item breakdown.</p>
							) : (
								meal.items.map((item) => (
									<article className='result-advanced-item' key={item.id}>
										<h4 className='result-advanced-name'>{item.name}</h4>
										<div className='result-advanced-values'>
											<div className='result-advanced-row'><span>Calories</span><strong>{calculateTotalItemCalories(item)} kcal</strong></div>
											<div className='result-advanced-row'><span>Carbohydrates</span><strong>{calculateTotalItemCarbohydrates(item)} g</strong></div>
											<div className='result-advanced-row'><span>Saturated Fats</span><strong>{calculateTotalItemSaturatedFat(item)} g</strong></div>
										</div>
										<p>FII: {item.fii ?? ""}</p>
										<p>Glycemic Index: {item.gi}</p>
										{item.source && <p>Model handling: {getSavedResultSourceCopy(item.source)}</p>}
										{shouldShowProvidedFiiDisclaimer(item.source, item.fii) && <p className='result-advanced-note'>{PROVIDED_FII_DISCLAIMER}</p>}
									</article>
								))
							)}
						</div>
					</details>
				</main>

				<IonLoading isOpen={isDeleting} message='Deleting meal…' />
				<IonToast isOpen={showToast} message={toastMessage} duration={2200} color='danger' onDidDismiss={() => setShowToast(false)} />
			</IonContent>

			{/*
				The dock is a footer sibling of IonContent, not `slot="fixed"` content
				inside it. An Ionic fixed slot is absolutely positioned against the
				ion-content box and painted from a shadow slot; on the Samsung
				SM-M356B (Android 16 / API 36) that stopped holding once the result
				grew tall — font scale 1.3 with both disclosures open — and the scroll
				content took over the dock's region. A footer is laid out by ion-page's
				flex column instead, so it reserves real space above the tab bar and
				cannot be scrolled over or composited under the scrolling content. This
				is the same pattern the device-validated Home dock uses.
			*/}
			<IonFooter className='result-dock'>
				<IonButton expand='block' routerLink='/log-meal'>Check another meal</IonButton>
				<div className='result-dock-secondary'>
					<IonButton expand='block' fill='clear' routerLink='/dashboard'>Done</IonButton>
					<IonButton expand='block' fill='clear' className='result-delete-button' aria-label='Delete saved meal' onClick={handleDeleteMeal}>Delete</IonButton>
				</div>
			</IonFooter>
		</IonPage>
	);
};

export default SavedMealDetail;
