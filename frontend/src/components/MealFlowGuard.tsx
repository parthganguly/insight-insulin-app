import { IonAlert } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import type { Action, Location } from "history";

import { useCurrentMealStore } from "../stores/currentMealStore";
import { useMealEstimateStore } from "../stores/mealEstimateStore";
import { usePendingSaveStore } from "../stores/pendingSaveStore";
import {
	armMealFlowBypass,
	consumeMealFlowBypass,
	decideMealFlowNavigation,
	doesPendingSaveCoverCurrentDraft,
	getDraftFingerprint,
	isInternalMealFlowPath,
	rememberMealFlowBaseline,
	takeRecoveredMealFlowBaseline,
} from "../utils/mealFlowGuard";
import { isReferenceDraft } from "../utils/referenceDraft";

type PendingNavigation = {
	location: Location;
	action: Action;
	kind: "prompt-draft" | "prompt-estimate";
};

const releaseFocusedElement = () => {
	const focusedElement = document.activeElement;
	if (focusedElement instanceof HTMLElement) focusedElement.blur();
};

// Stable app-level owner for the one real history blocker. The decision inputs
// live in a ref, so store changes do not tear down and re-register the blocker.
const MealFlowGuard = () => {
	const history = useHistory();
	const { pathname } = useLocation();
	const meal = useCurrentMealStore((state) => state.meal);
	// The guard follows whichever contract currently owns the estimate.
	const contract = useMealEstimateStore((state) => state.contract);
	const legacyDraftId = useMealEstimateStore((state) => state.draftId);
	const referenceDraftId = useMealEstimateStore((state) => state.reference.draftId);
	const preview = useMealEstimateStore((state) => state.preview);
	const referenceResult = useMealEstimateStore((state) => state.reference.result);
	const legacySaveRequestId = useMealEstimateStore((state) => state.saveRequestId);
	const referenceSaveRequestId = useMealEstimateStore((state) => state.reference.saveRequestId);
	const estimateDraftId = contract === "reference" ? referenceDraftId : legacyDraftId;
	const saveRequestId = contract === "reference" ? referenceSaveRequestId : legacySaveRequestId;
	const pendingIntent = usePendingSaveStore((state) => saveRequestId === null ? undefined : state.intents[saveRequestId]);
	const [pending, setPending] = useState<PendingNavigation | null>(null);
	const destructiveIntent = useRef<PendingNavigation | null>(null);

	const fingerprint = getDraftFingerprint(meal);
	const [restoredBaseline] = useState(takeRecoveredMealFlowBaseline);
	const baseline = useRef(restoredBaseline ?? { mealId: meal.id, fingerprint });
	// Outside the guarded flow the current meal store is preparation state, not
	// an active draft. Keep following it there so opening a fresh manual draft
	// does not immediately count the scaffolded blank row as a user edit.
	if (baseline.current.mealId !== meal.id || !isInternalMealFlowPath(pathname)) {
		baseline.current = { mealId: meal.id, fingerprint };
	}
	rememberMealFlowBaseline(baseline.current);

	const editRevision = useCurrentMealStore((state) => state.editRevision);
	const pendingSaveCoversCurrentDraft = doesPendingSaveCoverCurrentDraft({ meal, estimateDraftId, saveRequestId, intent: pendingIntent, editRevision });
	const decisionContext = useRef({ pathname, isDirtyDraft: false, hasUnsavedEstimate: false, pendingSaveCoversCurrentDraft: false });
	decisionContext.current = {
		pathname,
		isDirtyDraft: (isReferenceDraft(meal) || !meal.backend_created_at) && fingerprint !== baseline.current.fingerprint,
		hasUnsavedEstimate: (preview !== null || referenceResult !== null) && saveRequestId !== null && estimateDraftId === meal.id,
		pendingSaveCoversCurrentDraft,
	};

	useEffect(() => {
		const decide = (toPath: string) => {
			const context = decisionContext.current;
			return decideMealFlowNavigation({
				fromPath: context.pathname,
				toPath,
				isDirtyDraft: context.isDirtyDraft,
				hasUnsavedEstimate: context.hasUnsavedEstimate,
				pendingSaveCoversCurrentDraft: context.pendingSaveCoversCurrentDraft,
			});
		};
		const unblock = history.block((location, action) => {
			if (consumeMealFlowBypass(location.pathname)) return;
			const decision = decide(location.pathname);
			if (decision === "allow") return;
			releaseFocusedElement();
			destructiveIntent.current = null;
			setPending({ location, action, kind: decision });
			return false;
		});
		const interceptGuardedTab = (event: Event) => {
			if (!(event instanceof CustomEvent)) return;
			const targetHref = event.target instanceof HTMLElement ? event.target.dataset.navigationHref : undefined;
			const href = targetHref ?? event.detail?.href;
			if (typeof href !== "string") return;
			const destination = new URL(href, window.location.href);
			if (destination.origin !== window.location.origin || decide(destination.pathname) === "allow") return;
			event.preventDefault();
			event.stopImmediatePropagation();
			history.push(`${destination.pathname}${destination.search}${destination.hash}`);
		};
		document.addEventListener("ionTabButtonClick", interceptGuardedTab, true);
		return () => {
			document.removeEventListener("ionTabButtonClick", interceptGuardedTab, true);
			destructiveIntent.current = null;
			unblock();
		};
	}, [history]);

	const stay = () => {
		releaseFocusedElement();
		destructiveIntent.current = null;
		setPending(null);
	};

	const discardAndLeave = () => {
		destructiveIntent.current = pending;
	};

	const leaveAfterDismiss = () => {
		const intent = destructiveIntent.current;
		destructiveIntent.current = null;
		if (!intent) return;
		const { location, action } = intent;
		armMealFlowBypass(location.pathname);
		useMealEstimateStore.getState().clearEstimate();
		useCurrentMealStore.getState().resetMeal();
		setPending(null);
		if (action === "PUSH") history.push(location);
		else history.replace(location);
	};

	const isEstimatePrompt = pending?.kind === "prompt-estimate";
	return pending ? (
		<IonAlert
			isOpen
			backdropDismiss={false}
			onWillDismiss={releaseFocusedElement}
			onDidDismiss={leaveAfterDismiss}
			header={isEstimatePrompt ? "This estimate isn't saved" : "Discard this draft?"}
			message={isEstimatePrompt
				? "Save it to History before leaving, or discard the unsaved estimate and continue."
				: "You have unsaved changes. Stay to keep editing, or discard the draft and continue."}
			buttons={[
				{ text: isEstimatePrompt ? "Stay and save" : "Stay and continue", role: "cancel", handler: stay },
				{ text: "Discard and leave", role: "destructive", handler: discardAndLeave },
			]}
		/>
	) : null;
};

export default MealFlowGuard;
