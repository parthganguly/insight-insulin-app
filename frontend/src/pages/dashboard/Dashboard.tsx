import { IonContent, IonHeader, IonPage, IonTitle, IonCard, IonItem, IonIcon } from "@ionic/react";
import React, { useEffect, useState } from "react";
import { syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { fetchChronicMetricsFromAPI, ChronicMetricsResponse } from "../../api/api";
import { calculateTotalCalories, calculateTotalCarbohydrates, calculateTotalSaturatedFat, getMealTimeShortString } from "../../utils";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import AcuteScoreProgressbar from "../../components/AcuteScoreProgressbar";
import { Meal } from "../../types/Meal";
import { batteryCharging, chevronForward, flame, pizza } from "ionicons/icons";
import { NutrimentComponent } from "../../components/NutrimentComponent";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { buildDraftFromSavedMeal } from "../../utils/fiiTrustBoundary";
import { CHRONIC_TREND_DISCLAIMER } from "../../utils/safetyCopy";

const Dashboard: React.FC = () => {
	const meals = usePersistentMealStore((s) => s.meals);
	const [chronicMetrics, setChronicMetrics] = useState<ChronicMetricsResponse | null>(null);
	const [isChronicLoading, setIsChronicLoading] = useState(false);
	const [chronicError, setChronicError] = useState<string | null>(null);

	useEffect(() => {
		// Private-beta hydration: show backend-seeded/saved meals on a fresh load. Fails soft offline.
		void syncMealsFromBackend();
	}, []);

	useEffect(() => {
		let isActive = true;

		const loadChronicMetrics = async () => {
			if (meals.length === 0) {
				if (!isActive) return;
				setChronicMetrics(null);
				setChronicError(null);
				setIsChronicLoading(false);
				return;
			}

			setIsChronicLoading(true);
			setChronicError(null);

			try {
				const metrics = await fetchChronicMetricsFromAPI();
				if (!isActive) return;
				setChronicMetrics(metrics);
			} catch (error) {
				if (!isActive) return;
				console.error("Failed to load chronic metrics:", error);
				setChronicMetrics(null);
				setChronicError(error instanceof Error ? error.message : "Unable to load chronic metrics");
			} finally {
				if (isActive) {
					setIsChronicLoading(false);
				}
			}
		};

		void loadChronicMetrics();

		return () => {
			isActive = false;
		};
	}, [meals.length]);

	const rolling7dDii = chronicMetrics?.current_rolling_7d_dii;
	const chronicScore = typeof rolling7dDii === "number" && Number.isFinite(rolling7dDii) ? Math.round(rolling7dDii * 100) : undefined;
	const chronicText = isChronicLoading ? "..." : chronicScore === undefined ? "--" : `${chronicScore}`;

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper>
					<IonTitle>Dashboard</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='ion-padding'>
				{meals.length === 0 ? (
					<IonCard className='app-card empty-state-card'>
						<h2>No Meals Logged</h2>
						<p style={{ marginBottom: "0.75rem" }}>You haven't added any meals yet.</p>
						<p>
							Tap the <strong>Add Meal</strong> tab below to scan and log your first meal!
						</p>
					</IonCard>
				) : (
					<>
						<IonCard className='app-card hero-card'>
							<p className='hero-eyebrow'>7-day rolling trend</p>
							<h2 className='hero-title'>Chronic Score</h2>

							<div className='hero-bezel'>
								<div className='hero-ring'>
									<CircularProgressbar
										value={chronicScore ?? 0}
										maxValue={100}
										text={chronicText}
										strokeWidth={8}
										styles={buildStyles({
											textSize: "2.1rem",
											pathColor: chronicScore === undefined ? "#9aa5ad" : "#2f86c0",
											textColor: chronicScore === undefined ? "#9aa5ad" : "#2f86c0",
											trailColor: "#e8edf3",
											strokeLinecap: "round",
										})}
									/>
								</div>
							</div>

							<p className='hero-status'>
								{chronicScore === undefined
									? chronicError ?? "Long-term backend trend data is unavailable right now."
									: "7-day rolling insulin-demand trend from meals you logged."}
							</p>

							<div className='hero-meta'>
								<span>Window: last 7 days</span>
								<span>
									{meals.length} meal{meals.length === 1 ? "" : "s"} logged
								</span>
							</div>

							<div className='disclaimer-note'>{CHRONIC_TREND_DISCLAIMER}</div>
						</IonCard>

						<div className='section-label'>
							<span>Recents</span>
							<span>most recent first</span>
						</div>
						<p className='journey-cue'>Each logged meal feeds the 7-day pattern above — log meals daily to see your trend take shape.</p>

						{meals.map((meal) => {
							return <MealCard key={meal.id} meal={meal} />;
						})}
					</>
				)}
			</IonContent>
		</IonPage>
	);
};

export default Dashboard;

function MealCard({ meal }: { meal: Meal }) {
	const { getMealById } = usePersistentMealStore();
	const { setMeal } = useCurrentMealStore();

	const handleMealClick = (mealId: string) => {
		// Navigate to existing meal details
		const meal = getMealById(mealId);
		if (!meal) {
			return;
		}
		setMeal(buildDraftFromSavedMeal(meal));
	};

	return (
		<IonItem lines='none' detail={false} button onClick={() => handleMealClick(meal.id)} routerLink='/meals/new' key={meal.id} className='recent-card'>
			<div style={{ minWidth: 0, flex: 1 }}>
				<h3 className='recent-card-name'>{meal.name}</h3>
				<span className='recent-card-time'>{getMealTimeShortString(meal)}</span>
				<div className='recent-card-chips'>
					<NutrimentComponent nutrimentIcon={flame} nutrimentIconColor={"#d96a52"} nutrimentName={"kcal"} nutrimentValue={Math.round(meal.kcal_total ?? calculateTotalCalories(meal))} />
					<NutrimentComponent nutrimentIcon={pizza} nutrimentIconColor={"#d9a62e"} nutrimentName={"carbs"} nutrimentValue={`${Math.round(meal.carbs_total ?? calculateTotalCarbohydrates(meal))} g`} />
					<NutrimentComponent nutrimentIcon={batteryCharging} nutrimentIconColor={"#2f86c0"} nutrimentName={"sat. fat"} nutrimentValue={`${Math.round(calculateTotalSaturatedFat(meal))} g`} />
				</div>
			</div>
			<div slot='end' className='recent-card-score'>
				<AcuteScoreProgressbar meal={meal} style={{ width: 46, height: 46 }} />
				<span className='recent-card-score-label'>score</span>
			</div>
			<IonIcon slot='end' icon={chevronForward} size='small' style={{ color: "#8a97a5" }} />
		</IonItem>
	);
}
