import React from "react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import { getMealAcuteScore } from "../utils";
import { Meal } from "../types/Meal";

function AcuteScoreProgressbar({ style, meal }: { style?: React.CSSProperties; meal: Meal }) {
	const acuteScore = getMealAcuteScore(meal);
	const isUnknown = acuteScore === undefined;
	const accentColor = isUnknown ? "#95a5a6" : acuteScore < 35 ? "#2ecc71" : acuteScore < 60 ? "#f1c40f" : "#e74c3c";

	return (
		<div style={{ ...style, display: "flex", justifyContent: "center", alignItems: "center" }}>
			<CircularProgressbar
				value={isUnknown ? 0 : acuteScore}
				maxValue={100}
				text={isUnknown ? "--" : `${acuteScore}`}
				styles={buildStyles({
					textSize: "2.2rem",
					pathColor: accentColor,
					textColor: accentColor,
					trailColor: "#dfe6f0",
				})}
			/>
		</div>
	);
}

export default AcuteScoreProgressbar;
