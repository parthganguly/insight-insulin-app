import { IonPage, IonContent, IonHeader, IonButton, IonImg, IonIcon, IonTextarea, IonButtons, useIonViewDidLeave, useIonViewWillEnter } from "@ionic/react";
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

	const hasImages = images.length > 0;
	const atQuota = images.length >= 5;

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper className='camera-toolbar'>
					<span className='camera-framing-hint'>Frame the whole meal</span>
					<IonButtons slot='end'>
						<IonButton className='camera-cancel-action' onClick={() => router.push("/log-meal", "back")}>
							Cancel
						</IonButton>
					</IonButtons>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='camera-content'>
				<section className='camera-frame' aria-labelledby='meal-photo-capture-title'>
					<h1 id='meal-photo-capture-title' className='camera-visually-hidden'>
						Meal photo capture
					</h1>
					{hasImages ? (
						<>
							<p className='camera-visually-hidden' aria-live='polite'>
								{images.length} captured meal {images.length === 1 ? "photo" : "photos"} ready for analysis.
							</p>
							<ul className='camera-thumbnails' aria-label='Captured meal photos'>
							{images.map((imageDataUri, index) => (
								<li className={index === 0 ? "camera-thumbnail camera-thumbnail-primary" : "camera-thumbnail"} key={index}>
									<IonImg src={imageDataUri} alt={`Captured food ${index + 1}`} className='camera-thumbnail-image' />
									<button type='button' className='camera-thumbnail-remove' aria-label={`Remove photo ${index + 1}`} onClick={() => removeImage(index)}>
										<IonIcon icon={trash} aria-hidden='true' />
										<span className='camera-visually-hidden'>Remove photo {index + 1}</span>
									</button>
								</li>
							))}
							</ul>
						</>
					) : (
						<div className='camera-frame-placeholder'>
							<IonIcon icon={camera} aria-hidden='true' />
							<p>No photo captured yet</p>
						</div>
					)}
				</section>

				<div className='camera-controls'>
					{visibleError && (
						<div role='alert' className='camera-failure-card'>
							<p>{visibleError}</p>
							<div className='camera-failure-actions'>
								{failureKind === "analysis" && (
									<IonButton size='small' fill='outline' onClick={handleOnSubmit} disabled={isLoading}>
										Try again
									</IonButton>
								)}
								<IonButton size='small' fill='outline' onClick={handleAddManually}>
									<IonIcon slot='start' icon={pencil} aria-hidden='true' />
									Enter manually instead
								</IonButton>
							</div>
						</div>
					)}

					<details className='camera-privacy'>
						<summary>How your photo is used</summary>
						<p>{AI_EXTRACTION_PRIVACY_DISCLOSURE}</p>
					</details>

					<IonTextarea
						className='camera-note'
						onIonChange={(e) => setTextualData(e.detail.value ?? "")}
						value={textualData}
						fill='outline'
						label="Anything the photo can't show? (optional)"
						labelPlacement='floating'
						placeholder='e.g. cooked in butter, brown rice, half portion'
					/>

					<div className='camera-action-row'>
						<IonButton className='camera-library-button' fill='outline' onClick={() => handleAddPhoto(CameraSource.Photos)} disabled={atQuota}>
							<IonIcon slot='start' icon={image} aria-hidden='true' />
							Choose from photos
						</IonButton>

						<IonButton className={hasImages ? "camera-shutter-button camera-shutter-button-secondary" : "camera-shutter-button"} onClick={() => handleAddPhoto(CameraSource.Camera)} disabled={atQuota}>
							<IonIcon slot='start' icon={camera} aria-hidden='true' />
							{hasImages ? "Add another angle" : "Take a photo"}
						</IonButton>
					</div>

					<IonButton className='camera-analyze-button' expand='block' onClick={handleOnSubmit} disabled={isLoading || !hasImages}>
						{isLoading ? "Reading your meal photo…" : "Analyze meal"}
					</IonButton>
				</div>
			</IonContent>
		</IonPage>
	);
};

export default AiMealAdd;
