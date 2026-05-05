import { Redirect, Route } from "react-router-dom";
import { IonApp, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { addCircle, cog, home } from "ionicons/icons";
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
import Settings from "./pages/settings/Settings";
import AddMeal from "./pages/meal/Meals";
import AiMealAdd from "./pages/meal/AiMealAdd";
import PreviewMeal from "./pages/meal/PreviewMeal";
import { useEffect, useState } from "react";
import { SafeArea } from "capacitor-plugin-safe-area";

setupIonicReact();

const App: React.FC = () => {
	const [bottom, setBottom] = useState(0);
	useEffect(() => {
		SafeArea.getSafeAreaInsets().then(({ insets }) => {
			setBottom(insets.bottom);
		});
	}, []);
	return (
		<IonApp>
			<IonReactRouter>
				<IonTabs>
					<IonRouterOutlet>
						<Route exact path='/dashboard'>
							<Dashboard />
						</Route>

						<Route exact path='/meals'>
							<AddMeal />
						</Route>

						<Route exact path='/meals/new'>
							<PreviewMeal />
						</Route>
						<Route exact path='/meals/new/ai'>
							<AiMealAdd />
						</Route>

						<Route exact path='/settings'>
							<Settings />
						</Route>

						<Route exact path='/'>
							<Redirect to='/dashboard' />
						</Route>
					</IonRouterOutlet>
					<IonTabBar style={{ paddingBottom: `${bottom}px` }} slot='bottom'>
						<IonTabButton tab='dashboard' href='/dashboard'>
							<IonIcon size='large' aria-hidden='true' icon={home} />
							<IonLabel style={{ fontSize: "10px" }}>Dashboard</IonLabel>
						</IonTabButton>
						<IonTabButton tab='addMeal' href='/meals'>
							<IonIcon style={{ fontSize: "50px" }} aria-hidden='true' icon={addCircle} />
							{/* <IonLabel style={{ fontSize: "10px" }}>Add Meal</IonLabel> */}
						</IonTabButton>
						<IonTabButton tab='settings' href='/settings'>
							<IonIcon size='large' aria-hidden='true' icon={cog} />
							<IonLabel style={{ fontSize: "10px" }}>Settings</IonLabel>
						</IonTabButton>
					</IonTabBar>
				</IonTabs>
			</IonReactRouter>
		</IonApp>
	);
};

export default App;
