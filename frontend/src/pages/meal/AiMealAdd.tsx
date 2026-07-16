import { IonPage, IonContent, IonHeader, IonTitle, IonButton, IonImg, IonText, IonIcon, IonTextarea, IonBackButton, IonButtons, IonLoading, useIonViewDidLeave, useIonViewWillEnter } from "@ionic/react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useEffect, useState } from "react";
import { useIonRouter } from "@ionic/react";
import { camera, image, pencil, trash } from "ionicons/icons";
import { fetchAiMealFromAPI, normalizeAiExtractedItem } from "../../api/api";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { MealEstimate } from "../../types/Meal";
import { AI_EXTRACTION_PRIVACY_DISCLOSURE } from "../../utils/safetyCopy";
import { describeAiExtractionFailure, describeCameraFailure } from "../../utils/aiFailureCopy";

const AiMealAdd = () => {
	const [error, setError] = useState("");
	const [failureKind, setFailureKind] = useState<"analysis" | "camera" | null>(null);
	const router = useIonRouter();
	const [images, setImages] = useState<string[]>([]);
	useEffect(() => {
		if (images.length > 0 && failureKind === "camera") {
			setError("");
			setFailureKind(null);
		}
	}, [failureKind, images.length]);
	const visibleError = failureKind === "camera" && images.length > 0 ? "" : error;
	const addImage = (image: string) => {
		setImages((prev) => [...prev, image]);
	};
	const removeImage = (index: number) => {
		setImages((prev) => prev.filter((_, i) => i !== index));
	};
	const [textualData, setTextualData] = useState("");
	// const { View: ScanFoodAnimation } = useLottie({ animationData: scanFood, loop: true, autoplay: true });
	const { meal, setMeal, addEmptyMealItem } = useCurrentMealStore();
	const [isLoading, setLoading] = useState(false);

	const toNumber = (value: unknown, fallback = 0): number => {
		const parsed = typeof value === "number" ? value : Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	const resetExtractionState = () => {
		setImages([]);
		setTextualData("");
		setError("");
		setFailureKind(null);
		setLoading(false);
	};

	useIonViewWillEnter(() => {
		resetExtractionState();
	});

	useIonViewDidLeave(() => {
		resetExtractionState();
	});

	const normalizeEstimate = (raw: unknown): MealEstimate | undefined => {
		if (!raw || typeof raw !== "object") return undefined;
		const src = raw as Record<string, unknown>;
		const cal = toNumber(src.estimated_calories, 0);
		if (cal <= 0) return undefined;
		return {
			estimated_calories: cal,
			estimated_carbs_g: toNumber(src.estimated_carbs_g, 0),
			estimated_fat_g: toNumber(src.estimated_fat_g, 0),
			confidence: Math.min(1, Math.max(0, toNumber(src.confidence, 0.5))),
			serving_type: typeof src.serving_type === "string" ? src.serving_type : "plate",
			serving_count: toNumber(src.serving_count, 1) || 1,
		};
	};

	const handleOnSubmit = async () => {
		if (images.length === 0) {
			setError("Please capture at least one image before proceeding.");
			return;
		}
		setLoading(true);
		setError("");
		setFailureKind(null);
		try {
			const extractedMeal = await fetchAiMealFromAPI(images, textualData);
			const normalizedItems = (Array.isArray(extractedMeal.items) ? extractedMeal.items : []).map(normalizeAiExtractedItem);
			const estimate = normalizeEstimate((extractedMeal as Record<string, unknown>).estimate);
			setMeal({
				...meal,
				name: extractedMeal.name || meal.name,
				items: normalizedItems,
				image: images[0] ?? meal.image,
				isAiDraft: true,
				estimate,
				calorie_source: estimate ? "meal_estimate" : "item_sum",
			});
			resetExtractionState();
			router.goBack();
		} catch (err: unknown) {
			// Never surface raw backend/provider error text (issue #74); log it
			// for diagnostics and show curated copy with a manual fallback.
			console.error("AI meal extraction failed:", err);
			setError(describeAiExtractionFailure(err));
			setFailureKind("analysis");
		} finally {
			setLoading(false);
		}
	};

	const handleAddManually = () => {
		// Land the user back on the meal draft with an editable item row —
		// the same thing the "Manual" action on the draft screen does.
		if (meal.items.length === 0) {
			addEmptyMealItem();
		}
		router.push("/meals/new", "back");
	};

	const handleAddPhoto = async (source: CameraSource) => {
		if (images.length === 0) {
			setTextualData("");
			setError("");
			setFailureKind(null);
			setLoading(false);
		}
		try {
			const photo = await Camera.getPhoto({
				resultType: CameraResultType.Base64,
				source,
				quality: 90,
				saveToGallery: false,
			});

			if (photo.base64String) {
				if (images.length >= 5) {
					setError("You can only upload up to 5 images.");
					return;
				}
				const base64Image = `data:image/jpeg;base64,${photo.base64String}`;
				addImage(base64Image);
				setError("");
				setFailureKind(null);

				// router.push(`/camera/review?image=${encodeURIComponent(base64Image)}`, "forward");
			}
		} catch (err) {
			setError(describeCameraFailure(err));
			setFailureKind("camera");
		}
	};

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper className='ion-text-left'>
					<IonButtons slot='start'>
						<IonBackButton />
					</IonButtons>
					<IonTitle>Smart Camera</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='ion-padding ion-text-center'>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
					{/* {ScanFoodAnimation} */}

					<IonText color='medium'>
						<h1 className='camera-heading'>Photograph your meal</h1>
						<ul style={{ textAlign: "left", paddingLeft: "1.5rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
							<li>Keep the whole meal visible.</li>
							<li>Add another angle or a label when it helps show what's included.</li>
							<li>You can add up to 5 photos.</li>
						</ul>
					</IonText>

					{images && (
						<div className='ion-margin-vertical' style={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
							{images.map((imageDataUri, index) => (
								<div className='' style={{ position: "relative" }} key={index}>
									<IonImg
										key={index}
										src={imageDataUri}
										alt={`Captured food ${index + 1}`}
										style={{
											width: 120,
											height: 120,
											objectFit: "cover",
											borderRadius: 10,
											overflow: "hidden",
										}}
									/>
									<IonButton
										color='danger'
										size='small'
										aria-label={`Remove photo ${index + 1}`}
										onClick={() => {
											removeImage(index);
										}}
										style={{ position: "absolute", top: -10, right: -10 }}>
										<IonIcon icon={trash} slot='icon-only' />
									</IonButton>
								</div>
							))}
						</div>
					)}

					<IonTextarea
						onIonChange={(e) => setTextualData(e.detail.value ?? "")}
						value={textualData}
						className='ion-text-left'
						fill='outline'
						label="Anything the photo can't show? (optional)"
						labelPlacement='floating'
						placeholder='e.g. cooked in butter, brown rice, half portion'
					/>

					<IonText color='medium'>
						<p style={{ fontSize: "0.78rem", textAlign: "left", margin: "0.5rem 0 0" }}>{AI_EXTRACTION_PRIVACY_DISCLOSURE}</p>
					</IonText>

					{visibleError && (
						<div
							role='alert'
							style={{
								width: "100%",
								textAlign: "left",
								background: "#f4f6f8",
								borderLeft: "4px solid #d9a62e",
								borderRadius: "10px",
								padding: "12px",
								marginTop: "0.75rem",
								display: "flex",
								flexDirection: "column",
								gap: "8px",
							}}>
							<IonText>
								<p style={{ margin: 0, fontSize: "0.92rem" }}>{visibleError}</p>
							</IonText>
							<div className='camera-error-actions'>
								{failureKind === "analysis" && (
									<IonButton size='small' fill='outline' onClick={handleOnSubmit} disabled={isLoading}>
										Try again
									</IonButton>
								)}
								<IonButton size='small' fill='outline' onClick={handleAddManually}>
									<IonIcon slot='start' icon={pencil} />
									Enter manually instead
								</IonButton>
							</div>
						</div>
					)}

					<div className='camera-capture-actions ion-margin-top'>
						<IonButton expand='block' fill='outline' onClick={() => handleAddPhoto(CameraSource.Camera)} disabled={images.length >= 5}>
							<IonIcon icon={camera} slot='start' />
							{images.length === 0 ? "Take a photo" : "Add another angle"}
						</IonButton>
						<IonButton expand='block' fill='clear' onClick={() => handleAddPhoto(CameraSource.Photos)} disabled={images.length >= 5}>
							<IonIcon slot='start' icon={image} />
							Choose from photos
						</IonButton>
					</div>

					<IonButton className='analyze-meal-button' expand='block' onClick={handleOnSubmit} disabled={isLoading || images.length === 0}>
						Analyze meal
					</IonButton>
				</div>

				<IonLoading message='Reading your meal photo...' isOpen={isLoading} />
			</IonContent>
		</IonPage>
	);
};

export default AiMealAdd;
