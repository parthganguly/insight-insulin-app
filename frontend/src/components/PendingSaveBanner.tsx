import { IonButton, IonIcon } from "@ionic/react";
import { alertCircle, checkmarkCircle } from "ionicons/icons";
import { useIonRouter } from "@ionic/react";

import { useCurrentMealStore } from "../stores/currentMealStore";
import { usePendingSaveStore } from "../stores/pendingSaveStore";
import { retrySaveIntent } from "../utils/mealSaveCoordinator";

const phaseCopy = {
	inFlight: "Saving this meal in the background…",
	ambiguous: "This save needs reconciliation.",
	rejected: "This meal was not saved because the request was rejected.",
	conflicted: "This save attempt cannot be retried.",
} as const;

const PendingSaveBanner = () => {
	const intents = usePendingSaveStore((state) => state.intents);
	const notices = usePendingSaveStore((state) => state.notices);
	const removeIntent = usePendingSaveStore((state) => state.removeIntent);
	const dismissNotice = usePendingSaveStore((state) => state.dismissNotice);
	const currentDraftId = useCurrentMealStore((state) => state.meal.id);
	const router = useIonRouter();
	const entries = Object.entries(intents).slice(0, 3);
	const overflow = Math.max(0, Object.keys(intents).length - entries.length);

	if (entries.length === 0 && notices.length === 0) return null;

	return (
		<aside className='pending-save-banner' aria-label='Meal save status'>
			{entries.map(([requestId, intent]) => (
				<section key={requestId} className='pending-save-entry' role='status' aria-live='polite'>
					<IonIcon icon={alertCircle} aria-hidden='true' />
					<div>
						<strong>{intent.request.meal_name}</strong>
						<p>{intent.lastError ?? phaseCopy[intent.phase]}</p>
						<div className='pending-save-actions'>
							{intent.phase === "ambiguous" && (
								<IonButton size='small' onClick={() => void retrySaveIntent(requestId, {
									replaceRoute: (destination) => router.push(destination, "forward", "replace"),
								})}>Retry this save</IonButton>
							)}
							{intent.phase === "rejected" && intent.draftId === currentDraftId && (
								<IonButton size='small' fill='clear' onClick={() => router.push("/meals/new", "back")}>Edit meal</IonButton>
							)}
							{intent.phase === "conflicted" && (
								<>
									<IonButton size='small' onClick={() => router.push("/meals", "root")}>Open History</IonButton>
									<IonButton size='small' fill='clear' onClick={() => removeIntent(requestId)}>Discard this save attempt</IonButton>
								</>
							)}
						</div>
					</div>
				</section>
			))}
			{overflow > 0 && <p className='pending-save-overflow'>+{overflow} more save {overflow === 1 ? "attempt" : "attempts"}</p>}
			{notices.map((notice) => (
				<section key={notice.id} className='pending-save-entry pending-save-notice' role='status'>
					<IonIcon icon={checkmarkCircle} aria-hidden='true' />
					<div><p>{notice.message}</p><IonButton size='small' fill='clear' onClick={() => dismissNotice(notice.id)}>Dismiss</IonButton></div>
				</section>
			))}
		</aside>
	);
};

export default PendingSaveBanner;
