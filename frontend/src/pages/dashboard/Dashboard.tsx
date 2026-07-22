import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonPage, IonTitle } from "@ionic/react";
import React, { useEffect, useState } from "react";
import { cogOutline } from "ionicons/icons";
import { fetchChronicMetricsFromAPI, ChronicMetricsResponse } from "../../api/api";
import JournalEntryCard from "../../components/JournalEntryCard";
import TypographicPlate from "../../components/TypographicPlate";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import { getHomeTrendCoverageLine, resolveHomeLifecycleState } from "../../utils/homeMealJourney";
import { getHomeFolioLine, groupJournalMealsByDay } from "../../utils/journalPresentation";
import { CHRONIC_TREND_DISCLAIMER } from "../../utils/safetyCopy";
import {
	TREND_LOADING_LINE,
	TREND_NO_DATA_LINE,
	TREND_STATUS_LINE,
	TREND_UNAVAILABLE_LINE,
	getTrendAriaLabel,
	getTrendCoverageText,
	getTrendText,
	resolveTrendState,
} from "../../utils/trendDisplay";

const Dashboard: React.FC = () => {
	const meals = usePersistentMealStore((state) => state.meals);
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
				if (isActive) setIsChronicLoading(false);
			}
		};

		void loadChronicMetrics();

		return () => {
			isActive = false;
		};
	}, [meals.length]);

	// Logged-days-only trend semantics remain exactly as before J2. Only the
	// circular presentation is removed; the raw number is still uncapped.
	const rolling7dDii = chronicMetrics?.current_rolling_7d_dii;
	const trendValue = typeof rolling7dDii === "number" && Number.isFinite(rolling7dDii) ? Math.round(rolling7dDii * 100) : undefined;
	const trendText = getTrendText(trendValue, isChronicLoading);
	const windowDays = chronicMetrics?.window_days ?? 7;
	const loggedDays = chronicMetrics?.logged_days_last_7 ?? 0;
	const coverageText = chronicMetrics ? getTrendCoverageText(loggedDays, windowDays) : null;
	const trendState = resolveTrendState({
		isLoading: isChronicLoading,
		errorMessage: chronicError,
		hasResponse: chronicMetrics !== null,
		hasData: chronicMetrics?.has_data ?? false,
		trend: trendValue,
	});
	const trendStatusText =
		trendState === "loading"
			? TREND_LOADING_LINE
			: trendState === "unavailable"
				? chronicError ?? TREND_UNAVAILABLE_LINE
				: trendState === "no-data"
					? TREND_NO_DATA_LINE
					: TREND_STATUS_LINE;
	const trendAriaLabel = getTrendAriaLabel(trendState, trendValue, loggedDays, windowDays);
	const homeState = resolveHomeLifecycleState({
		mealCount: meals.length,
		loggedDaysLast7: chronicMetrics?.logged_days_last_7,
		coverageKnown: chronicMetrics !== null,
	});
	const buildingHistoryLine = chronicMetrics ? getHomeTrendCoverageLine(loggedDays, windowDays) : "";
	const journalGroups = groupJournalMealsByDay(meals);

	return (
		<IonPage>
			<IonHeader className='home-masthead'>
				<IonToolbarWrapper>
					<IonTitle>Home</IonTitle>
					<IonButtons slot='end'>
						<IonButton routerLink='/settings' className='home-settings-action' aria-label='Settings'>
							<IonIcon aria-hidden='true' icon={cogOutline} />
							<span>Settings</span>
						</IonButton>
					</IonButtons>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='home-journal-content'>
				{homeState === "empty" ? (
					<section className='home-empty-state' aria-labelledby='home-empty-title'>
						<TypographicPlate mealName='INSIGHT' monogram='Ins.' className='home-empty-plate' />
						<h1 id='home-empty-title'>Understand and compare the estimated insulin demand of meals.</h1>
						<p>Snap a photo or describe your meal — INSIGHT estimates its insulin demand, shows what drove the number, and tells you honestly how solid the estimate is.</p>
						<p className='home-boundary-note'>Relative, population-level estimates. Nothing here measures your body or gives medical advice.</p>
					</section>
				) : (
					<>
						<section className='home-folio' aria-labelledby='home-folio-title'>
							<h1 id='home-folio-title'>{getHomeFolioLine()}</h1>
							{homeState === "trend-ready" ? (
								<div className='home-trend-annotation'>
									<p className='home-trend-sentence' role='img' aria-label={trendAriaLabel}>
										{coverageText ? (
											<>
												<span>{coverageText}</span> · 7-day index{" "}
											</>
										) : (
											"7-day index "
										)}
										<strong>{trendText}</strong>
									</p>
									<p className='home-trend-gloss'>{trendStatusText}</p>
									<details className='home-trend-footnote'>
										<summary>What this doesn't mean</summary>
										<p className='home-trend-boundary'>{CHRONIC_TREND_DISCLAIMER}</p>
									</details>
								</div>
							) : (
								<p className='home-building-line' role='status'>
									{buildingHistoryLine}
								</p>
							)}
						</section>

						<div className='home-journal-entries'>
							{journalGroups.map((group, groupIndex) => (
								<section key={`${group.label}-${groupIndex}`} aria-labelledby={`journal-day-${groupIndex}`}>
									<h2 className='journal-daybreak' id={`journal-day-${groupIndex}`}>
										{group.label}
									</h2>
									{group.meals.map((meal) => (
										<JournalEntryCard key={meal.id} meal={meal} />
									))}
								</section>
							))}
						</div>
					</>
				)}
			</IonContent>

			<IonFooter className='home-action-dock'>
				<IonButton expand='block' routerLink='/log-meal' aria-label='Check a meal'>
					Check a meal
				</IonButton>
			</IonFooter>
		</IonPage>
	);
};

export default Dashboard;
