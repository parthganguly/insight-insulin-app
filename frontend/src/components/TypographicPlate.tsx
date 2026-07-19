import React from "react";
import { getTypographicPlateMonogram } from "../utils/journalPresentation";

type TypographicPlateProps = {
	mealName: string;
	monogram?: string;
	className?: string;
};

const TypographicPlate: React.FC<TypographicPlateProps> = ({ mealName, monogram, className = "" }) => (
	<div className={`typographic-plate ${className}`.trim()} aria-hidden='true'>
		<span className='typographic-plate-monogram'>{monogram ?? getTypographicPlateMonogram(mealName)}</span>
	</div>
);

export default TypographicPlate;
