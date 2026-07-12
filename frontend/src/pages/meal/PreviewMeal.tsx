import { IonPage, IonContent, IonHeader, IonTitle, IonImg, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonText, IonInput, IonButtons, IonBackButton, IonButton, useIonRouter, IonToast, IonIcon, IonSelect, IonSelectOption, IonFab, IonFabButton, IonActionSheet, IonThumbnail, IonModal, IonItem, IonLabel, IonItemDivider, IonList, IonNote, IonFabList, IonLoading, useIonAlert } from "@ionic/react";
import { useEffect, useState } from "react";

import { MealItem, Unit } from "../../types/MealItem";
import { deleteMealEverywhere, isPersistableImage, resolveMealDeletionTarget, usePersistentMealStore } from "../../stores/persistentMealStore"; // adjust path as needed
import { add, alertCircle, arrowBack, batteryCharging, camera, checkmarkCircle, chevronUp, close, create, desktop, flame, information, pencil, pizza, save, trash } from "ionicons/icons";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { buildCreateMealPayload, mapMealModelingResponseToMeal, postMealToAPI } from "../../api/api";
import { calculateTotalCalories, calculateTotalItemCalories, calculateTotalItemCarbohydrates, calculateTotalItemSaturatedFat, getMealAcuteScore, getMealDisplayCalories, getMealTimeString } from "../../utils";
import { NutrimentComponent } from "../../components/NutrimentComponent";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { updateMealItemFii } from "../../utils/fiiTrustBoundary";
import { getImpactPresentation, isHardToEstimatePresentation } from "../../utils/insulinImpactPresentation";
import { DRAFT_ITEM_ROW_HINT, DRAFT_MEAL_STATUS, ITEM_LIST_EDIT_HELPER, SAVED_MEAL_STATUS, getSaveSuccessMessage, isDraftMealItem, validateMealBeforeSave } from "../../utils/mealDraftUx";
import { APP_DISCLAIMER, MEAL_SCORE_DISCLAIMER, PROVIDED_FII_DISCLAIMER, ROUGH_ESTIMATE_NOTICE, UNKNOWN_ITEMS_NOTICE, getEstimateQualityCopy, humanizeFiiSource, isRoughEstimateSource, isUnknownSource, shouldShowProvidedFiiDisclaimer } from "../../utils/safetyCopy";
import { ACUTE_SCORE_SCALE_EXPLAINER, getAcuteScoreDetailLine } from "../../utils/acuteScoreDisplay";

type SaveFeedback = {
	kind: "error" | "success";
	message: string;
};

const PreviewMeal = () => {
	const { meal, setMeal, deleteMealItem, addEmptyMealItem, setImage, setName, resetMeal } = useCurrentMealStore();

	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const [toastColor, setToastColor] = useState<"success" | "danger">("success");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
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
	const [presentAlert] = useIonAlert();

	const [modalItem, setModalItem] = useState<MealItem | null>(null);
	const isAiDraftFlow = Boolean(meal.isAiDraft);
	const hasEstimate = meal.calorie_source === "meal_estimate" && !!meal.estimate;

	const SUBTYPE_CHIPS: Record<string, string[]> = {
		biryani: ["Veg", "Chicken", "Mutton", "Keema", "Egg", "Paneer"],
		pulao: ["Veg", "Chicken", "Mushroom", "Paneer", "Egg"],
		curry: ["Veg", "Chicken", "Mutton", "Paneer", "Fish", "Egg"],
		"fried rice": ["Veg", "Chicken", "Egg", "Schezwan", "Prawn"],
	};

	const detectDishBase = (name: string): { base: string; variants: string[] } | null => {
		const lower = name.toLowerCase();
		for (const [base, variants] of Object.entries(SUBTYPE_CHIPS)) {
			if (lower.includes(base)) return { base, variants };
		}
		return null;
	};

	const applySubtype = (subtype: string, base: string) => {
		const capitalized = base.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
		setName(`${subtype} ${capitalized}`);
	};

	const dishInfo = isAiDraftFlow ? detectDishBase(meal.name) : null;

	const impactPresentation = !isAiDraftFlow ? getImpactPresentation(meal) : null;
	const displayScore = getMealAcuteScore(meal);
	const showAcuteScoreDetails = impactPresentation !== null && !isHardToEstimatePresentation(impactPresentation) && displayScore !== undefined;
	const estimateQualityCopy = !isAiDraftFlow && meal.estimate_quality ? getEstimateQualityCopy(meal.estimate_quality) : null;
	const hasUnknownItems = !isAiDraftFlow && meal.items.some((item) => isUnknownSource(item.source));
	const visibleImpactDrivers = !isAiDraftFlow ? (meal.main_insulin_drivers ?? []).filter((driver) => driver.trim().length > 0).slice(0, 3) : [];
	const itemWhyLines = !isAiDraftFlow
		? meal.items
				.filter((item) => item.why?.trim())
				.map((item) => `${item.name}: ${item.why?.trim()}`)
				.slice(0, 3)
		: [];

	const parseNumericInput = (value: string, fallback = 0): number => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	const updateItem = (id: string, field: keyof MealItem, value: string) => {
		if (!meal) return;
		const updateTarget = (item: MealItem): MealItem => {
			if (field === "fii") return updateMealItemFii(item, value);
			return { ...item, [field]: field === "name" || field === "servingUnit" ? value : parseNumericInput(value) };
		};
		const updatedItems = meal.items.map((item) => (item.id === id ? updateTarget(item) : item));
		setMeal({ ...meal, items: updatedItems });
		// Update modalItem if it's open and matches the updated item
		setModalItem((prev) => (prev && prev.id === id ? updateTarget(prev) : prev));
	};

	const updateItemAmount = (id: string, amount: number) => {
		if (!meal) return;
		const normalizedAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
		const updatedItems = meal.items.map((item) => (item.id === id ? { ...item, amount: normalizedAmount } : item));
		setMeal({ ...meal, items: updatedItems });
		setModalItem((prev) => (prev && prev.id === id ? { ...prev, amount: normalizedAmount } : prev));
	};

	const adjustItemAmount = (id: string, delta: number) => {
		const target = meal.items.find((item) => item.id === id);
		if (!target) return;
		updateItemAmount(id, Math.max(0.1, Number((target.amount + delta).toFixed(2))));
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

		setIsSubmitting(true);
		try {
			const response = await postMealToAPI(payload);
			console.log("POST /meals response:", response);
			const canonicalMeal = mapMealModelingResponseToMeal(response, meal.image);
			setMeal(canonicalMeal);
			addMeal(canonicalMeal);
			// Full-size photos stay in memory for this session but are not written
			// to localStorage (photo-quota safety, #65) — say so without alarm.
			const successMessage = getSaveSuccessMessage(isPersistableImage(canonicalMeal.image));
			setSaveFeedback({ kind: "success", message: successMessage });
			setToastColor("success");
			setToastMessage(successMessage);
			setShowToast(true);
		} catch (err) {
			console.error("POST /meals failed:", err);
			const errorMessage = err instanceof Error ? err.message : "Failed to save meal";
			setSaveFeedback({ kind: "error", message: errorMessage });
			setToastColor("danger");
			setToastMessage(errorMessage);
			setShowToast(true);
		} finally {
			setIsSubmitting(false);
		}
	};

	const performMealDeletion = async () => {
		// Backend-persisted meals are deleted on the backend first; only a
		// successful (or already-gone) backend delete removes the local copy,
		// so the trash action never claims a deletion that a refresh would undo.
		setIsDeleting(true);
		const result = await deleteMealEverywhere(meal);
		setIsDeleting(false);

		if (!result.deleted) {
			setToastColor("danger");
			setToastMessage("Couldn't delete this meal, so it is still saved. Check that the app can reach the server and try again.");
			setShowToast(true);
			return;
		}

		resetMeal(); // Reset the current meal state
		setTimeout(() => {
			router.goBack();
		}, 100);
	};

	const handleDeleteMeal = () => {
		// Deleting an unsaved draft only discards local state; deleting a saved
		// meal is destructive and permanent, so it gets an explicit confirm.
		const target = resolveMealDeletionTarget(meal);
		if (!target.backend_created_at) {
			void performMealDeletion();
			return;
		}

		void presentAlert({
			header: "Delete saved meal?",
			message: "This permanently removes the saved meal from your history.",
			buttons: [
				{ text: "Cancel", role: "cancel" },
				{ text: "Delete", role: "destructive", handler: () => void performMealDeletion() },
			],
		});
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

	const handleCopyFirstMealItemToMealData = () => {
		if (!meal || meal.items.length === 0) return;

		const firstItem = meal.items[0];
		setImage(firstItem.image || "");
		setName(firstItem.name || "");
	};

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper className='ion-text-left'>
					<IonButtons slot='start'>
						<IonBackButton defaultHref='/meals' />
					</IonButtons>

					<IonTitle>Review Meal</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className=''>
				{meal.image ? (
					<IonImg
						src={meal.image}
						alt='Captured food'
						style={{
							width: "100%",
							height: "200px",
							objectFit: "cover",
							borderRadius: "16px",
							marginBottom: "1rem",
						}}
					/>
				) : (
					<IonButton expand='block' color='medium' fill='outline' onClick={handleTakePicture} className='ion-margin-bottom'>
						<IonIcon icon={camera} slot='start' />
						Take Picture
					</IonButton>
				)}

				<>
						<IonCard style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.24)" }}>
							<IonCardHeader>
							<IonCardTitle>
								<IonInput
									value={meal.name}
									placeholder='Enter dish name'
									onIonInput={(e) => setMeal({ ...meal, name: e.detail.value! })}
									style={{
										fontSize: "20px",
									}}>
									<IonIcon slot='end' icon={create} aria-hidden='true'></IonIcon>
								</IonInput>
							</IonCardTitle>
							{isAiDraftFlow && dishInfo && (
								<div style={{ marginTop: "4px", marginBottom: "4px" }}>
									<IonText color="medium" style={{ fontSize: "0.8rem" }}>
										<span>Wrong type? Tap to fix:</span>
									</IonText>
									<div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
										{dishInfo.variants.map((v) => (
											<IonButton
												key={v}
												size="small"
												fill={meal.name.toLowerCase().startsWith(v.toLowerCase()) ? "solid" : "outline"}
												color="medium"
												style={{ "--border-radius": "16px", fontSize: "0.8rem", height: "28px" } as React.CSSProperties}
												onClick={() => applySubtype(v, dishInfo.base)}
											>
												{v}
											</IonButton>
										))}
									</div>
								</div>
							)}
							{/* Saved-vs-draft state (issue #75): a fresh manual meal or a copy
							    opened from Recents is an editable draft until it is saved, and
							    must not read like a broken saved meal. backend_created_at is the
							    existing persistence marker (#78); nothing new is stored. */}
							<span className={`meal-status-pill ${meal.backend_created_at ? "meal-status-saved" : "meal-status-draft"}`}>{meal.backend_created_at ? SAVED_MEAL_STATUS : DRAFT_MEAL_STATUS}</span>
							<IonText color='medium'>
								<p style={{ marginTop: "4px" }}>
									Total Items: {meal.items.length} <br />
									Total Calories: {getMealDisplayCalories(meal)} kcal
									{hasEstimate && <span style={{ fontSize: "0.8em", opacity: 0.7 }}> (AI estimate)</span>}
									<br />
									Logged at: {getMealTimeString(meal)}
								</p>
							</IonText>
							{isAiDraftFlow && (
								<div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									<IonText>
										<h3 style={{ margin: 0 }}>Does this look right?</h3>
									</IonText>
									<IonText color='medium'>
										<p style={{ margin: 0 }}>Adjust if needed, then tap Accept & Save.</p>
									</IonText>
									<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
										<IonButton size='small' color='success' onClick={handleLogMeal}>
											Accept & Save
										</IonButton>
										<IonButton size='small' fill='outline' onClick={() => setModalItem(meal.items[0] ?? null)} disabled={meal.items.length === 0}>
											Edit Nutrition Details
										</IonButton>
									</div>
								</div>
							)}
								{meal.items.length !== 0 && (
									<IonButton size='small' fill='clear' onClick={handleCopyFirstMealItemToMealData}>
										Update Data Using First Item
									</IonButton>
								)}
							</IonCardHeader>
						</IonCard>

						<IonModal isOpen={!!modalItem} onDidDismiss={() => setModalItem(null)} className='sheet-modal'>
							<div className='sheet-handle' aria-hidden='true' />
							<IonHeader>
								<IonToolbarWrapper className='ion-text-left'>
									<IonTitle>Edit: {modalItem?.name}</IonTitle>
									<IonButtons slot='start'>
										<IonButton slot='icon-only' size='large' aria-label='Close item editor' onClick={() => setModalItem(null)}>
											<IonIcon slot='icon-only' icon={arrowBack} />
										</IonButton>
									</IonButtons>
								</IonToolbarWrapper>
							</IonHeader>
							<IonContent className='ion-padding'>
								{modalItem && (
									<IonCard>
										<IonCardHeader style={{ display: "flex", flexDirection: "row", gap: "12px", justifyContent: "space-between" }}>
											<IonInput
												value={modalItem.name}
												placeholder='Enter item name'
												onIonInput={(e) => updateItem(modalItem.id, "name", e.detail.value!)}
												style={{
													fontSize: "20px",
												}}>
												<IonIcon slot='end' icon={create} aria-hidden='true'></IonIcon>
											</IonInput>
											{modalItem.image ? (
												<IonThumbnail>
													<img alt='Silhouette of mountains' src={modalItem.image} />
												</IonThumbnail>
											) : null}
										</IonCardHeader>
										<IonCardContent>
											<IonInput className='ion-margin-vertical' labelPlacement='start' style={{ textAlign: "right" }} type='number' fill='outline' label='Serving Size' value={modalItem.servingSize} placeholder={`Enter Serving Size`} onIonInput={(e) => updateItem(modalItem.id, "servingSize", e.detail.value!)} />
											<IonSelect className='ion-margin-top' label='Serving Unit' fill='outline' value={modalItem.servingUnit} onIonChange={(e) => updateItem(modalItem.id, "servingUnit", e.detail.value)}>
												{Object.values(Unit).map((u) => (
													<IonSelectOption key={u} value={u}>
														{u}
													</IonSelectOption>
												))}
											</IonSelect>
											<IonInput className='ion-margin-vertical' labelPlacement='start' style={{ textAlign: "right" }} type='number' fill='outline' label='Amount' value={modalItem.amount} placeholder={`Enter Amount`} onIonInput={(e) => updateItem(modalItem.id, "amount", e.detail.value!)} />
											<IonInput className='ion-margin-top' labelPlacement='start' style={{ textAlign: "right" }} type='number' fill='outline' label={`kcals per serving`} value={modalItem.kcalPerServing} placeholder='Enter kcal for one serving' onIonInput={(e) => updateItem(modalItem.id, "kcalPerServing", e.detail.value!)} />
											<IonInput className='ion-margin-vertical' labelPlacement='start' style={{ textAlign: "right" }} type='number' fill='outline' label='Carb per serving (g)' value={modalItem.carbPerServing_g} placeholder={`Enter carbs per serving (g)`} onIonInput={(e) => updateItem(modalItem.id, "carbPerServing_g", e.detail.value!)} />
											<IonInput className='ion-margin-vertical' labelPlacement='start' style={{ textAlign: "right" }} type='number' fill='outline' label='Saturated Fat per serving (g)' value={modalItem.satFatPerServing_g} placeholder={`Enter saturated fat per serving (g)`} onIonInput={(e) => updateItem(modalItem.id, "satFatPerServing_g", e.detail.value!)} />
											<IonInput fill='outline' labelPlacement='start' type='number' style={{ textAlign: "right" }} label='FII' value={modalItem.fii ?? ""} placeholder='Enter FII' onIonInput={(e) => updateItem(modalItem.id, "fii", e.detail.value ?? "")} />
											<IonInput className='ion-margin-vertical' labelPlacement='start' style={{ textAlign: "right" }} type='number' fill='outline' label='Glycemic Index' value={modalItem.gi} placeholder={`Enter glycemic index`} onIonInput={(e) => updateItem(modalItem.id, "gi", e.detail.value!)} />
											<div className='' style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
												<NutrimentComponent nutrimentName='Total Calories' nutrimentValue={`${calculateTotalItemCalories(modalItem)} kcal`} nutrimentIcon={flame} nutrimentIconColor='#ff5151ff' />
												<NutrimentComponent nutrimentName='Total Carbs' nutrimentValue={`${calculateTotalItemCarbohydrates(modalItem)} g`} nutrimentIcon={pizza} nutrimentIconColor='#ffcc00ff' />
												<NutrimentComponent nutrimentName='Total Saturated Fat' nutrimentValue={`${calculateTotalItemSaturatedFat(modalItem)} g`} nutrimentIcon={batteryCharging} nutrimentIconColor='#0091ffff' />
												{modalItem.source ? <IonText>Source: {humanizeFiiSource(modalItem.source)}</IonText> : null}
												{shouldShowProvidedFiiDisclaimer(modalItem.source, modalItem.fii) ? (
													<IonText color='medium' style={{ fontSize: "0.85rem" }}>
														{PROVIDED_FII_DISCLAIMER}
													</IonText>
												) : null}
												{isRoughEstimateSource(modalItem.source) ? (
													<IonText color='medium' style={{ fontSize: "0.85rem" }}>
														{ROUGH_ESTIMATE_NOTICE}
													</IonText>
												) : null}
												{isUnknownSource(modalItem.source) ? (
													<IonText color='medium' style={{ fontSize: "0.85rem" }}>
														{UNKNOWN_ITEMS_NOTICE}
													</IonText>
												) : null}

												<IonButton aria-label='Done editing item' onClick={() => setModalItem(null)}>
													<IonIcon slot='icon-only' icon={save} />
												</IonButton>

												<IonButton
													slot='icon-only'
													color='danger'
													aria-label='Remove item from meal'
													onClick={() => {
														deleteMealItem(modalItem.id);
														setModalItem(null);
													}}>
													<IonIcon slot='icon-only' icon={trash} />
												</IonButton>
											</div>
										</IonCardContent>
									</IonCard>
								)}
							</IonContent>
						</IonModal>

					{hasEstimate && isAiDraftFlow && meal.estimate && (() => {
						const estCal = Math.round(meal.estimate.estimated_calories * meal.estimate.serving_count);
						const itemSumCal = calculateTotalCalories(meal);
						const diff = itemSumCal > 0 ? Math.abs(estCal - itemSumCal) / itemSumCal : 0;
						const showMismatch = itemSumCal > 0 && diff > 0.25;

						return (
							<IonCard style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.18)", background: "var(--ion-color-primary-tint, #e8f0fe)" }}>
								<IonCardHeader>
									<IonCardTitle style={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
										<IonIcon icon={flame} style={{ color: "#ff5151" }} />
										Estimated Meal Nutrition
									</IonCardTitle>
									<IonText color="medium" style={{ fontSize: "0.78rem", marginTop: "2px", display: "block" }}>
										AI nutrition estimate for the whole meal, before save.
									</IonText>
								</IonCardHeader>
								<IonCardContent>
									<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
										<div style={{ display: "flex", justifyContent: "space-between" }}>
											<span>Calories</span>
											<strong>{estCal} kcal</strong>
										</div>
										<div style={{ display: "flex", justifyContent: "space-between" }}>
											<span>Carbs</span>
											<strong>{Math.round(meal.estimate.estimated_carbs_g * meal.estimate.serving_count)} g</strong>
										</div>
										<div style={{ display: "flex", justifyContent: "space-between" }}>
											<span>Fat</span>
											<strong>{Math.round(meal.estimate.estimated_fat_g * meal.estimate.serving_count)} g</strong>
										</div>
										<div style={{ display: "flex", justifyContent: "space-between", opacity: 0.7 }}>
											<span>Serving</span>
											<span>{meal.estimate.serving_count} × {meal.estimate.serving_type}</span>
										</div>
										<IonText color='medium' style={{ fontSize: "0.85rem", marginTop: "4px" }}>
											Review this estimate, then adjust the item details before saving.
										</IonText>
										{showMismatch && (
											<IonText color="warning" style={{ fontSize: "0.85rem", marginTop: "4px" }}>
												<IonIcon icon={information} style={{ verticalAlign: "middle", marginRight: "4px" }} />
												Item breakdown ({Math.round(itemSumCal)} kcal) differs from estimate by {Math.round(diff * 100)}%. Consider reviewing items.
											</IonText>
										)}
									</div>
								</IonCardContent>
							</IonCard>
						);
					})()}

					{impactPresentation && (
						<IonCard style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.18)", borderLeft: `6px solid ${impactPresentation.color}` }}>
							<IonCardHeader>
								<IonCardTitle style={{ fontSize: "1rem", color: impactPresentation.color }}>Estimated Insulin Demand</IonCardTitle>
								<IonText color='medium' style={{ fontSize: "0.82rem", marginTop: "2px", display: "block" }}>
									{MEAL_SCORE_DISCLAIMER}
								</IonText>
								{estimateQualityCopy && (
									<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
										<span
											style={{
												padding: "4px 10px",
												borderRadius: "999px",
												background: "#f4f6f8",
												fontSize: "0.78rem",
												fontWeight: 600,
											}}>
											Data quality: {estimateQualityCopy.label}
										</span>
										<IonText color='medium' style={{ fontSize: "0.78rem" }}>
											<span>{estimateQualityCopy.description}</span>
										</IonText>
									</div>
								)}
							</IonCardHeader>
							<IonCardContent>
								<IonText>
									<h3 style={{ marginTop: 0, marginBottom: "8px" }}>{impactPresentation.title}</h3>
								</IonText>
								{showAcuteScoreDetails && (
									<>
										<IonText color='medium' style={{ fontSize: "0.85rem" }}>
											<p style={{ margin: "0 0 4px" }}>{getAcuteScoreDetailLine(displayScore)}</p>
										</IonText>
										<IonText color='medium' style={{ fontSize: "0.78rem" }}>
											<p style={{ margin: "0 0 8px" }}>{ACUTE_SCORE_SCALE_EXPLAINER}</p>
										</IonText>
									</>
								)}
								<IonText color='medium'>
									<p style={{ marginTop: 0 }}>{impactPresentation.description}</p>
								</IonText>
								{hasUnknownItems && (
									<IonText color='warning'>
										<p style={{ marginTop: "8px", marginBottom: 0, fontSize: "0.85rem" }}>{UNKNOWN_ITEMS_NOTICE}</p>
									</IonText>
								)}
								{visibleImpactDrivers.length > 0 && (
									<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
										{visibleImpactDrivers.map((driver) => (
											<span
												key={driver}
												style={{
													padding: "6px 10px",
													borderRadius: "999px",
													background: "#f4f6f8",
													fontSize: "0.82rem",
												}}>
												{driver}
											</span>
										))}
									</div>
								)}
								{itemWhyLines.length > 0 && (
									<div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
										<IonText color='medium' style={{ fontSize: "0.82rem" }}>
											<span>Why the model leaned this way:</span>
										</IonText>
										{itemWhyLines.map((line) => (
											<IonText key={line} color='medium' style={{ fontSize: "0.85rem" }}>
												<p style={{ margin: 0 }}>{line}</p>
											</IonText>
										))}
									</div>
								)}
							</IonCardContent>
						</IonCard>
					)}

					<IonItemDivider>
						<IonLabel>{isAiDraftFlow ? "AI Draft Items" : "Meal Items"}</IonLabel>
					</IonItemDivider>

						{!isAiDraftFlow && meal.items.length > 0 && (
							<IonText color='medium'>
								<p className='item-list-helper'>{ITEM_LIST_EDIT_HELPER}</p>
							</IonText>
						)}

						{meal.items.length === 0 ? (
							<div className='draft-empty-note'>
								<p style={{ margin: "0 0 4px", fontWeight: 600, color: "#1c2b39" }}>This meal is an editable draft</p>
								<p style={{ margin: 0 }}>
									Tap the <strong>+</strong> button to add your first item — enter nutrition manually or let AI suggest it. Estimates appear after you save.
								</p>
							</div>
						) : isAiDraftFlow ? (
							<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
								{meal.items.map((item) => (
									<IonCard key={item.id} style={{ margin: 0, borderRadius: "14px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.16)" }}>
										<IonCardHeader>
											<IonCardTitle style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
												<span>{item.name}</span>
												<IonText color='danger'>
													<strong>{Math.round(calculateTotalItemCalories(item))} kcal</strong>
												</IonText>
											</IonCardTitle>
											<IonText color='medium'>
												<p style={{ margin: 0 }}>Quick adjust portion</p>
											</IonText>
										</IonCardHeader>
										<IonCardContent>
											<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
												<IonButton size='small' fill='outline' onClick={() => adjustItemAmount(item.id, -0.5)}>
													-
												</IonButton>
												<IonInput
													type='number'
													inputMode='decimal'
													fill='outline'
													value={item.amount}
													min={0}
													onIonInput={(e) => updateItemAmount(item.id, parseNumericInput(e.detail.value ?? "", item.amount))}
													style={{ flex: 1 }}
												/>
												<IonButton size='small' fill='outline' onClick={() => adjustItemAmount(item.id, 0.5)}>
													+
												</IonButton>
												<IonSelect
													fill='outline'
													interface='popover'
													value={item.servingUnit}
													onIonChange={(e) => updateItem(item.id, "servingUnit", e.detail.value)}
													style={{ minWidth: "100px" }}>
													{Object.values(Unit).map((u) => (
														<IonSelectOption key={u} value={u}>
															{u}
														</IonSelectOption>
													))}
												</IonSelect>
											</div>
											<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
												<IonButton size='small' fill='outline' onClick={() => setModalItem(item)}>
													Edit Nutrition
												</IonButton>
												<IonButton
													size='small'
													fill='clear'
													color='danger'
													onClick={() => {
														deleteMealItem(item.id);
														if (modalItem?.id === item.id) {
															setModalItem(null);
														}
													}}>
													Remove
												</IonButton>
											</div>
										</IonCardContent>
									</IonCard>
								))}
							</div>
						) : (
							<IonList inset={true} style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.24)" }}>
								{meal.items.map((item) => (
									<IonItem button detail={false} key={item.id} className={isDraftMealItem(item) ? "draft-item-row" : undefined} onClick={() => setModalItem(item)}>
										{item.image ? (
											<IonThumbnail slot='end'>
												<IonImg alt='Silhouette of mountains' src={item.image} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
											</IonThumbnail>
										) : null}
										<IonLabel>
											<h2 style={{ marginBottom: "0.5rem" }}>{item.name}</h2>
											{isDraftMealItem(item) ? (
												<span className='draft-item-hint'>{DRAFT_ITEM_ROW_HINT}</span>
											) : (
												<IonNote color='medium' className='ion-text-wrap'>
													<NutrimentComponent nutrimentName='Calories' nutrimentValue={calculateTotalItemCalories(item)} nutrimentIcon={flame} nutrimentIconColor='#d96a52' />
													<NutrimentComponent nutrimentName='Carbohydrates' nutrimentValue={calculateTotalItemCarbohydrates(item)} nutrimentIcon={pizza} nutrimentIconColor='#d9a62e' />
													<NutrimentComponent nutrimentName='Saturated Fats' nutrimentValue={calculateTotalItemSaturatedFat(item)} nutrimentIcon={batteryCharging} nutrimentIconColor='#2f86c0' />
												</IonNote>
											)}
											{item.why ? (
												<IonText color='medium' style={{ fontSize: "0.85rem" }}>
													<p style={{ marginTop: "8px", marginBottom: 0 }}>{item.why}</p>
												</IonText>
											) : null}
										</IonLabel>
										<span slot='end' className='item-edit-affordance' aria-hidden='true'>
											<IonIcon icon={create} />
											Edit
										</span>
									</IonItem>
								))}
							</IonList>
						)}

						<div className='ion-text-center ion-margin-vertical'>
							<IonButton id='open-meal-item-action-sheet' size='large' shape='round' color='primary' aria-label='Add meal item'>
								<IonIcon slot='icon-only' icon={add} size='small' />
							</IonButton>
						</div>

						{/* Inline save feedback (issue #75): stays on screen until acted on,
						    unlike the auto-dismissing toast, so a rejected or successful save
						    is impossible to miss. */}
						{saveFeedback && (
							<div className={`save-feedback-banner ${saveFeedback.kind === "error" ? "save-feedback-error" : "save-feedback-success"}`} role='status' aria-live='polite'>
								<IonIcon icon={saveFeedback.kind === "error" ? alertCircle : checkmarkCircle} aria-hidden='true' />
								<span>{saveFeedback.message}</span>
							</div>
						)}

						<div className='disclaimer-note' style={{ marginBottom: "5.5rem" }}>
							{APP_DISCLAIMER}
						</div>

						<IonActionSheet
							trigger='open-meal-item-action-sheet'
							header='Actions'
							buttons={[
								{
									text: "AI",
									icon: desktop,
									data: {
										action: "ai",
									},
								},
								{
									text: "Manual",
									icon: pencil,
									data: {
										action: "manual",
									},
								},
								{
									text: "Cancel",
									role: "cancel",
									icon: close,
									data: {
										action: "cancel",
									},
								},
							]}
							onDidDismiss={({ detail }) => {
								if (!detail.data || detail.data.action === "cancel") return;
								if (detail.data.action === "ai") {
									router.push("/meals/new/ai");
								} else if (detail.data.action === "manual") {
									addEmptyMealItem();
								}
							}}
						/>

						<IonFab slot='fixed' vertical='bottom' horizontal='end'>
							<IonFabButton aria-label='Meal actions'>
								<IonIcon size='small' icon={chevronUp}></IonIcon>
							</IonFabButton>
							<IonFabList side='top'>
								<IonFabButton color='danger' aria-label='Delete meal' onClick={handleDeleteMeal}>
									<IonIcon icon={trash}></IonIcon>
								</IonFabButton>
								<IonFabButton color='success' aria-label='Save meal' onClick={handleLogMeal}>
									<IonIcon icon={save}></IonIcon>
								</IonFabButton>
							</IonFabList>
						</IonFab>

						<IonLoading isOpen={isSubmitting} message='Estimating insulin demand…' />
						<IonLoading isOpen={isDeleting} message='Deleting meal…' />
						<IonToast isOpen={showToast} message={toastMessage} duration={2200} color={toastColor} onDidDismiss={() => setShowToast(false)} />
				</>
			</IonContent>
		</IonPage>
	);
};

export default PreviewMeal;
