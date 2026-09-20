import { IonContent, IonHeader, IonPage, IonRadio, IonRadioGroup, IonTitle } from "@ionic/react";
import React from "react";
import IonToolbarWrapper from "../../components/IonToolbarWrapper";
import { useSettingsStore } from "../../stores/settingsStore";
import {
	AI_EXTRACTION_PRIVACY_DISCLOSURE,
	APP_DISCLAIMER,
	SETTINGS_DELETE_DISCLOSURE,
	SETTINGS_IMAGE_DISCLOSURE,
	SETTINGS_PROTOTYPE_STATUS,
	SETTINGS_SAVED_MEALS_DISCLOSURE,
	REFERENCE_DISCARD_MAY_HAVE_SAVED,
	REFERENCE_PREVIEW_STATUS,
	REFERENCE_RETRY_RETENTION_DISCLOSURE,
	REFERENCE_RETRY_RETENTION_LIMITS,
} from "../../utils/safetyCopy";
import { REFERENCE_PREVIEW_MODE } from "../../utils/experimentalPresentationGate";

const Settings: React.FC = () => {
	const darkMode = useSettingsStore((state) => state.darkMode);
	const toggleDarkMode = useSettingsStore((state) => state.toggleDarkMode);
	const appearance = darkMode === null ? "system" : darkMode ? "ink" : "paper";

	return (
		<IonPage>
			<IonHeader>
				<IonToolbarWrapper className='ion-text-center'>
					<IonTitle role='heading' aria-level={1}>Settings</IonTitle>
				</IonToolbarWrapper>
			</IonHeader>

			<IonContent className='settings-content'>
				<div className='settings-page'>
					<section className='settings-section' aria-labelledby='settings-appearance-heading'>
						<h2 id='settings-appearance-heading'>Appearance</h2>
						<IonRadioGroup
							className='settings-appearance-group'
							name='appearance'
							value={appearance}
							aria-label='Appearance'
							onIonChange={(event) => toggleDarkMode(event.detail.value === "system" ? null : event.detail.value === "ink")}
						>
							<IonRadio className='settings-appearance-row' value='system' labelPlacement='end' alignment='start' justify='start'>
								<span className='settings-radio-copy'><strong>System</strong><span>Match your device.</span></span>
							</IonRadio>
							<IonRadio className='settings-appearance-row' value='paper' labelPlacement='end' alignment='start' justify='start'>
								<span className='settings-radio-copy'><strong>Paper</strong><span>Light.</span></span>
							</IonRadio>
							<IonRadio className='settings-appearance-row' value='ink' labelPlacement='end' alignment='start' justify='start'>
								<span className='settings-radio-copy'><strong>Ink</strong><span>Dark.</span></span>
							</IonRadio>
						</IonRadioGroup>
					</section>

					<section className='settings-section settings-copy-section' aria-labelledby='settings-about-heading'>
						<h2 id='settings-about-heading'>About INSIGHT</h2>
						<p className='settings-status'>{SETTINGS_PROTOTYPE_STATUS}</p>
						<p>{APP_DISCLAIMER}</p>
					</section>

					<section className='settings-section settings-copy-section' aria-labelledby='settings-privacy-heading'>
						<h2 id='settings-privacy-heading'>Data &amp; privacy</h2>
						<p>{SETTINGS_SAVED_MEALS_DISCLOSURE}</p>
						<p>{SETTINGS_IMAGE_DISCLOSURE}</p>
						<p>{AI_EXTRACTION_PRIVACY_DISCLOSURE}</p>
						<p>{SETTINGS_DELETE_DISCLOSURE}</p>
						{REFERENCE_PREVIEW_MODE && (
							<>
								<h3>Unfinished saves kept on this device</h3>
								<p>{REFERENCE_RETRY_RETENTION_DISCLOSURE}</p>
								<p>{REFERENCE_RETRY_RETENTION_LIMITS}</p>
								<p>{REFERENCE_DISCARD_MAY_HAVE_SAVED}</p>
								<p className='settings-status'>{REFERENCE_PREVIEW_STATUS}</p>
							</>
						)}
					</section>
				</div>
			</IonContent>
		</IonPage>
	);
};

export default Settings;
