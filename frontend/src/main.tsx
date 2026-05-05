import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { defineCustomElements } from "@ionic/pwa-elements/loader";
import { SafeArea } from "capacitor-plugin-safe-area";

const container = document.getElementById("root");
const root = createRoot(container!);

// Call the element loader before the render call
defineCustomElements(window);

(async () => {
	const { insets } = await SafeArea.getSafeAreaInsets();
	document.body.classList.add("inset-padding-top");
	document.body.style.setProperty("paddingTop", `${50}px`);
})();

root.render(
	// <React.StrictMode>
	<App />
	// </React.StrictMode>
);
