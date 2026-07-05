import { IonIcon } from "@ionic/react";

export function NutrimentComponent({ nutrimentName, nutrimentValue, nutrimentIcon, nutrimentIconColor }: { nutrimentName: string; nutrimentValue: number | string; nutrimentIcon: string; nutrimentIconColor: string }) {
	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				background: "#f1f4f8",
				borderRadius: "999px",
				padding: "4px 9px",
				marginRight: "4px",
				marginBottom: "4px",
				fontSize: "12px",
				gap: "5px",
			}}>
			<IonIcon icon={nutrimentIcon} style={{ fontSize: "11px", color: nutrimentIconColor }} />
			<span style={{ fontSize: "11px", fontWeight: 500, color: "#5c6b7a" }}>{nutrimentName}</span>
			<span style={{ fontSize: "11px", fontWeight: 700, color: "#1c2b39" }}>{nutrimentValue}</span>
		</div>
	);
}
