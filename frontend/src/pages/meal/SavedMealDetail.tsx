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
	UNKNOWN_ITEMS_NOTICE,
	getEstimateQualityCopy,
	humanizeFiiSource,
	isRoughEstimateSource,
	isUnknownSource,
	shouldShowProvidedFiiDisclaimer,
} from "../../utils/safetyCopy";
import { ACUTE_SCORE_SCALE_EXPLAINER, getAcuteScoreDetailLine } from "../../utils/acuteScoreDisplay";
import { getResultCompositionLine, getResultLoggedLine, getVisibleDrivers } from "../../utils/resultPresentation";

// Read-only saved-meal detail view (issue #89). Dashboard Recents opens saved
// meals here so their canonical acute_score, estimate_quality,
// main_insulin_drivers, and per-item fii/source/why stay visible. The meal is
// rendered straight from the persistent store and is never passed through
// buildDraftFromSavedMeal — that trust boundary belongs exclusively to the
// Meals-tab "tap a meal to reuse it" flow, which still creates a fresh
// editable draft. This screen offers no editing and no way to save a copy.
//
// Annotated Journal J5 (issue #120) rebuilt the presentation as a Porcelain
// Journal page under design-constitution §6.7-interim: hero, editorial meal
// identity, the existing insulinImpactPresentation title at verdict weight,
// the sealed score/reference lines in mid-size tabular numerals instead of the
// retired circular meter, hairline evidence rows, and one footnote disclosure.
// Every displayed number, label, and disclaimer still renders verbatim from the
// backend record and the sealed helpers; no scoring, persistence, deletion,
// routing, or provenance behaviour changed.
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
						<h2>Meal Not Found</h2>
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
	// Constitution §6.9: an insufficient-data result still shows what could be
	// read, de-emphasised — and only when a finite score actually exists.
	const showNominalReading = isHardToEstimate && displayScore !== undefined;
	const estimateQualityCopy = meal.estimate_quality ? getEstimateQualityCopy(meal.estimate_quality) : null;
	const hasUnknownItems = meal.items.some((item) => isUnknownSource(item.source));
	// One notice for the meal, not one per item: the constitution forbids the
	// same disclaimer stacking on a single screen. Per-item provenance stays
	// visible on each evidence row and in Advanced details.
	const hasRoughEstimateItems = meal.items.some((item) => isRoughEstimateSource(item.source));
	const visibleImpactDrivers = getVisibleDrivers(meal.main_insulin_drivers);

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

					{estimateQualityCopy && (
						<p className='result-quality'>
							<span className='result-quality-label'>Data quality: {estimateQualityCopy.label}.</span>{" "}
							<span className='result-quality-description'>{estimateQualityCopy.description}</span>
						</p>
					)}
					{hasUnknownItems && <p className='result-notice'>{UNKNOWN_ITEMS_NOTICE}</p>}
					{hasRoughEstimateItems && <p className='result-notice'>{ROUGH_ESTIMATE_NOTICE}</p>}

					{showAcuteScoreDetails && (
						<div className='result-score'>
							<p className='result-score-line'>{getAcuteScoreDetailLine(displayScore)}</p>
							<p className='result-score-caption'>{ACUTE_SCORE_SCALE_EXPLAINER}</p>
						</div>
					)}

					{showNominalReading && (
						<section className='result-nominal-note' aria-labelledby='result-nominal-heading'>
							<h3 id='result-nominal-heading' className='result-kicker'>What we could read</h3>
							<p className='result-nominal-line'>{getAcuteScoreDetailLine(displayScore)}</p>
							<p className='result-score-caption'>{ACUTE_SCORE_SCALE_EXPLAINER}</p>
						</section>
					)}

					<EvidenceRows items={meal.items} drivers={visibleImpactDrivers} muted={isHardToEstimate} />

					<details className='result-footnotes'>
						<summary>What this doesn't mean</summary>
						<div className='result-footnotes-content'>
							<p>{MEAL_SCORE_DISCLAIMER}</p>
							<p>{APP_DISCLAIMER}</p>
						</div>
					</details>

					<details className='result-advanced advanced-details'>
						<summary>{ADVANCED_DETAILS_LABEL}</summary>
						<div className='advanced-details-content'>
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
										{item.source && <p>Source: {humanizeFiiSource(item.source)}</p>}
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
