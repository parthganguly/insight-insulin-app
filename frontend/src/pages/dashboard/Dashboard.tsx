import { IonContent, IonHeader, IonPage, IonTitle, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonText, IonLabel, IonItem, IonThumbnail, IonIcon, IonItemDivider } from "@ionic/react";
import React, { useEffect, useState } from "react";
import { usePersistentMealStore } from "../../stores/persistentMealStore";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { fetchChronicMetricsFromAPI, ChronicMetricsResponse } from "../../api/api";
import { calculateTotalCalories, calculateTotalCarbohydrates, calculateTotalSaturatedFat, getMealTimeString } from "../../utils";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import AcuteScoreProgressbar from "../../components/AcuteScoreProgressbar";
import { Meal } from "../../types/Meal";
import { batteryCharging, chevronForward, flame, pizza } from "ionicons/icons";
import { NutrimentComponent } from "../../components/NutrimentComponent";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";

const Dashboard: React.FC = () => {
	const meals = usePersistentMealStore((s) => s.meals);
	const [chronicMetrics, setChronicMetrics] = useState<ChronicMetricsResponse | null>(null);
	const [isChronicLoading, setIsChronicLoading] = useState(false);
	const [chronicError, setChronicError] = useState<string | null>(null);

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
					<IonText color='medium'>
						<IonCard
							style={{
								borderRadius: "16px",
								boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
								padding: "1.5rem 1rem",
								textAlign: "center",
								margin: "2rem auto",
								maxWidth: 350,
							}}>
							<IonCardHeader>
								<IonCardTitle style={{ fontSize: "1.2rem", fontWeight: 700 }}>No Meals Logged</IonCardTitle>
							</IonCardHeader>
							<IonCardContent>
								<IonText color='medium'>
									<p style={{ fontSize: "1rem", marginBottom: "1rem" }}>You haven't added any meals yet.</p>
									<p style={{ fontSize: "0.95rem" }}>
										Tap the <strong>Add Meal</strong> tab below to scan and log your first meal!
									</p>
								</IonText>
							</IonCardContent>
						</IonCard>
					</IonText>
				) : (
					<>
						<IonCard
							style={{
								borderRadius: "16px",
								margin: "0px",
								boxShadow: "0 4px 12px rgba(0, 0, 0, 0.21)",
							}}>
							<IonCardHeader>
								<IonCardTitle style={{ fontSize: "1.4rem", fontWeight: 700, textAlign: "center" }}>Chronic Score</IonCardTitle>
							</IonCardHeader>

							<IonCardContent style={{ paddingTop: "0.5rem" }}>
								<div style={{ width: 140, height: 140, margin: "0 auto" }}>
									<CircularProgressbar
										value={chronicScore ?? 0}
										maxValue={100}
										text={chronicText}
										styles={buildStyles({
											textSize: "2.2rem",
											pathColor: chronicScore === undefined ? "#95a5a6" : "#3498db",
											textColor: chronicScore === undefined ? "#95a5a6" : "#3498db",
											trailColor: "#dfe6f0",
										})}
									/>
								</div>

								<IonText color='medium'>
									<p style={{ marginTop: "1rem", textAlign: "center" }}>
										{chronicScore === undefined
											? chronicError ?? "Long-term backend trend data is unavailable right now."
											: "7-day rolling insulin-demand trend from saved backend meal data."}
									</p>
								</IonText>
							</IonCardContent>
						</IonCard>
						<IonItemDivider>
							<IonText color='medium' style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
								Recents
							</IonText>
						</IonItemDivider>

						{/* Other Meals */}
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

	const buildDraftFromSavedMeal = (savedMeal: Meal): Meal => ({
		...savedMeal,
		id: crypto.randomUUID(),
		timestamp: Date.now(),
		backend_created_at: undefined,
		acute_score: undefined,
		insulin_load_total: undefined,
		kcal_total: undefined,
		carbs_total: undefined,
		protein_total: undefined,
		fat_total: undefined,
		estimate_quality: undefined,
		main_insulin_drivers: undefined,
		items: savedMeal.items.map((item) => ({
			...item,
			id: crypto.randomUUID(),
		})),
	});

	const handleMealClick = (mealId: string) => {
		// Navigate to existing meal details
		const meal = getMealById(mealId);
		if (!meal) {
			return;
		}
		setMeal(buildDraftFromSavedMeal(meal));
	};

	return (
		<IonItem lines='none' onClick={() => handleMealClick(meal.id)} routerLink='/meals/new' key={meal.id} style={{ borderRadius: "16px", marginTop: "0.5rem", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.17)" }}>
			<IonThumbnail slot='end' style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
				<AcuteScoreProgressbar meal={meal} style={{ width: "100%", height: "100%", margin: "0 auto" }} />
			</IonThumbnail>
			<IonIcon slot='end' icon={chevronForward} size='small' />
			{/* {meal.image && (
				<IonThumbnail slot='start' style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
					<IonImg src={meal.image ?? ""} alt='Meal Image' style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
				</IonThumbnail>
			)} */}

			<IonLabel>
				<h3>{meal.name}</h3>
				<p style={{ fontSize: "12px" }}>{getMealTimeString(meal)}</p>
				<NutrimentComponent nutrimentIcon={flame} nutrimentIconColor={"#ff5151ff"} nutrimentName={"Calories"} nutrimentValue={meal.kcal_total ?? calculateTotalCalories(meal)} />
				<NutrimentComponent nutrimentIcon={pizza} nutrimentIconColor={"#ffcc00ff"} nutrimentName={"Carbs"} nutrimentValue={meal.carbs_total ?? calculateTotalCarbohydrates(meal)} />
				<NutrimentComponent nutrimentIcon={batteryCharging} nutrimentIconColor={"#3880ff"} nutrimentName={"Sat. Fat"} nutrimentValue={calculateTotalSaturatedFat(meal)} />
			</IonLabel>
		</IonItem>
	);
}
