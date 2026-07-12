import { IonContent, IonHeader, IonPage, IonTitle, IonCard, IonItem, IonIcon } from "@ionic/react";
import React, { useEffect, useState } from "react";
import { syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { fetchChronicMetricsFromAPI, ChronicMetricsResponse } from "../../api/api";
import { calculateTotalCalories, calculateTotalCarbohydrates, calculateTotalSaturatedFat, getMealAcuteScore, getMealTimeShortString } from "../../utils";
import AcuteScoreProgressbar from "../../components/AcuteScoreProgressbar";
import { Meal } from "../../types/Meal";
import { batteryCharging, chevronForward, flame, pizza } from "ionicons/icons";
import { NutrimentComponent } from "../../components/NutrimentComponent";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { CHRONIC_TREND_DISCLAIMER } from "../../utils/safetyCopy";
import { getAcuteScoreCaption } from "../../utils/acuteScoreDisplay";
import {
	TREND_LOADING_LINE,
	TREND_NO_DATA_LINE,
	TREND_STATUS_LINE,
	TREND_UNAVAILABLE_LINE,
	getTrendAriaLabel,
	getTrendCoverageText,
	getTrendRingValue,
	getTrendText,
} from "../../utils/trendDisplay";

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

	// Logged-days-only trend (issue #93): the rolling value is null when no
	// day in the window has logs, and coverage says how many days contributed.
	// The displayed number is an energy-normalized index (kcal-weighted mean
	// FII) — not total or average daily insulin demand — and it can exceed
	// 100, so only the ring geometry caps. See utils/trendDisplay.ts.
	const rolling7dDii = chronicMetrics?.current_rolling_7d_dii;
	const trendValue = typeof rolling7dDii === "number" && Number.isFinite(rolling7dDii) ? Math.round(rolling7dDii * 100) : undefined;
	const trendText = getTrendText(trendValue, isChronicLoading);
	const windowDays = chronicMetrics?.window_days ?? 7;
	const loggedDays = chronicMetrics?.logged_days_last_7 ?? 0;
	const coverageText = chronicMetrics ? getTrendCoverageText(loggedDays, windowDays) : null;
	const trendStatusText = isChronicLoading
		? TREND_LOADING_LINE
		: trendValue === undefined
			? chronicError ?? (chronicMetrics && !chronicMetrics.has_data ? TREND_NO_DATA_LINE : TREND_UNAVAILABLE_LINE)
			: TREND_STATUS_LINE;
	const trendAriaLabel = getTrendAriaLabel(trendValue, loggedDays, windowDays);

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
							<p className='hero-eyebrow'>Logged meals, last 7 days</p>
							<h2 className='hero-title'>7-Day Logged Meal Trend</h2>

							<div className='hero-bezel'>
								<div role='img' aria-label={trendAriaLabel} className='hero-ring'>
									<CircularProgressbar
										value={getTrendRingValue(trendValue)}
										maxValue={100}
										text={trendText}
										strokeWidth={8}
										styles={buildStyles({
											textSize: "2.1rem",
											pathColor: trendValue === undefined ? "#9aa5ad" : "#2f86c0",
											textColor: trendValue === undefined ? "#9aa5ad" : "#2f86c0",
											trailColor: "#e8edf3",
											strokeLinecap: "round",
										})}
									/>
								</div>
							</div>

							<p className='hero-status'>{trendStatusText}</p>

							<div className='hero-meta'>
								{coverageText && <span>{coverageText}</span>}
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
						<p className='journey-cue'>Each logged meal feeds the 7-day trend above — days you don't log are left out of it, so log the days you want reflected.</p>

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
	// Recents is a history/review affordance (issue #89): open the saved meal's
	// read-only detail view with its canonical score intact. Reuse-as-a-new-draft
	// (buildDraftFromSavedMeal) belongs only to the Meals tab's explicit
	// "tap a meal to reuse it" flow.
	return (
		<IonItem lines='none' detail={false} button routerLink={`/meals/saved/${encodeURIComponent(meal.id)}`} key={meal.id} className='recent-card'>
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
				<span className='recent-card-score-label'>{getAcuteScoreCaption(getMealAcuteScore(meal))}</span>
			</div>
			<IonIcon slot='end' icon={chevronForward} size='small' style={{ color: "#8a97a5" }} />
		</IonItem>
	);
}
