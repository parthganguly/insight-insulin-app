import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonToggle, IonText, IonSelect, IonSelectOption, IonInput } from "@ionic/react";
import React from "react";
import { ActivityLevel, Gender, useSettingsStore } from "../../stores/settingsStore";
import { calculateBmr, calculateTdee } from "../../utils";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";

const Settings: React.FC = () => {
	const { setGender, gender, age, setAge, weight, setWeight, height, setHeight, activityLevel, setActivityLevel } = useSettingsStore();

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper className='ion-text-center'>
					<IonTitle>Settings</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='ion-padding'>
				{/* <IonText color='medium'>
					<h2 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>Preferences</h2>
				</IonText>
				
				<IonList>
					<IonItem style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<IonToggle checked={darkMode} onIonChange={(e) => toggleDarkMode(e.detail.checked)}>
							Dark Mode
						</IonToggle>
					</IonItem>
				</IonList> */}
				<IonText color='medium'>
					<h2 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>Data</h2>
				</IonText>
				<IonList>
					<IonItem>
						<IonSelect label='Gender' aria-label='Gender' placeholder='Gender' value={gender} onIonChange={(e) => setGender(e.detail.value)}>
							<IonSelectOption value='male'>Male</IonSelectOption>
							<IonSelectOption value='female'>Female</IonSelectOption>
						</IonSelect>
					</IonItem>
					<IonItem>
						<IonInput
							type='number'
							label='Age'
							value={age}
							style={{ textAlign: "right" }}
							placeholder='Age'
							onIonInput={(e) => {
								const value = e.detail.value;
								setAge(value !== undefined && value !== null && value !== "" ? Number(value) : 0);
							}}
						/>
					</IonItem>
					<IonItem>
						<IonInput
							type='number'
							label='Weight (kg)'
							value={weight}
							style={{ textAlign: "right" }}
							placeholder='Weight (kg)'
							onIonInput={(e) => {
								const value = e.detail.value;
								setWeight(value !== undefined && value !== null && value !== "" ? Number(value) : 0);
							}}
						/>
					</IonItem>
					<IonItem>
						<IonInput
							type='number'
							label='Height (cm)'
							style={{ textAlign: "right" }}
							value={height}
							placeholder='Height (cm)'
							onIonInput={(e) => {
								const value = e.detail.value;
								setHeight(value !== undefined && value !== null && value !== "" ? Number(value) : 0);
							}}
						/>
					</IonItem>
					<IonItem>
						<IonSelect label='Activity Level' aria-label='Activity Level' placeholder='Activity Level' value={activityLevel} onIonChange={(e) => setActivityLevel(e.detail.value)}>
							<IonSelectOption value='sedentary'>Sedentary</IonSelectOption>
							<IonSelectOption value='light'>Lightly Active</IonSelectOption>
							<IonSelectOption value='moderate'>Moderately Active</IonSelectOption>
							<IonSelectOption value='active'>Active</IonSelectOption>
							<IonSelectOption value='very_active'>Very Active</IonSelectOption>
						</IonSelect>
					</IonItem>
				</IonList>
				{
					// Display TDEE calculation if all required fields are filled
					weight && height && age && activityLevel && gender && (
						<>
							<IonText color='medium'>
								<h2 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>Calculated Data</h2>
							</IonText>
							<IonList>
								<IonItem>
									<IonLabel>BMR:&nbsp;</IonLabel>
									<IonText color='primary' style={{ fontWeight: "bold" }}>
										{calculateBmr(weight ?? 0, height ?? 0, age ?? 0, gender ?? Gender.Male)} kcal
									</IonText>
								</IonItem>
								<IonItem>
									<IonLabel>TDEE:&nbsp;</IonLabel>
									<IonText color='primary' style={{ fontWeight: "bold" }}>
										{calculateTdee(weight ?? 0, height ?? 0, age ?? 0, activityLevel ?? ActivityLevel.Sedentary, gender ?? Gender.Male)} kcal
									</IonText>
								</IonItem>
							</IonList>
						</>
					)
				}
			</IonContent>
		</IonPage>
	);
};

export default Settings;
