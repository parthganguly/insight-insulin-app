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
	IonItem,
	IonItemDivider,
	IonLabel,
	IonList,
	IonLoading,
	IonNote,
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
import { SAVED_MEAL_STATUS } from "../../utils/mealDraftUx";
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
				{meal.image && (
					<IonImg
						src={meal.image}
						alt='Saved meal photo'
						style={{
							width: "100%",
							height: "200px",
							objectFit: "cover",
							borderRadius: "16px",
							marginBottom: "1rem",
						}}
					/>
				)}

				<IonCard style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.24)" }}>
					<IonCardHeader>
						<IonCardTitle style={{ fontSize: "20px" }}>{meal.name}</IonCardTitle>
						<span className='meal-status-pill meal-status-saved'>{SAVED_MEAL_STATUS}</span>
						<IonText color='medium'>
							<p style={{ marginTop: "4px" }}>
								Total Items: {meal.items.length} <br />
								Logged at: {getMealTimeString(meal)}
							</p>
						</IonText>
						<div className='recent-card-chips'>
							<NutrimentComponent nutrimentIcon={flame} nutrimentIconColor={"#d96a52"} nutrimentName={"kcal"} nutrimentValue={Math.round(meal.kcal_total ?? calculateTotalCalories(meal))} />
							<NutrimentComponent nutrimentIcon={pizza} nutrimentIconColor={"#d9a62e"} nutrimentName={"carbs"} nutrimentValue={`${Math.round(meal.carbs_total ?? calculateTotalCarbohydrates(meal))} g`} />
							<NutrimentComponent nutrimentIcon={batteryCharging} nutrimentIconColor={"#2f86c0"} nutrimentName={"sat. fat"} nutrimentValue={`${Math.round(calculateTotalSaturatedFat(meal))} g`} />
						</div>
					</IonCardHeader>
				</IonCard>

				<IonCard style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.18)", borderLeft: `6px solid ${impactPresentation.color}` }}>
					<IonCardHeader>
						<IonCardTitle style={{ fontSize: "1rem", color: impactPresentation.color }}>Estimated Insulin Demand</IonCardTitle>
						<IonText color='medium' style={{ fontSize: "0.82rem", marginTop: "2px", display: "block" }}>
							{MEAL_SCORE_DISCLAIMER}
						</IonText>
						{estimateQualityCopy && (
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
								<span
									style={{
										padding: "4px 10px",
										borderRadius: "999px",
										background: "#f4f6f8",
										fontSize: "0.78rem",
										fontWeight: 600,
									}}>
									Data quality: {estimateQualityCopy.label}
								</span>
								<IonText color='medium' style={{ fontSize: "0.78rem" }}>
									<span>{estimateQualityCopy.description}</span>
								</IonText>
							</div>
						)}
					</IonCardHeader>
					<IonCardContent>
						<IonText>
							<h3 style={{ marginTop: 0, marginBottom: "8px" }}>{impactPresentation.title}</h3>
						</IonText>
						{showAcuteScoreDetails && (
							<div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
								<AcuteScoreProgressbar meal={meal} style={{ width: 72, height: 72, flexShrink: 0 }} />
								<div>
									<IonText color='medium' style={{ fontSize: "0.85rem" }}>
										<p style={{ margin: "0 0 4px" }}>{getAcuteScoreDetailLine(displayScore)}</p>
									</IonText>
									<IonText color='medium' style={{ fontSize: "0.78rem" }}>
										<p style={{ margin: 0 }}>{ACUTE_SCORE_SCALE_EXPLAINER}</p>
									</IonText>
								</div>
							</div>
						)}
						<IonText color='medium'>
							<p style={{ marginTop: 0 }}>{impactPresentation.description}</p>
						</IonText>
						{hasUnknownItems && (
							<IonText color='warning'>
								<p style={{ marginTop: "8px", marginBottom: 0, fontSize: "0.85rem" }}>{UNKNOWN_ITEMS_NOTICE}</p>
							</IonText>
						)}
						{visibleImpactDrivers.length > 0 && (
							<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
								{visibleImpactDrivers.map((driver) => (
									<span
										key={driver}
										style={{
											padding: "6px 10px",
											borderRadius: "999px",
											background: "#f4f6f8",
											fontSize: "0.82rem",
										}}>
										{driver}
									</span>
								))}
							</div>
						)}
					</IonCardContent>
				</IonCard>

				<IonItemDivider>
					<IonLabel>Meal Items</IonLabel>
				</IonItemDivider>

				{meal.items.length === 0 ? (
					<IonText color='medium'>
						<p className='item-list-helper'>This saved meal has no item breakdown.</p>
					</IonText>
				) : (
					<IonList inset={true} style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.24)" }}>
						{meal.items.map((item) => (
							<IonItem key={item.id} lines='full' detail={false}>
								<IonLabel>
									<h2 style={{ marginBottom: "0.5rem" }}>{item.name}</h2>
									<IonNote color='medium' className='ion-text-wrap'>
										<NutrimentComponent nutrimentName='Calories' nutrimentValue={calculateTotalItemCalories(item)} nutrimentIcon={flame} nutrimentIconColor='#d96a52' />
										<NutrimentComponent nutrimentName='Carbohydrates' nutrimentValue={calculateTotalItemCarbohydrates(item)} nutrimentIcon={pizza} nutrimentIconColor='#d9a62e' />
										<NutrimentComponent nutrimentName='Saturated Fats' nutrimentValue={calculateTotalItemSaturatedFat(item)} nutrimentIcon={batteryCharging} nutrimentIconColor='#2f86c0' />
									</IonNote>
									{item.source ? (
										<IonText color='medium' style={{ fontSize: "0.85rem" }}>
											<p style={{ marginTop: "8px", marginBottom: 0 }}>Source: {humanizeFiiSource(item.source)}</p>
										</IonText>
									) : null}
									{shouldShowProvidedFiiDisclaimer(item.source, item.fii) ? (
										<IonText color='medium' style={{ fontSize: "0.85rem" }}>
											<p style={{ marginTop: "8px", marginBottom: 0 }}>{PROVIDED_FII_DISCLAIMER}</p>
										</IonText>
									) : null}
									{isRoughEstimateSource(item.source) ? (
										<IonText color='medium' style={{ fontSize: "0.85rem" }}>
											<p style={{ marginTop: "8px", marginBottom: 0 }}>{ROUGH_ESTIMATE_NOTICE}</p>
										</IonText>
									) : null}
									{item.why ? (
										<IonText color='medium' style={{ fontSize: "0.85rem" }}>
											<p style={{ marginTop: "8px", marginBottom: 0 }}>{item.why}</p>
										</IonText>
									) : null}
								</IonLabel>
							</IonItem>
						))}
					</IonList>
				)}

				<IonText color='medium'>
					<p style={{ fontSize: "0.82rem", marginTop: "12px" }}>
						This is the saved record of this meal. To log it again, open the <strong>Meals</strong> tab and tap it under "Re-add Previous Meals".
					</p>
				</IonText>

				<IonButton expand='block' color='danger' fill='outline' className='ion-margin-vertical' onClick={handleDeleteMeal}>
					<IonIcon icon={trash} slot='start' />
					Delete Saved Meal
				</IonButton>

				<div className='disclaimer-note' style={{ marginBottom: "1.5rem" }}>
					{APP_DISCLAIMER}
				</div>

				<IonLoading isOpen={isDeleting} message='Deleting meal…' />
				<IonToast isOpen={showToast} message={toastMessage} duration={2200} color='danger' onDidDismiss={() => setShowToast(false)} />
			</IonContent>
		</IonPage>
	);
};

export default SavedMealDetail;
