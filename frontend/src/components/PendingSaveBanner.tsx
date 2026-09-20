import { IonButton, IonIcon } from "@ionic/react";
import { alertCircle, checkmarkCircle } from "ionicons/icons";
import { useIonRouter } from "@ionic/react";
import { useLocation } from "react-router-dom";
import { useState } from "react";

import { useCurrentMealStore } from "../stores/currentMealStore";
import { useMealEstimateStore } from "../stores/mealEstimateStore";
import { AnySaveIntent, isReferenceIntent, usePendingSaveStore } from "../stores/pendingSaveStore";
import { doesPendingSaveCoverCurrentDraft } from "../utils/mealFlowGuard";
import {
	REFERENCE_DISCARD_WARNING,
	referenceSaveCopy,
	resolveReferenceCleanup,
	retrySaveIntent,
} from "../utils/mealSaveCoordinator";

const legacyPhaseCopy = {
	inFlight: "Saving this meal in the background…",
	ambiguous: "This save needs reconciliation.",
	rejected: "This meal was not saved because the request was rejected.",
	conflicted: "This save attempt cannot be retried.",
} as const;

export const JOURNAL_UNREADABLE_COPY = "This device can't read its saved retry records, so new reference saves and deletions are paused.";
export const RECOVERY_ERROR_COPY = "A saved retry record on this device can't be read. It is kept as-is; remove it explicitly to continue.";

const COLLAPSED_ENTRIES = 3;

const describeIntent = (intent: AnySaveIntent): { title: string; message: string } =>
	isReferenceIntent(intent)
		? { title: "Reference meal save", message: referenceSaveCopy[intent.phase] }
		: { title: intent.request.meal_name, message: intent.lastError ?? legacyPhaseCopy[intent.phase] };

const PendingSaveBanner = () => {
	const intents = usePendingSaveStore((state) => state.intents);
	const notices = usePendingSaveStore((state) => state.notices);
	const journalStatus = usePendingSaveStore((state) => state.journalStatus);
	const recoveryErrors = usePendingSaveStore((state) => state.recoveryErrors);
	const cleanupRequired = usePendingSaveStore((state) => state.cleanupRequired);
	const removeIntent = usePendingSaveStore((state) => state.removeIntent);
	const discardReferenceIntent = usePendingSaveStore((state) => state.discardReferenceIntent);
	const dismissRecoveryError = usePendingSaveStore((state) => state.dismissRecoveryError);
	const dismissNotice = usePendingSaveStore((state) => state.dismissNotice);
	const currentMeal = useCurrentMealStore((state) => state.meal);
	const editRevision = useCurrentMealStore((state) => state.editRevision);
	const contract = useMealEstimateStore((state) => state.contract);
	const legacyDraftId = useMealEstimateStore((state) => state.draftId);
	const referenceDraftId = useMealEstimateStore((state) => state.reference.draftId);
	const legacySaveRequestId = useMealEstimateStore((state) => state.saveRequestId);
	const referenceSaveRequestId = useMealEstimateStore((state) => state.reference.saveRequestId);
	const estimateDraftId = contract === "reference" ? referenceDraftId : legacyDraftId;
	const saveRequestId = contract === "reference" ? referenceSaveRequestId : legacySaveRequestId;
	const { pathname } = useLocation();
	const router = useIonRouter();
	const [expanded, setExpanded] = useState(false);

	const cleanupEntries = Object.values(cleanupRequired);
	const cleanupBlocked = cleanupEntries.length > 0;
	const visibleIntents = Object.entries(intents).filter(([requestId, intent]) => {
		if (cleanupRequired[requestId]) return false;
		const ownedByEstimateFooter = pathname === "/meals/estimate"
			&& (intent.phase === "inFlight" || intent.phase === "ambiguous")
			&& doesPendingSaveCoverCurrentDraft({ meal: currentMeal, estimateDraftId, saveRequestId, intent, editRevision });
		return !ownedByEstimateFooter;
	});
	// Every entry stays reachable: the old "+N more" text named entries it
	// gave no way to open.
	const entries = expanded ? visibleIntents : visibleIntents.slice(0, COLLAPSED_ENTRIES);
	const hidden = visibleIntents.length - entries.length;

	if (entries.length === 0 && notices.length === 0 && recoveryErrors.length === 0 && !cleanupBlocked && journalStatus !== "read_error") return null;

	return (
		<aside className='pending-save-banner' aria-label='Meal save status'>
			{journalStatus === "read_error" && (
				<section className='pending-save-entry' role='status' aria-live='polite'>
					<IonIcon icon={alertCircle} aria-hidden='true' />
					<div><p>{JOURNAL_UNREADABLE_COPY}</p></div>
				</section>
			)}

			{cleanupEntries.map((record) => (
				<section key={record.requestId} className='pending-save-entry' role='status' aria-live='polite'>
					<IonIcon icon={checkmarkCircle} aria-hidden='true' />
					<div>
						<strong>Saved on server</strong>
						<p>This device still has to clear the retry record for this meal. Saving and deleting stay paused until it does.</p>
						<div className='pending-save-actions'>
							<IonButton size='small' onClick={() => resolveReferenceCleanup(record.requestId)}>Clear retry record</IonButton>
							<IonButton size='small' fill='clear' onClick={() => router.push(`/meals/saved/${encodeURIComponent(record.savedMealId)}`, "forward")}>Open saved meal</IonButton>
						</div>
					</div>
				</section>
			))}

			{recoveryErrors.map((error) => (
				<section key={error.requestId} className='pending-save-entry' role='status' aria-live='polite'>
					<IonIcon icon={alertCircle} aria-hidden='true' />
					<div>
						<strong>Retry record can't be read</strong>
						<p>{RECOVERY_ERROR_COPY}</p>
						<p className='pending-save-detail'>{REFERENCE_DISCARD_WARNING}</p>
						<div className='pending-save-actions'>
							<IonButton size='small' fill='clear' onClick={() => dismissRecoveryError(error.requestId)}>Remove this retry record</IonButton>
						</div>
					</div>
				</section>
			))}

			{entries.map(([requestId, intent]) => {
				const { title, message } = describeIntent(intent);
				const reference = isReferenceIntent(intent);
				return (
					<section key={requestId} className='pending-save-entry' role='status' aria-live='polite'>
						<IonIcon icon={alertCircle} aria-hidden='true' />
						<div>
							<strong>{title}</strong>
							<p>{message}</p>
							<div className='pending-save-actions'>
								{intent.phase === "ambiguous" && !cleanupBlocked && (
									<IonButton size='small' onClick={() => void retrySaveIntent(requestId, {
										replaceRoute: (destination) => router.push(destination, "forward", "replace"),
									})}>Retry this save</IonButton>
								)}
								{(intent.phase === "rejected" || intent.phase === "stale_catalog") && intent.draftId === currentMeal.id && (
									<IonButton size='small' fill='clear' onClick={() => router.push("/meals/new", "back")}>Edit meal</IonButton>
								)}
								{(intent.phase === "conflicted" || intent.phase === "ambiguous") && (
									<IonButton size='small' fill='clear' onClick={() => router.push("/meals", "root")}>Open History</IonButton>
								)}
								{reference ? (
									<IonButton size='small' fill='clear' onClick={() => discardReferenceIntent(requestId)}>Discard this save attempt</IonButton>
								) : (intent.phase === "rejected" || intent.phase === "conflicted") && (
									<IonButton size='small' fill='clear' onClick={() => removeIntent(requestId)}>Discard this save attempt</IonButton>
								)}
							</div>
							{reference && <p className='pending-save-detail'>{REFERENCE_DISCARD_WARNING}</p>}
						</div>
					</section>
				);
			})}

			{(hidden > 0 || expanded) && visibleIntents.length > COLLAPSED_ENTRIES && (
				<IonButton size='small' fill='clear' className='pending-save-overflow' aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>
					{expanded ? "Show fewer save attempts" : `Show ${hidden} more save ${hidden === 1 ? "attempt" : "attempts"}`}
				</IonButton>
			)}

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
