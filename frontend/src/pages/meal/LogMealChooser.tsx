import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonTitle, useIonRouter } from "@ionic/react";
import { camera, create, repeat } from "ionicons/icons";

import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { useMealEstimateStore } from "../../stores/mealEstimateStore";
import { LOG_MEAL_OPTIONS, LogMealOptionId } from "../../utils/logMealOptions";
import { REFERENCE_PREVIEW_MODE } from "../../utils/experimentalPresentationGate";

const OPTION_ICONS: Record<LogMealOptionId, string> = {
	photo: camera,
	manual: create,
	previous: repeat,
};

const releaseFocusedElement = () => {
	if (document.activeElement instanceof HTMLElement) {
		const shadowActiveElement = document.activeElement.shadowRoot?.activeElement;
		if (shadowActiveElement instanceof HTMLElement) {
			shadowActiveElement.blur();
		}
		document.activeElement.blur();
	}
};

const LogMealChooser: React.FC = () => {
	const router = useIonRouter();
	const { resetMealAs, addEmptyMealItem, addEmptyReferenceItem } = useCurrentMealStore();

	// Every entry point starts a draft under the configured contract, so a
	// reference draft is never produced by casting a legacy one.
	const startFreshDraft = () => resetMealAs(REFERENCE_PREVIEW_MODE ? "reference" : "legacy");

	const handleChoice = (choice: LogMealOptionId) => {
		releaseFocusedElement();
		useMealEstimateStore.getState().clearEstimate();

		if (choice === "photo") {
			startFreshDraft();
			router.push("/meals/new/ai", "forward");
			return;
		}

		if (choice === "manual") {
			startFreshDraft();
			if (REFERENCE_PREVIEW_MODE) addEmptyReferenceItem();
			else addEmptyMealItem();
			router.push("/meals/new", "forward");
			return;
		}

		router.push("/meals/previous", "forward");
	};

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper>
					<IonTitle>Log Meal</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='ion-padding'>
				<div className='log-meal-intro'>
					<h1>How would you like to add it?</h1>
				</div>

				<div className='log-meal-options'>
					{LOG_MEAL_OPTIONS.map((option) => (
						<IonButton key={option.id} className='log-meal-option' fill='clear' expand='block' aria-label={option.title} onClick={() => handleChoice(option.id)}>
							<IonIcon aria-hidden='true' icon={OPTION_ICONS[option.id]} />
							<span className='log-meal-option-copy'>
								<strong>{option.title}</strong>
								<small>{option.description}</small>
							</span>
						</IonButton>
					))}
				</div>
			</IonContent>
		</IonPage>
	);
};

export default LogMealChooser;
