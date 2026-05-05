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
	return (
		<IonToolbar style={{ paddingTop: top, color: "white" }} className='ion-text-center' color='primary' {...props}>
			{children}
		</IonToolbar>
	);
}

export default IonToolbarWrapper;
