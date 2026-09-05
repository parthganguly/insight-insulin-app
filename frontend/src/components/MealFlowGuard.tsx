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
	const estimateDraftId = useMealEstimateStore((state) => state.draftId);
	const preview = useMealEstimateStore((state) => state.preview);
	const saveRequestId = useMealEstimateStore((state) => state.saveRequestId);
	const pendingIntent = usePendingSaveStore((state) => saveRequestId === null ? undefined : state.intents[saveRequestId]);
	const [pending, setPending] = useState<PendingNavigation | null>(null);

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

	const pendingSaveCoversCurrentDraft = doesPendingSaveCoverCurrentDraft({ meal, estimateDraftId, saveRequestId, intent: pendingIntent });
	const decisionContext = useRef({ pathname, isDirtyDraft: false, hasUnsavedEstimate: false, pendingSaveCoversCurrentDraft: false });
	decisionContext.current = {
		pathname,
		isDirtyDraft: !meal.backend_created_at && fingerprint !== baseline.current.fingerprint,
		hasUnsavedEstimate: preview !== null && saveRequestId !== null && estimateDraftId === meal.id,
		pendingSaveCoversCurrentDraft,
	};

	useEffect(() => {
		return history.block((location, action) => {
			if (consumeMealFlowBypass(location.pathname)) return;
			const context = decisionContext.current;
			const decision = decideMealFlowNavigation({
				fromPath: context.pathname,
				toPath: location.pathname,
				isDirtyDraft: context.isDirtyDraft,
				hasUnsavedEstimate: context.hasUnsavedEstimate,
				pendingSaveCoversCurrentDraft: context.pendingSaveCoversCurrentDraft,
			});
			if (decision === "allow") return;
			releaseFocusedElement();
			setPending({ location, action, kind: decision });
			return false;
		});
	}, [history]);

	const stay = () => {
		releaseFocusedElement();
		setPending(null);
	};

	const discardAndLeave = () => {
		if (!pending) return;
		const { location, action } = pending;
		armMealFlowBypass(location.pathname);
		releaseFocusedElement();
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
