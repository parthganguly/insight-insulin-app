import { IonPage, IonContent, IonToast, IonHeader, IonToolbar, IonTitle, IonButton, IonImg, IonText, IonIcon, IonTextarea, IonBackButton, IonButtons, IonFab, IonFabButton, IonLoading, useIonViewDidLeave, useIonViewWillEnter } from "@ionic/react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useState } from "react";
import { useIonRouter } from "@ionic/react";
import { arrowForward, camera, trash } from "ionicons/icons";
import { fetchAiMealFromAPI } from "../../api/api";
import { useCurrentMealStore } from "../../stores/currentMealStore";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { MealItem, Unit } from "../../types/MealItem";
import { MealEstimate } from "../../types/Meal";

const AiMealAdd = () => {
	const [error, setError] = useState("");
	const router = useIonRouter();
	const [images, setImages] = useState<string[]>([]);
	const addImage = (image: string) => {
		setImages((prev) => [...prev, image]);
	};
	const removeImage = (index: number) => {
		setImages((prev) => prev.filter((_, i) => i !== index));
	};
	const [textualData, setTextualData] = useState("");
	// const { View: ScanFoodAnimation } = useLottie({ animationData: scanFood, loop: true, autoplay: true });
	const { meal, setMeal } = useCurrentMealStore();
	const [isLoading, setLoading] = useState(false);

	const resetExtractionState = () => {
		setImages([]);
		setTextualData("");
		setError("");
		setLoading(false);
	};

	useIonViewWillEnter(() => {
		resetExtractionState();
	});

	useIonViewDidLeave(() => {
		resetExtractionState();
	});

	const toNumber = (value: unknown, fallback = 0): number => {
		const parsed = typeof value === "number" ? value : Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	const toMealUnit = (value: unknown): Unit => {
		if (typeof value === "string" && Object.values(Unit).includes(value as Unit)) {
			return value as Unit;
		}
		return Unit.Servings;
	};

	const normalizeAiDensityValue = (value: number | undefined, unit: Unit, maxPerSingleUnit: number): number | undefined => {
		if (value === undefined || !Number.isFinite(value)) return value;
		if (unit !== Unit.Grams && unit !== Unit.Milliliters) return value;

		const looksLikePerHundredUnits = value > maxPerSingleUnit;
		return looksLikePerHundredUnits ? value / 100 : value;
	};

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

	const normalizeAiExtractedItem = (item: unknown): MealItem => {
		const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
		const servingUnit = toMealUnit(source.unit ?? source.servingUnit);
		const kcalPerUnit = normalizeAiDensityValue(toNumber(source.kcalPerUnit ?? source.kcalPerServing, 0), servingUnit, 9.5) ?? 0;
		const carbPerUnit = normalizeAiDensityValue(toNumber(source.carb_g ?? source.carbPerServing_g, 0), servingUnit, 1) ?? 0;
		const proteinPerUnitRaw = source.protein_g === undefined ? undefined : toNumber(source.protein_g);
		const fatPerUnitRaw = source.fat_g === undefined ? undefined : toNumber(source.fat_g);
		const satFatPerUnit = normalizeAiDensityValue(toNumber(source.satFat_g ?? source.satFatPerServing_g, 0), servingUnit, 1) ?? 0;

		return {
			id: typeof source.id === "string" && source.id.trim() ? source.id : crypto.randomUUID(),
			name: typeof source.name === "string" && source.name.trim() ? source.name : "New Item",
			image: typeof source.image === "string" ? source.image : undefined,
			servingSize: 1,
			servingUnit,
			amount: toNumber(source.quantity ?? source.amount, 0),
			kcalPerServing: kcalPerUnit,
			carbPerServing_g: carbPerUnit,
			proteinPerServing_g: normalizeAiDensityValue(proteinPerUnitRaw, servingUnit, 1),
			fatPerServing_g: normalizeAiDensityValue(fatPerUnitRaw, servingUnit, 1),
			satFatPerServing_g: satFatPerUnit,
			source: typeof source.source === "string" ? source.source : "ai",
			fii: toNumber(source.fii, 0),
			gi: toNumber(source.gi, 0),
		};
	};

	const handleOnSubmit = async () => {
		if (images.length === 0) {
			setError("Please capture at least one image before proceeding.");
			return;
		}
		setLoading(true);
		setError("");
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
			const errorMessage = err instanceof Error && err.message ? err.message : "Failed to extract meal data.";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleStartScan = async () => {
		if (images.length === 0) {
			setTextualData("");
			setError("");
			setLoading(false);
		}
		try {
			const photo = await Camera.getPhoto({
				resultType: CameraResultType.Base64,
				source: CameraSource.Camera,
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

				// router.push(`/camera/review?image=${encodeURIComponent(base64Image)}`, "forward");
			}
		} catch (err) {
			setError("Camera access was cancelled or failed.");
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
						<h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "2rem" }}>Scan Your Meal</h2>
						<ul style={{ textAlign: "left", paddingLeft: "1.5rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
							<li style={{ fontSize: "1rem", marginBottom: "0.3rem" }}>Snap pictures of your meal.</li>
							<li style={{ fontSize: "1rem", marginBottom: "0.3rem" }}>Include as many pictures as you like (up to 5).</li>
							<li style={{ fontSize: "1rem", marginBottom: "0.3rem" }}>Include images of the nutritional info, serving size, and other data.</li>
							<li style={{ fontSize: "1rem" }}>Providing more data provides more accurate results.</li>
							<li style={{ fontSize: "1rem" }}>Optionally provide more textual description to better describe your meal.</li>
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

					<IonTextarea onIonChange={(e) => setTextualData(e.detail.value ?? "")} value={textualData} className='ion-text-left' fill='outline' label='Textual Description (Optional)' labelPlacement='floating' placeholder='Textual Description'></IonTextarea>

					<IonButton className='ion-margin-top' size='large' onClick={handleStartScan}>
						<IonIcon size='large' icon={camera} slot='icon-only' />
					</IonButton>
				</div>

				<IonFab slot='fixed' vertical='bottom' horizontal='end'>
					<IonFabButton onClick={handleOnSubmit} disabled={isLoading || images.length === 0}>
						<IonIcon icon={arrowForward}></IonIcon>
					</IonFabButton>
				</IonFab>
				<IonLoading message='Loading' isOpen={isLoading} />
				<IonToast isOpen={!!error} message={error} duration={3000} color='danger' onDidDismiss={() => setError("")} />
			</IonContent>
		</IonPage>
	);
};

export default AiMealAdd;
