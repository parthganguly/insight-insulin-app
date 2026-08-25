import { IonContent, IonHeader, IonPage, IonTitle } from "@ionic/react";
import { useEffect } from "react";
import { syncMealsFromBackend, usePersistentMealStore } from "../../stores/persistentMealStore";
import JournalEntryCard from "../../components/JournalEntryCard";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { groupJournalMealsByDay } from "../../utils/journalPresentation";

// History as the journal folio (Slice J6, issue #123). Presentation only: the
// page still hydrates and orders meals exactly as before, day grouping is
// display arithmetic over the timestamps already stored, and every entry still
// opens the canonical read-only saved result. Reuse remains available only
// through the explicit Log Meal chooser.
const History: React.FC = () => {
	const { meals } = usePersistentMealStore();

	useEffect(() => {
		// Private-beta hydration: show backend-seeded/saved meals on a fresh load. Fails soft offline.
		void syncMealsFromBackend();
	}, []);

	const journalGroups = groupJournalMealsByDay(meals);

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper>
					<IonTitle>History</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='journal-folio-content'>
				<section className='journal-folio' aria-labelledby='history-folio-title'>
					<h1 id='history-folio-title'>Meal journal</h1>
					{meals.length > 0 && <p className='journal-folio-explainer'>Tap an entry to revisit its saved result. To log one again, use Log Meal.</p>}
				</section>

				{meals.length === 0 ? (
					<section className='journal-empty-state' aria-labelledby='history-empty-title'>
						<h2 id='history-empty-title'>No saved meals yet</h2>
						<p>Meals you check and save will appear here.</p>
					</section>
				) : (
					<div className='journal-folio-entries'>
						{journalGroups.map((group, groupIndex) => (
							<section key={`${group.label}-${groupIndex}`} aria-labelledby={`history-day-${groupIndex}`}>
								<h2 className='journal-daybreak' id={`history-day-${groupIndex}`}>
									{group.label}
								</h2>
								{group.meals.map((meal) => (
									<JournalEntryCard key={meal.id} meal={meal} />
								))}
							</section>
						))}
					</div>
				)}
			</IonContent>
		</IonPage>
	);
};

export default History;
