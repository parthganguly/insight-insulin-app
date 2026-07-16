import { IonContent, IonHeader, IonPage, IonTitle, IonItem, IonThumbnail, IonImg } from "@ionic/react";
import { useEffect } from "react";
import { syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import AcuteScoreProgressbar from "../../components/AcuteScoreProgressbar";
import { Meal } from "../../types/Meal";
import { calculateTotalCalories, getMealAcuteScore, getMealTimeShortString } from "../../utils";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { getAcuteScoreCaption } from "../../utils/acuteScoreDisplay";

const History: React.FC = () => {
	const { meals } = usePersistentMealStore();

	useEffect(() => {
		// Private-beta hydration: show backend-seeded/saved meals on a fresh load. Fails soft offline.
		void syncMealsFromBackend();
	}, []);

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper>
					<IonTitle>History</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='ion-padding'>
				<div className='section-label'>
					<span>Saved meals</span>
					<span>most recent first</span>
				</div>
				{meals.length === 0 ? (
					<div className='app-card list-empty-state'>
						<h2>No saved meals yet</h2>
						<p>Meals you check and save will appear here.</p>
					</div>
				) : (
					meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
				)}
			</IonContent>
		</IonPage>
	);
};

export default History;

function MealCard({ meal }: { meal: Meal }) {
	return (
		<IonItem lines='none' detail={false} button className='recent-card' routerLink={`/meals/saved/${encodeURIComponent(meal.id)}`}>
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
}
