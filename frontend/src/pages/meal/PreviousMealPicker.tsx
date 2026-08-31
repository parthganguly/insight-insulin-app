import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle } from "@ionic/react";
import { useEffect } from "react";

import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import PreviousMealEntryCard from "../../components/PreviousMealEntryCard";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { useMealEstimateStore } from "../../stores/mealEstimateStore";
import { syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import { Meal } from "../../types/Meal";
import { buildDraftFromSavedMeal } from "../../utils/fiiTrustBoundary";
import { groupJournalMealsByDay } from "../../utils/journalPresentation";

// The previous-meal picker as a journal folio (Slice J6, issue #123). It shares
// the History entry presentation deliberately, but never its meaning: this page
// is a selection step inside the Log Meal journey, and the reuse law below is
// unchanged — a saved meal becomes a fresh editable draft that the user still
// has to review, and the saved source record is never touched.
const PreviousMealPicker: React.FC = () => {
	const meals = usePersistentMealStore((state) => state.meals);
	const setMeal = useCurrentMealStore((state) => state.setMeal);

	useEffect(() => {
		void syncMealsFromBackend();
	}, []);

	const reuseMeal = (meal: Meal) => {
		const draft = buildDraftFromSavedMeal(meal);
		useMealEstimateStore.getState().clearEstimate();
		setMeal({
			...draft,
			items: draft.items.map((item) => ({ ...item, draftProvenance: "user_entered" })),
		});
	};

	const journalGroups = groupJournalMealsByDay(meals);

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper className='journal-folio-toolbar'>
					<IonButtons slot='start'>
						<IonBackButton defaultHref='/log-meal' text='' aria-label='Back' />
					</IonButtons>
					<IonTitle>Choose a previous meal</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='journal-folio-content'>
				<section className='journal-folio' aria-labelledby='picker-folio-title'>
					<h1 id='picker-folio-title'>Log a previous meal again</h1>
					{meals.length > 0 && (
						<p className='journal-folio-explainer'>Pick a meal to start a new draft you can review and edit. The original stays unchanged in History.</p>
					)}
				</section>

				{meals.length === 0 ? (
					<section className='journal-empty-state' aria-labelledby='picker-empty-title'>
						<h2 id='picker-empty-title'>No previous meals yet</h2>
						<p>Meals you save will appear here for quick reuse.</p>
					</section>
				) : (
					<div className='journal-folio-entries'>
						{journalGroups.map((group, groupIndex) => (
							<section key={`${group.label}-${groupIndex}`} aria-labelledby={`picker-day-${groupIndex}`}>
								<h2 className='journal-daybreak' id={`picker-day-${groupIndex}`}>
									{group.label}
								</h2>
								{group.meals.map((meal) => (
									<PreviousMealEntryCard key={meal.id} meal={meal} onSelect={() => reuseMeal(meal)} />
								))}
							</section>
						))}
					</div>
				)}
			</IonContent>
		</IonPage>
	);
};

export default PreviousMealPicker;
