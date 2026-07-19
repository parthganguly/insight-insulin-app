import { IonToolbar } from "@ionic/react";
import { SafeArea } from "capacitor-plugin-safe-area";

import React, { useEffect, useState } from "react";

function IonToolbarWrapper({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<typeof IonToolbar>) {
	const [top, setTop] = useState(0);
	useEffect(() => {
		SafeArea.getSafeAreaInsets().then(({ insets }) => {
			setTop(insets.top);
		});
	}, []);
	const className = ["app-toolbar", props.className].filter(Boolean).join(" ");
	const style = { ...props.style, paddingTop: top };

	return (
		<IonToolbar {...props} style={style} className={className}>
			{children}
		</IonToolbar>
	);
}

export default IonToolbarWrapper;
