import { Redirect, Route, useLocation } from "react-router-dom";
import { IonApp, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { addOutline, bookOutline, timeOutline } from "ionicons/icons";
import Dashboard from "./pages/dashboard/Dashboard";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
/* Theme variables */
import "./theme/variables.css";
import "./theme/app.css";
import Settings from "./pages/settings/Settings";
import AddMeal from "./pages/meal/Meals";
import AiMealAdd from "./pages/meal/AiMealAdd";
import PreviewMeal from "./pages/meal/PreviewMeal";
import SavedMealDetail from "./pages/meal/SavedMealDetail";
import LogMealChooser from "./pages/meal/LogMealChooser";
import PreviousMealPicker from "./pages/meal/PreviousMealPicker";
import { useEffect, useLayoutEffect, useState } from "react";
import { SafeArea } from "capacitor-plugin-safe-area";
import { useSettingsStore } from "./stores/settingsStore";
import { applyRootAppearance, INK_APPEARANCE_CLASS, INK_MEDIA_QUERY, PAPER_APPEARANCE_CLASS, resolveAppearance } from "./utils/appearance";

setupIonicReact();

type JourneyTab = "dashboard" | "logMeal" | "history";

const getJourneyTabForPath = (pathname: string): JourneyTab => {
	if (pathname === "/log-meal" || pathname === "/meals/previous" || pathname === "/meals/new" || pathname.startsWith("/meals/new/")) {
		return "logMeal";
	}
	if (pathname === "/meals" || pathname.startsWith("/meals/saved/")) return "history";
	return "dashboard";
};

const AppTabs = ({ bottom }: { bottom: number }) => {
	const { pathname } = useLocation();
	const selectedTab = getJourneyTabForPath(pathname);

	return (
		<IonTabs>
					<IonRouterOutlet>
						<Route exact path='/dashboard'>
							<Dashboard />
						</Route>

						<Route exact path='/meals'>
							<AddMeal />
						</Route>
						<Route exact path='/log-meal'>
							<LogMealChooser />
						</Route>
						<Route exact path='/meals/previous'>
							<PreviousMealPicker />
						</Route>

						<Route exact path='/meals/new'>
							<PreviewMeal />
						</Route>
						<Route exact path='/meals/new/ai'>
							<AiMealAdd />
						</Route>
						<Route exact path='/meals/saved/:mealId'>
							<SavedMealDetail />
						</Route>

						<Route exact path='/settings'>
							<Settings />
						</Route>

						<Route exact path='/'>
							<Redirect to='/dashboard' />
						</Route>
					</IonRouterOutlet>
					<IonTabBar style={{ paddingBottom: `max(${bottom}px, env(safe-area-inset-bottom))` }} slot='bottom'>
						<IonTabButton tab='dashboard' href='/dashboard' aria-label='Home' aria-selected={selectedTab === "dashboard"} selected={selectedTab === "dashboard"} className={selectedTab === "dashboard" ? "journey-tab-selected" : undefined}>
							<IonIcon aria-hidden='true' icon={bookOutline} />
							<IonLabel>Home</IonLabel>
						</IonTabButton>
						<IonTabButton tab='logMeal' href='/log-meal' aria-label='Log Meal' aria-selected={selectedTab === "logMeal"} selected={selectedTab === "logMeal"} className={selectedTab === "logMeal" ? "journey-tab-selected" : undefined}>
							<IonIcon aria-hidden='true' icon={addOutline} />
							<IonLabel>Log Meal</IonLabel>
						</IonTabButton>
						<IonTabButton tab='history' href='/meals' aria-label='History' aria-selected={selectedTab === "history"} selected={selectedTab === "history"} className={selectedTab === "history" ? "journey-tab-selected" : undefined}>
							<IonIcon aria-hidden='true' icon={timeOutline} />
							<IonLabel>History</IonLabel>
						</IonTabButton>
					</IonTabBar>
				</IonTabs>
	);
};

const App: React.FC = () => {
	const [bottom, setBottom] = useState(0);
	const darkModeSetting = useSettingsStore((state) => state.darkMode);
	const [prefersInk, setPrefersInk] = useState(() => (typeof window.matchMedia === "function" ? window.matchMedia(INK_MEDIA_QUERY).matches : false));
	const appearance = resolveAppearance({ darkMode: darkModeSetting, prefersInk });

	useEffect(() => {
		SafeArea.getSafeAreaInsets().then(({ insets }) => {
			setBottom(insets.bottom);
		});
	}, []);

	useEffect(() => {
		if (typeof window.matchMedia !== "function") return;

		const mediaQuery = window.matchMedia(INK_MEDIA_QUERY);
		const updateSystemAppearance = (event: MediaQueryListEvent) => setPrefersInk(event.matches);
		setPrefersInk(mediaQuery.matches);
		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", updateSystemAppearance);
			return () => mediaQuery.removeEventListener("change", updateSystemAppearance);
		}
		mediaQuery.addListener(updateSystemAppearance);
		return () => mediaQuery.removeListener(updateSystemAppearance);
	}, []);

	useLayoutEffect(() => {
		const root = document.documentElement;
		applyRootAppearance(root, appearance);
		return () => {
			root.classList.remove(PAPER_APPEARANCE_CLASS, INK_APPEARANCE_CLASS);
			root.style.removeProperty("color-scheme");
		};
	}, [appearance]);

	return (
		<IonApp className={appearance === "ink" ? INK_APPEARANCE_CLASS : PAPER_APPEARANCE_CLASS} data-appearance={appearance}>
			<IonReactRouter>
				<AppTabs bottom={bottom} />
			</IonReactRouter>
		</IonApp>
	);
};

export default App;
