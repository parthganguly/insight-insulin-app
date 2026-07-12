import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { defineCustomElements } from "@ionic/pwa-elements/loader";
import { SafeArea } from "capacitor-plugin-safe-area";

const container = document.getElementById("root");
const root = createRoot(container!);

// Call the element loader before the render call
defineCustomElements(window);

(async () => {
	// Behaviour preserved (issue #93 lint repair): the insets call and the
	// hardcoded 50px padding are unchanged; only the unused destructuring of
	// the result was removed. Wiring real insets in is tracked separately.
	await SafeArea.getSafeAreaInsets();
	document.body.classList.add("inset-padding-top");
	document.body.style.setProperty("paddingTop", `${50}px`);
})();

root.render(
	// <React.StrictMode>
	<App />
	// </React.StrictMode>
);
