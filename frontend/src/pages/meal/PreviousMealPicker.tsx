import { IonContent, IonHeader, IonImg, IonItem, IonPage, IonThumbnail, IonTitle } from "@ionic/react";
import { useEffect } from "react";

import AcuteScoreProgressbar from "../../components/AcuteScoreProgressbar";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { calculateTotalCalories, getMealAcuteScore, getMealTimeShortString } from "../../utils";
import { getAcuteScoreCaption } from "../../utils/acuteScoreDisplay";
import { buildDraftFromSavedMeal } from "../../utils/fiiTrustBoundary";

const PreviousMealPicker: React.FC = () => {
	const meals = usePersistentMealStore((state) => state.meals);

	useEffect(() => {
		void syncMealsFromBackend();
	}, []);

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper>
					<IonTitle>Choose a previous meal</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='ion-padding'>
				<div className='section-label'>
					<span>Saved meals</span>
					<span>choose one to edit and log again</span>
				</div>
				{meals.length === 0 ? (
					<div className='app-card list-empty-state'>
						<h2>No previous meals yet</h2>
						<p>Meals you save will appear here for quick reuse.</p>
					</div>
				) : (
					meals.map((meal) => <PreviousMealCard key={meal.id} meal={meal} />)
				)}
			</IonContent>
		</IonPage>
	);
};

const PreviousMealCard = ({ meal }: { meal: Meal }) => {
	const setMeal = useCurrentMealStore((state) => state.setMeal);
	const reuseMeal = () => {
		const draft = buildDraftFromSavedMeal(meal);
		setMeal({
			...draft,
			items: draft.items.map((item) => ({ ...item, draftProvenance: "user_entered" })),
		});
	};

	return (
		<IonItem
			lines='none'
			detail={false}
			button
			className='recent-card'
			onClick={reuseMeal}
			routerLink='/meals/new'>
			{meal.image && (
				<IonThumbnail slot='start' className='meal-card-thumbnail'>
					<IonImg src={meal.image} alt='' className='meal-card-image' />
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
};

export default PreviousMealPicker;
