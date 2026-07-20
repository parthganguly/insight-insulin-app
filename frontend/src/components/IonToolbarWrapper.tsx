import { IonToolbar } from "@ionic/react";
import React from "react";

/**
 * Thin styling wrapper only. Safe-area padding must not be applied here:
 * Ionic's built-in `ion-header ion-toolbar:first-of-type` rule consumes
 * --ion-safe-area-top, which maps to the centralized --app-safe-area-* source
 * resolved before first render (issue #107). No component may initialize an
 * inset to zero and correct it later.
 */
function IonToolbarWrapper({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<typeof IonToolbar>) {
	const className = ["app-toolbar", props.className].filter(Boolean).join(" ");

	return (
		<IonToolbar {...props} className={className}>
			{children}
		</IonToolbar>
	);
}

export default IonToolbarWrapper;
