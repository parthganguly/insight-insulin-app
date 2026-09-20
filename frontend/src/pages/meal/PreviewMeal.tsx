import { IonPage, IonContent, IonHeader, IonTitle, IonText, IonInput, IonButtons, IonButton, useIonRouter, IonToast, IonIcon, IonSelect, IonSelectOption, IonActionSheet, IonThumbnail, IonModal } from "@ionic/react";
import { useEffect, useRef, useState } from "react";

import { MealItem, Unit } from "../../types/MealItem";
import type { Meal } from "../../types/Meal";
import { add, alertCircle, arrowBack, checkmarkCircle, close, create, desktop, pencil, save, trash } from "ionicons/icons";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { useMealEstimateStore } from "../../stores/mealEstimateStore";
import { CameraSource } from "@capacitor/camera";
import { clearCameraRecovery, getRecoverablePhoto } from "../../utils/cameraRecovery";
import { calculateTotalCalories, calculateTotalItemCalories, calculateTotalItemCarbohydrates, calculateTotalItemSaturatedFat } from "../../utils";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import ConfirmHero from "../../components/ConfirmHero";
import ComponentCard from "../../components/ComponentCard";
import NeedsReviewCard from "../../components/NeedsReviewCard";
import { ADVANCED_DETAILS_LABEL, DRAFT_ITEM_ROW_HINT, DRAFT_REVIEW_KICKER, MEAL_NAME_HELPER, getDraftProvenanceCopy, isDraftMealItem, validateMealBeforeSave } from "../../utils/mealDraftUx";
import { APP_DISCLAIMER, PROVIDED_FII_DISCLAIMER, ROUGH_ESTIMATE_NOTICE, UNKNOWN_ITEMS_NOTICE, humanizeFiiSource, isRoughEstimateSource, isUnknownSource, shouldShowProvidedFiiDisclaimer } from "../../utils/safetyCopy";
import { REFERENCE_CATALOG_CHANGED_MESSAGE, calculateCurrentMealEstimate, calculateCurrentReferenceEstimate, loadReferenceCatalog } from "../../utils/mealEstimateWorkflow";
import { REFERENCE_PREVIEW_MODE } from "../../utils/experimentalPresentationGate";
import { isReferenceDraft } from "../../utils/referenceDraft";
import { ReferencePicker } from "../../components/experimentalReference/ReferencePicker";
import type { ReferenceDraftItem } from "../../types/experimentalReference";
import { armMealFlowBypass } from "../../utils/mealFlowGuard";

type SaveFeedback = {
	kind: "error" | "success";
	message: string;
};

const releaseFocusedElement = () => {
	const focusedElement = document.activeElement;
	if (focusedElement instanceof HTMLElement) focusedElement.blur();
};

const LegacyPreviewMeal = () => {
	const store = useCurrentMealStore();
	const { deleteMealItem, addEmptyMealItem, updateMealItem, confirmMealItemReview, setImage, setName, resetMeal } = store;
	// The legacy branch only ever renders for a legacy draft.
	const meal = store.meal as Meal;

	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const [toastColor, setToastColor] = useState<"success" | "danger">("success");
	const [isSubmitting, setIsSubmitting] = useState(false);
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

	const router = useIonRouter();

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

		releaseFocusedElement();
		setIsSubmitting(true);
		const result = await calculateCurrentMealEstimate({
			onReady: () => router.push("/meals/estimate", "forward"),
		});
		setIsSubmitting(false);
		if (result === "failed" || result === "changed") {
			const errorMessage = useMealEstimateStore.getState().error ?? "We couldn't estimate this meal right now.";
			setSaveFeedback({ kind: "error", message: errorMessage });
			setToastColor("danger");
			setToastMessage(errorMessage);
			setShowToast(true);
		}
	};

	const handleDiscardDraft = () => {
		void clearCameraRecovery().catch(() => undefined);
		armMealFlowBypass("/log-meal");
		releaseFocusedElement();
		useMealEstimateStore.getState().clearEstimate();
		resetMeal();
		router.push("/log-meal", "root");
	};

	const handleTakePicture = async () => {
		try {
			const photo = await getRecoverablePhoto(CameraSource.Camera, {
				flow: "preview-photo", caller: "/meals/new", meal, smart: null,
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
					<p className='confirmation-kicker'>{DRAFT_REVIEW_KICKER}</p>
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
					<IonButton expand='block' aria-label={isSubmitting ? "Estimating insulin demand…" : "Calculate estimate"} aria-disabled={isSubmitting || hasUnresolvedReview} aria-describedby={reviewValidationError ? "review-validation-error" : undefined} onClick={handleLogMeal} disabled={isSubmitting || hasUnresolvedReview}>
						{isSubmitting ? "Estimating insulin demand…" : "Calculate estimate"}
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
				<IonToast isOpen={showToast} message={toastMessage} duration={2200} color={toastColor} onDidDismiss={() => setShowToast(false)} />
		</IonPage>
	);
};

// ---------------- Reference review (freeze D2/D3) ----------------

export const REFERENCE_REVIEW_KICKER = "Experimental reference preview — draft, not saved";
export const REFERENCE_AMOUNT_LABEL = "Amount eaten";
export const REFERENCE_SKIP_LABEL = "Continue without a reference";
export const REFERENCE_SOURCE_BOUNDARY = "Selecting a published reference does not mean this exact food was measured.";
export const REFERENCE_CATALOG_OFFLINE = "The published reference catalog isn't available right now. You can still edit this meal and continue without a reference.";

// M03: the two numbers a person must not confuse are "how much I ate" and
// "what the nutrition figures are per". They are stated with the SAME emphasis
// for every denominator — per 1 g, per 100 g or anything else — so 100 is not
// treated as uniquely normal and a reuse normalized to 1 is not mistaken for a
// per-100 entry. No arithmetic and no auto-conversion is involved.
const nutritionBasisLabel = (item: ReferenceDraftItem): string =>
	item.servingSize === null
		? "Nutrition basis not set yet."
		: `Nutrition values are per ${item.servingSize} ${item.servingUnit}.`;

/** M03: a reused source is a suggestion to review, never a selected match. */
const selectionStatusLabel = (item: ReferenceDraftItem): string => {
	if (item.selection.state === "selected") return `Selected reference: ${item.selection.sourceId}`;
	if (item.selection.state !== "needs_review") return "No published reference selected";
	const why = item.selection.cause === "catalog_changed"
		? "needs review after a catalog change"
		: item.selection.cause === "reused_suggestion"
			? "suggested from the saved meal — review before it counts"
			: "needs review";
	return `Suggestion only: ${item.selection.sourceId} ${why}`;
};

/** Exported for focused picker focus-guard tests (N2). */
export const ReferencePreviewMeal = () => {
	const router = useIonRouter();
	const store = useCurrentMealStore();
	const draft = isReferenceDraft(store.meal) ? store.meal : null;
	const catalog = useMealEstimateStore((state) => state.catalog);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [modalItemId, setModalItemId] = useState<string | null>(null);
	// Only one picker is open at a time, and opening it is not a material edit.
	const [openPickerItemId, setOpenPickerItemId] = useState<string | null>(null);
	const [errors, setErrors] = useState<string[]>([]);
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const pickerModal = useRef<HTMLIonModalElement>(null);

	// The reference flow owns its own draft contract: an entry that arrived
	// with a legacy draft starts a fresh reference draft instead of casting.
	useEffect(() => {
		if (!isReferenceDraft(useCurrentMealStore.getState().meal)) {
			useCurrentMealStore.getState().resetMealAs("reference");
			useCurrentMealStore.getState().addEmptyReferenceItem();
		}
	}, []);

	useEffect(() => {
		if (catalog.phase === "not_loaded") void loadReferenceCatalog();
	}, [catalog.phase]);

	if (!draft) return null;

	const modalItem = modalItemId ? draft.items.find((item) => item.id === modalItemId) ?? null : null;
	const pickerItem = openPickerItemId ? draft.items.find((item) => item.id === openPickerItemId) ?? null : null;
	const catalogRecords = catalog.catalog?.records ?? [];

	// Keep the picker content mounted through Ionic's dismissal. Its overlay
	// lifecycle restores the native trigger unless the user already moved focus.
	const closePicker = () => { void pickerModal.current?.dismiss(); };

	const openPicker = (itemId: string) => {
		setOpenPickerItemId(itemId);
	};

	const handleSelectSource = (itemId: string, sourceId: string | null) => {
		const version = catalog.catalog?.catalog_version;
		if (!version) return;
		store.selectReferenceItemSource(itemId, sourceId, version);
		// Explicit review of this catalog establishes the draft's version.
		store.setReviewedCatalogVersion(version);
		closePicker();
	};

	const handleSkipSource = (itemId: string) => {
		const version = catalog.catalog?.catalog_version;
		if (!version) return;
		store.selectReferenceItemSource(itemId, null, version);
		store.setReviewedCatalogVersion(version);
		closePicker();
	};

	const handleCalculate = async () => {
		releaseFocusedElement();
		setIsSubmitting(true);
		const result = await calculateCurrentReferenceEstimate({ onReady: () => router.push("/meals/estimate", "forward") });
		setIsSubmitting(false);
		if (result.outcome === "invalid") {
			setErrors(result.errors);
			return;
		}
		setErrors([]);
		if (result.outcome === "stale_catalog") {
			setToastMessage(REFERENCE_CATALOG_CHANGED_MESSAGE);
			setShowToast(true);
			void loadReferenceCatalog();
			return;
		}
		if (result.outcome === "failed") {
			setToastMessage(result.message);
			setShowToast(true);
		}
	};

	const handleDiscardDraft = () => {
		void clearCameraRecovery().catch(() => undefined);
		armMealFlowBypass("/log-meal");
		releaseFocusedElement();
		useMealEstimateStore.getState().clearEstimate();
		store.resetMealAs("reference");
		router.push("/log-meal", "root");
	};

	const updateNumber = (id: string, field: string, value: string | null | undefined) => store.updateReferenceItem(id, field, value ?? "");

	return (
		<IonPage>
			<IonContent className='confirmation-page' fullscreen>
				<ConfirmHero image={draft.image} mealName={draft.name} disabled={isSubmitting} />
				<main className='confirmation-sheet' aria-busy={isSubmitting} inert={isSubmitting ? true : undefined}>
					<p className='confirmation-kicker'>{REFERENCE_REVIEW_KICKER}</p>
					<h1>Review this meal</h1>
					<IonInput className='confirmation-meal-name' value={draft.name} label='Meal name' labelPlacement='stacked' placeholder='Enter dish name' onIonInput={(event) => store.setName(event.detail.value ?? "")} disabled={isSubmitting}>
						<IonIcon slot='end' icon={create} aria-hidden='true' />
					</IonInput>
					<p className='meal-name-helper'>{MEAL_NAME_HELPER}</p>

					{(catalog.phase === "offline" || catalog.phase === "read_error") && (
						<p className='result-notice' role='status'>{REFERENCE_CATALOG_OFFLINE}</p>
					)}

					<section className='confirmation-component-region' aria-label='Meal components'>
						{draft.items.length === 0 ? (
							<div className='draft-empty-note'>
								<p>This meal is an editable draft</p>
								<p>Add something below before calculating.</p>
							</div>
						) : (
							<div className='confirmation-item-list'>
								{draft.items.map((item, index) => (
									<article key={item.id} className='app-card reference-draft-item' aria-label={item.name || `Item ${index + 1}`}>
										<h2>{item.name || `Item ${index + 1}`}</h2>
										{/* M03: amount eaten and the nutrition denominator are grouped
										    and weighted equally, for every supported basis. */}
										<dl className='reference-basis-group'>
											<div><dt>{REFERENCE_AMOUNT_LABEL}</dt><dd>{item.amount === null ? "not set" : `${item.amount} ${item.servingUnit}`}</dd></div>
											<div><dt>Nutrition values are per</dt><dd>{item.servingSize === null ? "not set" : `${item.servingSize} ${item.servingUnit}`}</dd></div>
										</dl>
										<p className='reference-selection-line'>{selectionStatusLabel(item)}</p>
										{item.needsReview && (
											<div className='needs-review-actions'>
												<IonButton size='small' fill='outline' onClick={() => store.clearReferenceNutrition(item.id)} disabled={isSubmitting}>Clear nutrition to unknown</IonButton>
												<IonButton size='small' onClick={() => store.confirmReferenceBasis(item.id)} disabled={isSubmitting}>These still fit</IonButton>
											</div>
										)}
										<div className='reference-item-actions'>
											<IonButton size='small' fill='outline' onClick={() => { releaseFocusedElement(); setModalItemId(item.id); }} disabled={isSubmitting}>Edit item</IonButton>
											<IonButton size='small' fill='outline' onClick={() => openPicker(item.id)} disabled={isSubmitting || catalog.phase !== "ready"}>Choose a published reference</IonButton>
											<IonButton size='small' fill='clear' onClick={() => handleSkipSource(item.id)} disabled={isSubmitting || catalog.phase !== "ready"}>{REFERENCE_SKIP_LABEL}</IonButton>
											<IonButton size='small' fill='clear' color='danger' onClick={() => store.deleteReferenceItem(item.id)} disabled={isSubmitting}>Remove item</IonButton>
										</div>
									</article>
								))}
							</div>
						)}
						<IonButton expand='block' fill='clear' className='add-missed-item-button' onClick={() => store.addEmptyReferenceItem()} disabled={isSubmitting}>
							<IonIcon slot='start' icon={add} aria-hidden='true' />
							Add another item
						</IonButton>
					</section>

					<p className='disclaimer-note confirmation-disclaimer'>{REFERENCE_SOURCE_BOUNDARY}</p>
					<div className='disclaimer-note confirmation-disclaimer'>{APP_DISCLAIMER}</div>

					{errors.length > 0 && (
						<div id='reference-validation-error' className='save-feedback-banner save-feedback-error' role='status' aria-live='polite'>
							<IonIcon icon={alertCircle} aria-hidden='true' />
							<ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
						</div>
					)}
				</main>
				<div slot='fixed' className='confirmation-dock'>
					<IonButton expand='block' aria-label='Calculate estimate' aria-describedby={errors.length > 0 ? "reference-validation-error" : undefined} onClick={() => void handleCalculate()} disabled={isSubmitting}>
						{isSubmitting ? "Calculating…" : "Calculate estimate"}
					</IonButton>
					<IonButton expand='block' fill='clear' color='medium' onClick={handleDiscardDraft} disabled={isSubmitting}>Discard draft</IonButton>
				</div>
			</IonContent>

			<IonModal isOpen={!!modalItem} onWillDismiss={releaseFocusedElement} onDidDismiss={() => setModalItemId(null)} className='sheet-modal'>
				<div className='sheet-handle' aria-hidden='true' />
				<IonHeader>
					<IonToolbarWrapper className='ion-text-left'>
						<IonTitle>Edit: {modalItem?.name || "New item"}</IonTitle>
						<IonButtons slot='start'>
							<IonButton size='large' aria-label='Close item editor' onClick={() => { releaseFocusedElement(); setModalItemId(null); }}><IonIcon slot='icon-only' icon={arrowBack} /></IonButton>
						</IonButtons>
					</IonToolbarWrapper>
				</IonHeader>
				<IonContent className='ion-padding'>
					{modalItem && (
						<div className='item-editor-sheet-content'>
							<IonInput value={modalItem.name} label='Item name' labelPlacement='stacked' placeholder='Enter item name' onIonInput={(event) => store.updateReferenceItem(modalItem.id, "name", event.detail.value ?? "")} />
							<div className='item-editor-fields'>
								<IonInput className='ion-margin-vertical' labelPlacement='stacked' type='number' fill='outline' label={`${REFERENCE_AMOUNT_LABEL} (${modalItem.servingUnit})`} value={modalItem.amount ?? ""} placeholder='Leave blank if unknown' onIonInput={(event) => updateNumber(modalItem.id, "amount", event.detail.value)} />
								<IonSelect className='ion-margin-vertical' label='Unit' labelPlacement='stacked' fill='outline' value={modalItem.servingUnit} onIonChange={(event) => store.updateReferenceItem(modalItem.id, "servingUnit", event.detail.value)}>
									{Object.values(Unit).map((unit) => <IonSelectOption key={unit} value={unit}>{unit}</IonSelectOption>)}
								</IonSelect>
								<IonInput className='ion-margin-vertical' labelPlacement='stacked' type='number' fill='outline' label={`Nutrition is measured per this many ${modalItem.servingUnit}`} value={modalItem.servingSize ?? ""} placeholder='For example 100' onIonInput={(event) => updateNumber(modalItem.id, "servingSize", event.detail.value)} />
								<p className='reference-basis-line'>{nutritionBasisLabel(modalItem)}</p>
								<IonSelect className='ion-margin-vertical' label='Where this nutrition came from' labelPlacement='stacked' fill='outline' value={modalItem.nutritionOrigin} onIonChange={(event) => store.updateReferenceItem(modalItem.id, "nutritionOrigin", event.detail.value)}>
									{([["manual", "I entered it"], ["label", "From a label"], ["ai_reviewed", "Suggested, reviewed by me"], ["other", "Other"]] as const).map(([value, label]) => <IonSelectOption key={value} value={value}>{label}</IonSelectOption>)}
								</IonSelect>
								<details className='advanced-details' open>
									<summary>{ADVANCED_DETAILS_LABEL}</summary>
									<div className='advanced-details-content'>
										{([
											["kcalPerServing", "kcal"],
											["carbPerServing_g", "Carbohydrate (g)"],
											["proteinPerServing_g", "Protein (g)"],
											["fatPerServing_g", "Fat (g)"],
											["satFatPerServing_g", "Saturated fat (g)"],
										] as const).map(([field, label]) => (
											<IonInput key={field} labelPlacement='stacked' type='number' fill='outline' label={`${label} per ${modalItem.servingSize ?? "?"} ${modalItem.servingUnit}`} value={modalItem[field] ?? ""} placeholder='Leave blank if unknown' onIonInput={(event) => updateNumber(modalItem.id, field, event.detail.value)} />
										))}
										<IonInput labelPlacement='stacked' type='number' fill='outline' label='Glycemic index (whole number)' value={modalItem.gi ?? ""} placeholder='Leave blank if unknown' onIonInput={(event) => updateNumber(modalItem.id, "gi", event.detail.value)} />
										{modalItem.invalidFields.length > 0 && (
											<p className='save-feedback-banner save-feedback-error' role='status'>
												Some entries aren&rsquo;t valid numbers: {modalItem.invalidFields.join(", ")}. Clear them or enter a number of 0 or more.
											</p>
										)}
									</div>
								</details>
								<div className='item-editor-actions'>
									<IonButton onClick={() => { releaseFocusedElement(); setModalItemId(null); }}><IonIcon slot='start' icon={save} />Done</IonButton>
									<IonButton color='danger' fill='outline' onClick={() => { store.deleteReferenceItem(modalItem.id); setModalItemId(null); }}><IonIcon slot='start' icon={trash} />Remove item</IonButton>
								</div>
							</div>
						</div>
					)}
				</IonContent>
			</IonModal>

			<IonModal ref={pickerModal} isOpen={!!pickerItem} onDidDismiss={() => setOpenPickerItemId(null)} className='sheet-modal'>
				<IonHeader>
					<IonToolbarWrapper className='ion-text-left'>
						<IonTitle>Published references</IonTitle>
						<IonButtons slot='start'>
							<IonButton size='large' aria-label='Close reference picker' onClick={closePicker}><IonIcon slot='icon-only' icon={arrowBack} /></IonButton>
						</IonButtons>
					</IonToolbarWrapper>
				</IonHeader>
				<IonContent className='ion-padding'>
					{pickerItem && (
						<>
							<ReferencePicker
								itemName={pickerItem.name || "this item"}
								quantity={pickerItem.amount}
								records={catalogRecords}
								selectedId={pickerItem.selection.state === "selected" ? pickerItem.selection.sourceId : null}
								onChange={(sourceId) => handleSelectSource(pickerItem.id, sourceId)}
							/>
							<IonButton expand='block' fill='clear' onClick={() => handleSkipSource(pickerItem.id)}>{REFERENCE_SKIP_LABEL}</IonButton>
							<IonButton expand='block' fill='clear' onClick={() => void loadReferenceCatalog()}>Refresh published references</IonButton>
						</>
					)}
				</IonContent>
			</IonModal>

			<IonToast isOpen={showToast} message={toastMessage} duration={2600} color='danger' onDidDismiss={() => setShowToast(false)} />
		</IonPage>
	);
};

// The flag is fixed at build time, so this branch never reorders hooks.
const PreviewMeal = () => (REFERENCE_PREVIEW_MODE ? <ReferencePreviewMeal /> : <LegacyPreviewMeal />);

export default PreviewMeal;
