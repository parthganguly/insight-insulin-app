import React from "react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import { getMealAcuteScore } from "../utils";
import { Meal } from "../types/Meal";
import { getAcuteRingValue, getAcuteScoreAriaLabel, getAcuteScoreText } from "../utils/acuteScoreDisplay";

function AcuteScoreProgressbar({ style, meal, strokeWidth = 8 }: { style?: React.CSSProperties; meal: Meal; strokeWidth?: number }) {
	const acuteScore = getMealAcuteScore(meal);
	const isUnknown = acuteScore === undefined;
	// Issue #93: the former low/medium/high colour tiers (35/60) had no
	// empirical calibration, so the ring no longer encodes them. One neutral
	// accent for known scores, grey for unknown.
	const accentColor = isUnknown ? "#9aa5ad" : "#2f86c0";

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
