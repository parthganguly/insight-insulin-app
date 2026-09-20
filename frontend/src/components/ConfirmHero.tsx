import { IonBackButton, IonButton, IonIcon } from "@ionic/react";
import { camera } from "ionicons/icons";

import TypographicPlate from "./TypographicPlate";

type ConfirmHeroProps = {
	image: string | null;
	mealName: string;
	disabled: boolean;
	/** Omitted when this flow has no photo path; the control is then not rendered. */
	onAddPhoto?: () => void;
};

const ConfirmHero = ({ image, mealName, disabled, onAddPhoto }: ConfirmHeroProps) => (
	<header className={`confirm-hero ${image ? "confirm-hero-photo" : "confirm-hero-plate"}`}>
		{image
			? <img src={image} alt='Captured food' className='confirm-hero-image' />
			: <TypographicPlate mealName={mealName} className='confirm-typographic-plate' />}
		<div className='confirm-hero-scrim' aria-hidden='true' />
		<IonBackButton
			className='confirm-hero-back'
			defaultHref='/log-meal'
			text=''
			aria-label='Back'
			disabled={disabled}
		/>
		{/* R07: a visible control that does nothing is worse than no control,
		    so a flow without a photo path renders none. */}
		{!image && onAddPhoto && (
			<IonButton className='confirm-add-photo' fill='clear' onClick={onAddPhoto} disabled={disabled}>
				<IonIcon icon={camera} slot='start' aria-hidden='true' />
				Add a photo
			</IonButton>
		)}
	</header>
);

export default ConfirmHero;
