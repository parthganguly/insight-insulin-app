import { IonPage, IonContent, IonHeader, IonTitle, IonText, IonInput, IonButtons, IonButton, useIonRouter, IonToast, IonIcon, IonSelect, IonSelectOption, IonActionSheet, IonThumbnail, IonModal, IonAlert } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import type { Action, Location } from "history";

import { MealItem, Unit } from "../../types/MealItem";
import { isPersistableImage, usePersistentMealStore } from "../../stores/persistentMealStore";
import { add, alertCircle, arrowBack, checkmarkCircle, close, create, desktop, pencil, save, trash } from "ionicons/icons";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { buildCreateMealPayload, mapMealModelingResponseToMeal, postMealToAPI } from "../../api/api";
import { calculateTotalCalories, calculateTotalItemCalories, calculateTotalItemCarbohydrates, calculateTotalItemSaturatedFat } from "../../utils";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import ConfirmHero from "../../components/ConfirmHero";
import ComponentCard from "../../components/ComponentCard";
import NeedsReviewCard from "../../components/NeedsReviewCard";
import { ADVANCED_DETAILS_LABEL, DRAFT_ITEM_ROW_HINT, DRAFT_REVIEW_KICKER, MEAL_NAME_HELPER, MEAL_SAVE_FAILURE, SAVED_MEAL_STATUS, getDraftProvenanceCopy, getSaveSuccessMessage, isDraftMealItem, validateMealBeforeSave } from "../../utils/mealDraftUx";
import { APP_DISCLAIMER, PROVIDED_FII_DISCLAIMER, ROUGH_ESTIMATE_NOTICE, UNKNOWN_ITEMS_NOTICE, humanizeFiiSource, isRoughEstimateSource, isUnknownSource, shouldShowProvidedFiiDisclaimer } from "../../utils/safetyCopy";

type SaveFeedback = {
	kind: "error" | "success";
	message: string;
};

type PendingNavigation = {
	location: Location;
	action: Action;
};

const releaseFocusedElement = () => {
	const focusedElement = document.activeElement;
	if (focusedElement instanceof HTMLElement) focusedElement.blur();
};

const getDraftFingerprint = (meal: ReturnType<typeof useCurrentMealStore.getState>["meal"]): string => JSON.stringify({
	image: meal.image,
	name: meal.name,
	items: meal.items,
	isAiDraft: meal.isAiDraft,
	estimate: meal.estimate,
	calorieSource: meal.calorie_source,
});

const PreviewMeal = () => {
	const { meal, setMeal, deleteMealItem, addEmptyMealItem, updateMealItem, confirmMealItemReview, setImage, setName, resetMeal } = useCurrentMealStore();

	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const [toastColor, setToastColor] = useState<"success" | "danger">("success");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
	const [showLeaveAlert, setShowLeaveAlert] = useState(false);
	const [isItemActionSheetOpen, setIsItemActionSheetOpen] = useState(false);
	// Inline save/validation feedback (issue #75). The toast is supplementary:
	// it disappears on its own, so it must never be the only place a rejection
	// or confirmation is shown.
	const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);

	useEffect(() => {
		// Once the user fixes what the inline error pointed at, retire the error
		// instead of leaving a stale complaint next to a now-valid meal.
		setSaveFeedback((prev) => (prev?.kind === "error" && validateMealBeforeSave(meal) === null ? null : prev));
	}, [meal]);

	const { addMeal } = usePersistentMealStore();
	const router = useIonRouter();
	const history = useHistory();
	const bypassNavigationBlock = useRef(false);
	const draftFingerprint = getDraftFingerprint(meal);
	const draftBaseline = useRef({ mealId: meal.id, fingerprint: draftFingerprint });
	if (draftBaseline.current.mealId !== meal.id) {
		draftBaseline.current = { mealId: meal.id, fingerprint: draftFingerprint };
		bypassNavigationBlock.current = false;
	}
	const isDirtyDraft = !meal.backend_created_at && draftFingerprint !== draftBaseline.current.fingerprint;

	useEffect(() => {
		if (!isDirtyDraft) return;
		return history.block((location, action) => {
			if (bypassNavigationBlock.current) return;
			releaseFocusedElement();
			setPendingNavigation({ location, action });
			setShowLeaveAlert(true);
			return false;
		});
	}, [history, isDirtyDraft]);

	const [modalItemId, setModalItemId] = useState<string | null>(null);
	const modalItem = modalItemId ? meal.items.find((item) => item.id === modalItemId) ?? null : null;
	const isAiDraftFlow = Boolean(meal.isAiDraft);
	const hasEstimate = meal.calorie_source === "meal_estimate" && !!meal.estimate;
	const hasUnresolvedReview = meal.items.some((item) => item.needsReview);
	const reviewValidationError = hasUnresolvedReview ? validateMealBeforeSave(meal) : null;

	const parseNumericInput = (value: string, fallback = 0): number => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	const updateItem = (id: string, field: keyof MealItem, value: string) => {
		const nextValue = field === "name" || field === "servingUnit" ? value : field === "fii" ? value : parseNumericInput(value);
		updateMealItem(id, field, nextValue);
	};

	const updateItemAmount = (id: string, amount: number) => {
		if (!meal) return;
		const normalizedAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
		updateMealItem(id, "amount", normalizedAmount);
	};

	const adjustItemAmount = (id: string, delta: number) => {
		const target = meal.items.find((item) => item.id === id);
		if (!target) return;
		updateItemAmount(id, Math.max(0.1, Number((target.amount + delta).toFixed(2))));
	};

	const closeItemEditor = () => {
		releaseFocusedElement();
		setModalItemId(null);
	};

	const openItemEditor = (item: MealItem) => {
		releaseFocusedElement();
		setModalItemId(item.id);
	};

	const stayOnDraft = () => {
		releaseFocusedElement();
		setShowLeaveAlert(false);
		setPendingNavigation(null);
	};

	const discardAndContinueNavigation = () => {
		if (!pendingNavigation) return;
		const { location, action } = pendingNavigation;
		bypassNavigationBlock.current = true;
		releaseFocusedElement();
		resetMeal();
		setShowLeaveAlert(false);
		setPendingNavigation(null);

		if (action === "PUSH") history.push(location);
		else history.replace(location);
	};

	const handleLogMeal = async () => {
		if (!meal) return;
		const validationError = validateMealBeforeSave(meal);
		if (validationError) {
			setSaveFeedback({ kind: "error", message: validationError });
			setToastColor("danger");
			setToastMessage(validationError);
			setShowToast(true);
			return;
		}

		const payload = buildCreateMealPayload(meal);

		releaseFocusedElement();
		setIsSubmitting(true);
		try {
			const response = await postMealToAPI(payload);
			const canonicalMeal = mapMealModelingResponseToMeal(response, meal.image);
			bypassNavigationBlock.current = true;
			setMeal(canonicalMeal);
			addMeal(canonicalMeal);
			// Full-size photos stay in memory for this session but are not written
			// to localStorage (photo-quota safety, #65) — say so without alarm.
			const successMessage = getSaveSuccessMessage(isPersistableImage(canonicalMeal.image));
			setSaveFeedback({ kind: "success", message: successMessage });
			setToastColor("success");
			setToastMessage(successMessage);
			setShowToast(true);
			// Replace the draft route while targeting the saved-result route itself.
			// A cross-tab "root" navigation can update the URL while Ionic keeps the
			// previous tab root rendered, leaving the address and visible page out of
			// sync. A forward replace gives the result route ownership of the outlet
			// without leaving the now-saved draft in browser history.
			router.push(`/meals/saved/${encodeURIComponent(canonicalMeal.id)}`, "forward", "replace");
		} catch (err) {
			console.error("POST /meals failed:", err);
			const errorMessage = MEAL_SAVE_FAILURE;
			setSaveFeedback({ kind: "error", message: errorMessage });
			setToastColor("danger");
			setToastMessage(errorMessage);
			setShowToast(true);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDiscardDraft = () => {
		bypassNavigationBlock.current = true;
		releaseFocusedElement();
		resetMeal();
		router.push("/log-meal", "root");
	};

	const handleTakePicture = async () => {
		try {
			const photo = await Camera.getPhoto({
				resultType: CameraResultType.Base64,
				source: CameraSource.Camera,
				quality: 90,
				saveToGallery: false,
			});

			if (photo.base64String) {
				const base64Image = `data:image/jpeg;base64,${photo.base64String}`;
				setImage(base64Image); // Update meal with captured image

				// router.push(`/camera/review?image=${encodeURIComponent(base64Image)}`, "forward");
			}
		} catch {
			console.log("Camera access was cancelled or failed.");
		}
	};

	const itemSumCalories = calculateTotalCalories(meal);
	const itemSumCarbohydrates = Math.round(meal.items.reduce((total, item) => total + calculateTotalItemCarbohydrates(item), 0) * 100) / 100;
	const itemSumSaturatedFat = Math.round(meal.items.reduce((total, item) => total + calculateTotalItemSaturatedFat(item), 0) * 100) / 100;

	return (
		<IonPage>
			<IonContent className='confirmation-page' fullscreen>
				<ConfirmHero image={meal.image} mealName={meal.name} disabled={isSubmitting} onAddPhoto={handleTakePicture} />
				<main className='confirmation-sheet' aria-busy={isSubmitting} inert={isSubmitting ? true : undefined}>
					<p className='confirmation-kicker'>{meal.backend_created_at ? SAVED_MEAL_STATUS : DRAFT_REVIEW_KICKER}</p>
					<h1>Did we get your meal right?</h1>
					<IonInput className='confirmation-meal-name' value={meal.name} label='Meal name' labelPlacement='stacked' placeholder='Enter dish name' onIonInput={(event) => setName(event.detail.value ?? "")} disabled={isSubmitting}>
						<IonIcon slot='end' icon={create} aria-hidden='true' />
					</IonInput>
					<p className='meal-name-helper'>{MEAL_NAME_HELPER}</p>

					{meal.items.filter((item) => item.needsReview).map((item) => (
						<NeedsReviewCard key={item.id} item={item} disabled={isSubmitting} onEdit={openItemEditor} onConfirm={confirmMealItemReview} />
					))}

					<section className='confirmation-component-region' aria-label='Meal components'>
						{meal.items.length === 0 ? (
							<div className='draft-empty-note'>
								<p>This meal is an editable draft</p>
								<p>Add something below before calculating and saving.</p>
							</div>
						) : (
							<div className='confirmation-item-list'>
								{meal.items.map((item) => (
									<ComponentCard
										key={item.id}
										item={item}
										provenanceCopy={getDraftProvenanceCopy(item, Boolean(meal.source_meal_id))}
										draftHint={isDraftMealItem(item) ? DRAFT_ITEM_ROW_HINT : null}
										disabled={isSubmitting}
										onOpenEditor={openItemEditor}
										onAdjustAmount={adjustItemAmount}
										onUpdateAmount={updateItemAmount}
										onUpdateUnit={(id, unit) => updateItem(id, "servingUnit", unit)}
										parseNumericInput={parseNumericInput}
									/>
								))}
							</div>
						)}
						<IonButton expand='block' fill='clear' className='add-missed-item-button' onClick={() => { releaseFocusedElement(); setIsItemActionSheetOpen(true); }} disabled={isSubmitting}>
							<IonIcon slot='start' icon={add} aria-hidden='true' />
							Add something we missed — oil, ghee, sides…
						</IonButton>
					</section>

					<section className='confirmation-totals' aria-label='Item totals'>
						<div className='confirmation-totals-line'>
							<span>Item totals</span>
							<strong>{itemSumCalories} kcal · {itemSumCarbohydrates} g carbs · {itemSumSaturatedFat} g saturated fat</strong>
						</div>
						{hasEstimate && isAiDraftFlow && meal.estimate && (() => {
							const estimatedCalories = Math.round(meal.estimate.estimated_calories * meal.estimate.serving_count);
							const difference = itemSumCalories > 0 ? Math.abs(estimatedCalories - itemSumCalories) / itemSumCalories : 0;
							const showMismatch = itemSumCalories > 0 && difference > 0.25;
							return (
								<>
									<details className='whole-meal-estimate-details'>
										<summary>Whole-meal estimate</summary>
										<div className='whole-meal-estimate-content'>
											<p>AI nutrition estimate for the whole meal, before save.</p>
											<div className='estimate-value-row'><span>Calories</span><strong>{estimatedCalories} kcal</strong></div>
											<div className='estimate-value-row'><span>Carbs</span><strong>{Math.round(meal.estimate.estimated_carbs_g * meal.estimate.serving_count)} g</strong></div>
											<div className='estimate-value-row'><span>Fat</span><strong>{Math.round(meal.estimate.estimated_fat_g * meal.estimate.serving_count)} g</strong></div>
											<div className='estimate-value-row estimate-serving-row'><span>Serving</span><span>{meal.estimate.serving_count} {"\u00d7"} {meal.estimate.serving_type}</span></div>
											<p>Review this estimate, then adjust the item details before saving.</p>
										</div>
									</details>
									{showMismatch && (
										<p className='estimate-mismatch-note'>Item breakdown ({Math.round(itemSumCalories)} kcal) differs from estimate by {Math.round(difference * 100)}%. Consider reviewing items.</p>
									)}
								</>
							);
						})()}
					</section>

					<div className='disclaimer-note confirmation-disclaimer'>{APP_DISCLAIMER}</div>
					{saveFeedback && (
						<div className={`save-feedback-banner ${saveFeedback.kind === "error" ? "save-feedback-error" : "save-feedback-success"}`} role='status' aria-live='polite'>
							<IonIcon icon={saveFeedback.kind === "error" ? alertCircle : checkmarkCircle} aria-hidden='true' />
							<span>{saveFeedback.message}</span>
						</div>
					)}
					{reviewValidationError && (
						<div id='review-validation-error' className='save-feedback-banner save-feedback-error review-validation-error' role='status' aria-live='polite'>
							<IonIcon icon={alertCircle} aria-hidden='true' />
							<span>{reviewValidationError}</span>
						</div>
					)}
				</main>
				<div slot='fixed' className='confirmation-dock'>
					<IonButton expand='block' aria-label='Save meal' aria-disabled={isSubmitting || hasUnresolvedReview} aria-describedby={reviewValidationError ? "review-validation-error" : undefined} onClick={handleLogMeal} disabled={isSubmitting || hasUnresolvedReview}>
						{isSubmitting ? "Estimating insulin demand…" : "Calculate & save"}
					</IonButton>
					<IonButton expand='block' fill='clear' color='medium' onClick={handleDiscardDraft} disabled={isSubmitting}>Discard draft</IonButton>
				</div>
			</IonContent>

			<IonModal isOpen={!!modalItem} onWillDismiss={releaseFocusedElement} onDidDismiss={() => setModalItemId(null)} className='sheet-modal'>
					<div className='sheet-handle' aria-hidden='true' />
					<IonHeader>
						<IonToolbarWrapper className='ion-text-left'>
							<IonTitle>Edit: {modalItem?.name}</IonTitle>
							<IonButtons slot='start'>
								<IonButton size='large' aria-label='Close item editor' onClick={closeItemEditor}><IonIcon slot='icon-only' icon={arrowBack} /></IonButton>
							</IonButtons>
						</IonToolbarWrapper>
					</IonHeader>
					<IonContent className='ion-padding'>
						{modalItem && (
							<div className='item-editor-sheet-content'>
								<div className='item-editor-heading'>
									<IonInput value={modalItem.name} label='Item name' labelPlacement='stacked' placeholder='Enter item name' onIonInput={(event) => updateItem(modalItem.id, "name", event.detail.value ?? "")} />
									{modalItem.image && <IonThumbnail><img alt='' src={modalItem.image} /></IonThumbnail>}
								</div>
								<div className='item-editor-fields'>
									<IonInput className='ion-margin-vertical' labelPlacement='stacked' type='number' fill='outline' label='Serving size' value={modalItem.servingSize} placeholder='Enter serving size' onIonInput={(event) => updateItem(modalItem.id, "servingSize", event.detail.value ?? "")} />
									<IonSelect className='ion-margin-vertical' label='Serving unit' labelPlacement='stacked' fill='outline' value={modalItem.servingUnit} onIonChange={(event) => updateItem(modalItem.id, "servingUnit", event.detail.value)}>
										{Object.values(Unit).map((unit) => <IonSelectOption key={unit} value={unit}>{unit}</IonSelectOption>)}
									</IonSelect>
									<IonInput className='ion-margin-vertical' labelPlacement='stacked' type='number' fill='outline' label='Amount' value={modalItem.amount} placeholder='Enter amount' onIonInput={(event) => updateItem(modalItem.id, "amount", event.detail.value ?? "")} />
									<details className='advanced-details'>
										<summary>{ADVANCED_DETAILS_LABEL}</summary>
										<div className='advanced-details-content'>
											<IonInput labelPlacement='stacked' type='number' fill='outline' label='kcals per serving' value={modalItem.kcalPerServing} placeholder='Enter kcal for one serving' onIonInput={(event) => updateItem(modalItem.id, "kcalPerServing", event.detail.value ?? "")} />
											<IonInput labelPlacement='stacked' type='number' fill='outline' label='Carb per serving (g)' value={modalItem.carbPerServing_g} placeholder='Enter carbs per serving (g)' onIonInput={(event) => updateItem(modalItem.id, "carbPerServing_g", event.detail.value ?? "")} />
											<IonInput labelPlacement='stacked' type='number' fill='outline' label='Protein per serving (g)' value={modalItem.proteinPerServing_g ?? ""} placeholder='Enter protein per serving (g)' onIonInput={(event) => updateItem(modalItem.id, "proteinPerServing_g", event.detail.value ?? "")} />
											<IonInput labelPlacement='stacked' type='number' fill='outline' label='Fat per serving (g)' value={modalItem.fatPerServing_g ?? ""} placeholder='Enter fat per serving (g)' onIonInput={(event) => updateItem(modalItem.id, "fatPerServing_g", event.detail.value ?? "")} />
											<IonInput labelPlacement='stacked' type='number' fill='outline' label='Saturated Fat per serving (g)' value={modalItem.satFatPerServing_g} placeholder='Enter saturated fat per serving (g)' onIonInput={(event) => updateItem(modalItem.id, "satFatPerServing_g", event.detail.value ?? "")} />
											<IonInput labelPlacement='stacked' type='number' fill='outline' label='FII' value={modalItem.fii ?? ""} placeholder='Enter FII' onIonInput={(event) => updateItem(modalItem.id, "fii", event.detail.value ?? "")} />
											<IonInput labelPlacement='stacked' type='number' fill='outline' label='Glycemic Index' value={modalItem.gi} placeholder='Enter glycemic index' onIonInput={(event) => updateItem(modalItem.id, "gi", event.detail.value ?? "")} />
											<div className='advanced-nutrient-totals'>
												<div className='editor-total-row'><span>Total Calories</span><strong>{calculateTotalItemCalories(modalItem)} kcal</strong></div>
												<div className='editor-total-row'><span>Total Carbs</span><strong>{calculateTotalItemCarbohydrates(modalItem)} g</strong></div>
												<div className='editor-total-row'><span>Total Saturated Fat</span><strong>{calculateTotalItemSaturatedFat(modalItem)} g</strong></div>
											</div>
											{modalItem.source && <IonText>Source: {humanizeFiiSource(modalItem.source)}</IonText>}
											{shouldShowProvidedFiiDisclaimer(modalItem.source, modalItem.fii) && <IonText color='medium'>{PROVIDED_FII_DISCLAIMER}</IonText>}
											{isRoughEstimateSource(modalItem.source) && <IonText color='medium'>{ROUGH_ESTIMATE_NOTICE}</IonText>}
											{isUnknownSource(modalItem.source) && <IonText color='medium'>{UNKNOWN_ITEMS_NOTICE}</IonText>}
										</div>
									</details>
									<div className='item-editor-actions'>
										<IonButton onClick={closeItemEditor}><IonIcon slot='start' icon={save} />Done</IonButton>
										<IonButton color='danger' fill='outline' onClick={() => { deleteMealItem(modalItem.id); closeItemEditor(); }}><IonIcon slot='start' icon={trash} />Remove item</IonButton>
									</div>
								</div>
							</div>
						)}
					</IonContent>
				</IonModal>

				<IonActionSheet
					isOpen={isItemActionSheetOpen}
					onWillDismiss={releaseFocusedElement}
					header='Add a component'
					buttons={[
						{ text: "AI", icon: desktop, data: { action: "ai" } },
						{ text: "Manual", icon: pencil, data: { action: "manual" } },
						{ text: "Cancel", role: "cancel", icon: close, data: { action: "cancel" } },
					]}
					onDidDismiss={({ detail }) => {
						releaseFocusedElement();
						setIsItemActionSheetOpen(false);
						if (!detail.data || detail.data.action === "cancel") return;
						if (detail.data.action === "ai") router.push("/meals/new/ai");
						if (detail.data.action === "manual") addEmptyMealItem();
					}}
				/>
				<IonAlert
					isOpen={showLeaveAlert}
					backdropDismiss={false}
					onWillDismiss={releaseFocusedElement}
					header='Discard this draft?'
					message='You have unsaved changes. Stay to keep editing, or discard the draft and continue.'
					buttons={[
						{ text: "Stay and continue", role: "cancel", handler: stayOnDraft },
						{ text: "Discard and leave", role: "destructive", handler: discardAndContinueNavigation },
					]}
				/>
				<IonToast isOpen={showToast} message={toastMessage} duration={2200} color={toastColor} onDidDismiss={() => setShowToast(false)} />
		</IonPage>
	);
};

export default PreviewMeal;
