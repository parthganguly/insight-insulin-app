import React from "react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import { getMealAcuteScore } from "../utils";
import { Meal } from "../types/Meal";
import { getAcuteRingValue, getAcuteScoreAriaLabel, getAcuteScoreText } from "../utils/acuteScoreDisplay";

function AcuteScoreProgressbar({ style, meal, strokeWidth = 8 }: { style?: React.CSSProperties; meal: Meal; strokeWidth?: number }) {
	const acuteScore = getMealAcuteScore(meal);
	const isUnknown = acuteScore === undefined;
	// Same low/medium/high thresholds as before; only the presentation tones are softened.
	const accentColor = isUnknown ? "#9aa5ad" : acuteScore < 35 ? "#34a06f" : acuteScore < 60 ? "#d9a62e" : "#d96a52";

	return (
		<div role='img' aria-label={getAcuteScoreAriaLabel(acuteScore)} style={{ ...style, display: "flex", justifyContent: "center", alignItems: "center" }}>
			<CircularProgressbar
				value={getAcuteRingValue(acuteScore)}
				maxValue={100}
				text={getAcuteScoreText(acuteScore)}
				strokeWidth={strokeWidth}
				styles={buildStyles({
					textSize: "2.1rem",
					pathColor: accentColor,
					textColor: accentColor,
					trailColor: "#e8edf3",
					strokeLinecap: "round",
				})}
			/>
		</div>
	);
}

export default AcuteScoreProgressbar;
