import {
	IonBackButton,
	IonButton,
	IonButtons,
	IonCard,
	IonCardContent,
	IonCardHeader,
	IonCardTitle,
	IonContent,
	IonHeader,
	IonIcon,
	IonImg,
	IonLoading,
	IonPage,
	IonText,
	IonTitle,
	IonToast,
	useIonAlert,
	useIonRouter,
} from "@ionic/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { batteryCharging, flame, pizza, trash } from "ionicons/icons";

import { deleteMealEverywhere, syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import AcuteScoreProgressbar from "../../components/AcuteScoreProgressbar";
import { NutrimentComponent } from "../../components/NutrimentComponent";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import {
	calculateTotalCalories,
	calculateTotalCarbohydrates,
	calculateTotalItemCalories,
	calculateTotalItemCarbohydrates,
	calculateTotalItemSaturatedFat,
	calculateTotalSaturatedFat,
	getMealAcuteScore,
	getMealTimeString,
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

// Read-only saved-meal detail view (issue #89). Dashboard Recents opens saved
// meals here so their canonical acute_score, estimate_quality,
// main_insulin_drivers, and per-item fii/source/why stay visible. The meal is
// rendered straight from the persistent store and is never passed through
// buildDraftFromSavedMeal — that trust boundary belongs exclusively to the
// Meals-tab "tap a meal to reuse it" flow, which still creates a fresh
// editable draft. This screen offers no editing and no way to save a copy.
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
	const showAcuteScoreDetails = !isHardToEstimatePresentation(impactPresentation) && displayScore !== undefined;
	const estimateQualityCopy = meal.estimate_quality ? getEstimateQualityCopy(meal.estimate_quality) : null;
	const hasUnknownItems = meal.items.some((item) => isUnknownSource(item.source));
	const visibleImpactDrivers = (meal.main_insulin_drivers ?? []).filter((driver) => driver.trim().length > 0).slice(0, 3);
	const itemWhyLines = meal.items.filter((item) => item.why?.trim()).map((item) => item.why!.trim());
	const roughEstimateItems = meal.items.filter((item) => isRoughEstimateSource(item.source));

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper className='ion-text-left'>
					<IonButtons slot='start'>
						<IonBackButton defaultHref='/dashboard' />
					</IonButtons>
					<IonTitle>Meal result</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='ion-padding result-page'>
				<section className='result-section result-conclusion' aria-labelledby='result-conclusion-heading'>
					<IonCard className='app-card'>
						<IonCardHeader>
							<IonCardTitle id='result-conclusion-heading'>{impactPresentation.title}</IonCardTitle>
						</IonCardHeader>
						<IonCardContent>
							<IonText color='medium'><p>{impactPresentation.description}</p></IonText>
							{meal.image && <IonImg src={meal.image} alt='Saved meal photo' className='meal-journey-photo result-meal-photo' />}
							<h2 className='result-meal-name'>{meal.name}</h2>
							<span className='meal-status-pill meal-status-saved'>{SAVED_MEAL_STATUS}</span>
							<IonText color='medium'>
								<p className='result-meal-meta'>Total Items: {meal.items.length}<br />Logged at: {getMealTimeString(meal)}</p>
							</IonText>
						</IonCardContent>
					</IonCard>
				</section>

				<section className='result-section' aria-labelledby='result-estimate-heading'>
					<IonCard className='app-card'>
						<IonCardHeader><IonCardTitle id='result-estimate-heading'>The estimate</IonCardTitle></IonCardHeader>
						<IonCardContent>
							{showAcuteScoreDetails && (
								<div className='result-score-row'>
									<AcuteScoreProgressbar meal={meal} style={{ width: 72, height: 72, flexShrink: 0 }} />
									<div>
										<IonText color='medium'><p>{getAcuteScoreDetailLine(displayScore)}</p></IonText>
										<IonText color='medium'><p className='result-scale-line'>{ACUTE_SCORE_SCALE_EXPLAINER}</p></IonText>
									</div>
								</div>
							)}
							<div className='recent-card-chips result-nutrition-chips'>
								<NutrimentComponent nutrimentIcon={flame} nutrimentIconColor={"#d96a52"} nutrimentName={"kcal"} nutrimentValue={Math.round(meal.kcal_total ?? calculateTotalCalories(meal))} />
								<NutrimentComponent nutrimentIcon={pizza} nutrimentIconColor={"#d9a62e"} nutrimentName={"carbs"} nutrimentValue={`${Math.round(meal.carbs_total ?? calculateTotalCarbohydrates(meal))} g`} />
								<NutrimentComponent nutrimentIcon={batteryCharging} nutrimentIconColor={"#2f86c0"} nutrimentName={"sat. fat"} nutrimentValue={`${Math.round(calculateTotalSaturatedFat(meal))} g`} />
							</div>
						</IonCardContent>
					</IonCard>
				</section>

				<section className='result-section' aria-labelledby='result-drivers-heading'>
					<IonCard className='app-card'>
						<IonCardHeader><IonCardTitle id='result-drivers-heading'>Main drivers</IonCardTitle></IonCardHeader>
						<IonCardContent>
							{visibleImpactDrivers.length > 0 && (
								<div className='result-driver-chips'>
									{visibleImpactDrivers.map((driver, index) => <span key={`${index}-${driver}`}>{driver}</span>)}
								</div>
							)}
							{itemWhyLines.length > 0 && (
								<div className='result-why-lines'>
									{itemWhyLines.map((line, index) => <IonText key={`${index}-${line}`} color='medium'><p>{line}</p></IonText>)}
								</div>
							)}
						</IonCardContent>
					</IonCard>
				</section>

				<section className='result-section' aria-labelledby='result-quality-heading'>
					<IonCard className='app-card'>
						<IonCardHeader><IonCardTitle id='result-quality-heading'>Estimate quality and limitations</IonCardTitle></IonCardHeader>
						<IonCardContent>
							{estimateQualityCopy && (
								<div className='result-quality'>
									<span className='result-quality-pill'>Data quality: {estimateQualityCopy.label}.</span>{" "}
									<IonText color='medium'><span>{estimateQualityCopy.description}</span></IonText>
								</div>
							)}
							{hasUnknownItems && <IonText color='warning'><p>{UNKNOWN_ITEMS_NOTICE}</p></IonText>}
							{roughEstimateItems.map((item) => <IonText key={item.id} color='medium'><p>{ROUGH_ESTIMATE_NOTICE}</p></IonText>)}
						</IonCardContent>
					</IonCard>
				</section>

				<section className='result-section' aria-labelledby='result-limitations-heading'>
					<IonCard className='app-card'>
						<IonCardHeader><IonCardTitle id='result-limitations-heading'>What this does not mean</IonCardTitle></IonCardHeader>
						<IonCardContent>
							<div className='disclaimer-note result-disclaimer'>{MEAL_SCORE_DISCLAIMER}</div>
							<div className='disclaimer-note result-disclaimer'>{APP_DISCLAIMER}</div>
						</IonCardContent>
					</IonCard>
				</section>

				<section className='result-section result-actions' aria-label='Next actions'>
					<IonButton expand='block' routerLink='/log-meal'>Check another meal</IonButton>
					<IonButton expand='block' fill='outline' routerLink='/dashboard'>Done</IonButton>
					<IonButton expand='block' color='danger' fill='outline' onClick={handleDeleteMeal}>
						<IonIcon icon={trash} slot='start' />
						Delete Saved Meal
					</IonButton>
				</section>

				<section className='result-section result-advanced'>
					<details className='advanced-details'>
						<summary>{ADVANCED_DETAILS_LABEL}</summary>
						<div className='advanced-details-content'>
							{meal.items.length === 0 ? (
								<IonText color='medium'><p>This saved meal has no item breakdown.</p></IonText>
							) : (
								meal.items.map((item) => (
									<IonCard key={item.id} className='app-card advanced-item-card'>
										<IonCardHeader><IonCardTitle>{item.name}</IonCardTitle></IonCardHeader>
										<IonCardContent>
											<div className='advanced-nutrient-totals'>
												<NutrimentComponent nutrimentName='Calories' nutrimentValue={calculateTotalItemCalories(item)} nutrimentIcon={flame} nutrimentIconColor='#d96a52' />
												<NutrimentComponent nutrimentName='Carbohydrates' nutrimentValue={calculateTotalItemCarbohydrates(item)} nutrimentIcon={pizza} nutrimentIconColor='#d9a62e' />
												<NutrimentComponent nutrimentName='Saturated Fats' nutrimentValue={calculateTotalItemSaturatedFat(item)} nutrimentIcon={batteryCharging} nutrimentIconColor='#2f86c0' />
											</div>
											<p>FII: {item.fii ?? ""}</p>
											<p>Glycemic Index: {item.gi}</p>
											{item.source && <p>Source: {humanizeFiiSource(item.source)}</p>}
											{shouldShowProvidedFiiDisclaimer(item.source, item.fii) && <IonText color='medium'><p>{PROVIDED_FII_DISCLAIMER}</p></IonText>}
										</IonCardContent>
									</IonCard>
								))
							)}
						</div>
					</details>
				</section>

				<IonLoading isOpen={isDeleting} message='Deleting meal…' />
				<IonToast isOpen={showToast} message={toastMessage} duration={2200} color='danger' onDidDismiss={() => setShowToast(false)} />
			</IonContent>
		</IonPage>
	);
};

export default SavedMealDetail;
