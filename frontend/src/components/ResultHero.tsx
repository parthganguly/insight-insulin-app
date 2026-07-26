import { IonBackButton } from "@ionic/react";

import TypographicPlate from "./TypographicPlate";

// Annotated Journal J5 result hero. Presentation only: it renders whatever
// photo the saved meal already carries and never fetches, caches, persists, or
// re-requests one. Photo-less meals get the constitution's typographic plate
// rather than a broken-image glyph, exactly as the confirm hero does.
type ResultHeroProps = {
	image: string | null;
	mealName: string;
};

const ResultHero = ({ image, mealName }: ResultHeroProps) => (
	<header className={`result-hero ${image ? "result-hero-photo" : "result-hero-plate"}`}>
		{image
			? <img src={image} alt='Saved meal photo' className='result-hero-image' />
			: <TypographicPlate mealName={mealName} className='result-typographic-plate' />}
		<div className='result-hero-scrim' aria-hidden='true' />
		<IonBackButton className='result-hero-back' defaultHref='/dashboard' text='' aria-label='Back' />
	</header>
);

export default ResultHero;
