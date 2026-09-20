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
import MealEstimate from "./pages/meal/MealEstimate";
import MealFlowGuard from "./components/MealFlowGuard";
import PendingSaveBanner from "./components/PendingSaveBanner";
import { useEffect, useLayoutEffect, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useSettingsStore } from "./stores/settingsStore";
import { usePendingSaveStore } from "./stores/pendingSaveStore";
import { applyRootAppearance, INK_APPEARANCE_CLASS, INK_MEDIA_QUERY, PAPER_APPEARANCE_CLASS, resolveAppearance } from "./utils/appearance";

setupIonicReact();

const NavigationBar = registerPlugin<{
	setAppearance(options: { lightNavigationBars: boolean }): Promise<void>;
}>("NavigationBar");

type JourneyTab = "dashboard" | "logMeal" | "history";

const getJourneyTabForPath = (pathname: string): JourneyTab => {
	if (pathname === "/log-meal" || pathname === "/meals/previous" || pathname === "/meals/estimate" || pathname === "/meals/new" || pathname.startsWith("/meals/new/")) {
		return "logMeal";
	}
	if (pathname === "/meals" || pathname.startsWith("/meals/saved/")) return "history";
	return "dashboard";
};

const AppTabs = () => {
	const { pathname } = useLocation();
	const selectedTab = getJourneyTabForPath(pathname);

	return (
		<>
			<MealFlowGuard />
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
						<Route exact path='/meals/estimate'>
							<MealEstimate />
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
					<IonTabBar slot='bottom'>
						<IonTabButton tab='dashboard' href='/dashboard' data-navigation-href='/dashboard' aria-label='Home' aria-selected={selectedTab === "dashboard"} selected={selectedTab === "dashboard"} className={selectedTab === "dashboard" ? "journey-tab-selected" : undefined}>
							<IonIcon aria-hidden='true' icon={bookOutline} />
							<IonLabel>Home</IonLabel>
						</IonTabButton>
						<IonTabButton tab='logMeal' href='/log-meal' data-navigation-href='/log-meal' aria-label='Log Meal' aria-selected={selectedTab === "logMeal"} selected={selectedTab === "logMeal"} className={selectedTab === "logMeal" ? "journey-tab-selected" : undefined}>
							<IonIcon aria-hidden='true' icon={addOutline} />
							<IonLabel>Log Meal</IonLabel>
						</IonTabButton>
						<IonTabButton tab='history' href='/meals' data-navigation-href='/meals' aria-label='History' aria-selected={selectedTab === "history"} selected={selectedTab === "history"} className={selectedTab === "history" ? "journey-tab-selected" : undefined}>
							<IonIcon aria-hidden='true' icon={timeOutline} />
							<IonLabel>History</IonLabel>
						</IonTabButton>
					</IonTabBar>
				</IonTabs>
			<PendingSaveBanner />
		</>
	);
};

const App: React.FC<{ onShellReady?: () => void }> = ({ onShellReady }) => {
	const darkModeSetting = useSettingsStore((state) => state.darkMode);
	const [prefersInk, setPrefersInk] = useState(() => (typeof window.matchMedia === "function" ? window.matchMedia(INK_MEDIA_QUERY).matches : false));
	const appearance = resolveAppearance({ darkMode: darkModeSetting, prefersInk });

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
		window.__APP_APPEARANCE = appearance;
		// The index.html bootstrap paints an inline Porcelain background before
		// bundled CSS exists; once the appearance class is authoritative the
		// stylesheet owns the surface, so later appearance changes apply.
		root.style.removeProperty("background-color");
		return () => {
			root.classList.remove(PAPER_APPEARANCE_CLASS, INK_APPEARANCE_CLASS);
			root.style.removeProperty("color-scheme");
		};
	}, [appearance]);

	useEffect(() => {
		if (!Capacitor.isNativePlatform()) return;
		// Ratified law: paper → dark status icons, ink → light status icons.
		StatusBar.setStyle({ style: appearance === "ink" ? Style.Dark : Style.Light }).catch(() => {
			// System-bar styling is cosmetic; a plugin failure must not break boot.
		});
		if (Capacitor.getPlatform() === "android") {
			NavigationBar.setAppearance({ lightNavigationBars: appearance === "paper" }).catch(() => {
				// A navigation-bar plugin failure must not break the app.
			});
		}
	}, [appearance]);

	// One idempotent journal hydration before any save or delete affordance
	// becomes available. Entries are validated independently of the current
	// draft, an inFlight entry returns as ambiguous, and nothing is dispatched.
	//
	// R01: this must NOT depend on the presentation flag. A device can hold an
	// unresolved reference save made by an enabled build and then be rebuilt
	// with the flag off; the record still has to be read so deletion can be
	// guarded. Reading is local only — no startup POST and no catalog fetch —
	// and a build that never wrote a record simply finds none.
	useEffect(() => {
		usePendingSaveStore.getState().hydrateReferenceJournal();
	}, []);

	useEffect(() => {
		onShellReady?.();
	}, [onShellReady]);

	return (
		<IonApp className={appearance === "ink" ? INK_APPEARANCE_CLASS : PAPER_APPEARANCE_CLASS} data-appearance={appearance}>
			<IonReactRouter>
				<AppTabs />
			</IonReactRouter>
		</IonApp>
	);
};

export default App;
