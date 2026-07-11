import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonFabButton, IonIcon, IonFab, IonItem, IonThumbnail, IonImg, useIonRouter } from "@ionic/react";
import { add } from "ionicons/icons";
import { useEffect } from "react";
import { syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import AcuteScoreProgressbar from "../../components/AcuteScoreProgressbar";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { Meal } from "../../types/Meal";
import { calculateTotalCalories, getMealAcuteScore, getMealTimeShortString } from "../../utils";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { buildDraftFromSavedMeal } from "../../utils/fiiTrustBoundary";
import { getAcuteScoreCaption } from "../../utils/acuteScoreDisplay";

const AddMeal: React.FC = () => {
	const { meals } = usePersistentMealStore();
	const { resetMeal, meal } = useCurrentMealStore();

	useEffect(() => {
		// Private-beta hydration: show backend-seeded/saved meals on a fresh load. Fails soft offline.
		void syncMealsFromBackend();
	}, []);

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper className='ion-text-center'>
					<IonTitle>Meals</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='ion-padding'>
				<IonFab slot='fixed' vertical='bottom' horizontal='end'>
					<IonFabButton onClick={resetMeal} routerLink='/meals/new'>
						<IonIcon icon={add}></IonIcon>
					</IonFabButton>
				</IonFab>
				{/* {meal.name !== "New Meal" && (
					<>
						<IonText color='medium'>
							<h2 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>Current Meal</h2>
						</IonText>
						<MealCard key={meal.id} meal={meal} />
					</>
				)} */}
				<div className='section-label'>
					<span>Re-add Previous Meals</span>
					<span>tap a meal to reuse it</span>
				</div>
				{meals.map((meal) => (
					<MealCard key={meal.id} meal={meal} />
				))}
			</IonContent>
		</IonPage>
	);
};

export default AddMeal;

function MealCard({ meal }: { meal: Meal }) {
	const { getMealById } = usePersistentMealStore();
	const { setMeal } = useCurrentMealStore();

	function handleClick(mealId: string) {
		// Navigate to existing meal details
		const meal = getMealById(mealId);
		if (!meal) {
			return;
		}
		setMeal(buildDraftFromSavedMeal(meal));
	}

	return (
		<IonItem lines='none' detail={false} button className='recent-card' onClick={() => handleClick(meal.id)} routerLink='/meals/new'>
			{meal.image && (
				<IonThumbnail slot='start' style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
					<IonImg src={meal.image ?? ""} alt='Meal Image' style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }} />
				</IonThumbnail>
			)}

			<div style={{ minWidth: 0, flex: 1 }}>
				<h3 className='recent-card-name'>{meal.name}</h3>
				<span className='recent-card-time'>{getMealTimeShortString(meal)}</span>
				<span className='draft-item-hint'>{Math.round(calculateTotalCalories(meal))} kcal</span>
			</div>

			<div slot='end' className='recent-card-score'>
				<AcuteScoreProgressbar meal={meal} style={{ width: 46, height: 46 }} />
				<span className='recent-card-score-label'>{getAcuteScoreCaption(getMealAcuteScore(meal))}</span>
			</div>
		</IonItem>
	);
}
