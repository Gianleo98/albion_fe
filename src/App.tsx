import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { homeOutline, storefrontOutline, flashOutline, swapHorizontalOutline, sparklesOutline, cubeOutline } from 'ionicons/icons';

import HomePage from './pages/HomePage';
import BlackMarketPage from './pages/BlackMarketPage';
import FocusPage from './pages/FocusPage';
import FlipPage from './pages/FlipPage';
import EnchantingPage from './pages/EnchantingPage';
import RefiningPage from './pages/RefiningPage';
import { NativeFlipAlerts } from './components/NativeFlipAlerts';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS required for Ionic apps to work */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import '@ionic/react/css/palettes/dark.system.css';

import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <NativeFlipAlerts />
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/home">
            <HomePage />
          </Route>
          <Route exact path="/blackmarket">
            <BlackMarketPage />
          </Route>
          <Route exact path="/crafting">
            <Redirect to="/blackmarket" />
          </Route>
          <Route exact path="/focus">
            <FocusPage />
          </Route>
          <Route exact path="/flip">
            <FlipPage />
          </Route>
          <Route exact path="/enchanting">
            <EnchantingPage />
          </Route>
          <Route exact path="/refining">
            <RefiningPage />
          </Route>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>

        <IonTabBar slot="bottom">
          <IonTabButton tab="home" href="/home">
            <IonIcon icon={homeOutline} />
            <IonLabel>Home</IonLabel>
          </IonTabButton>
          <IonTabButton tab="blackmarket" href="/blackmarket">
            <IonIcon icon={storefrontOutline} />
            <IonLabel>BM</IonLabel>
          </IonTabButton>
          <IonTabButton tab="focus" href="/focus">
            <IonIcon icon={flashOutline} />
            <IonLabel>Focus</IonLabel>
          </IonTabButton>
          <IonTabButton tab="flip" href="/flip">
            <IonIcon icon={swapHorizontalOutline} />
            <IonLabel>Flip</IonLabel>
          </IonTabButton>
          <IonTabButton tab="enchanting" href="/enchanting">
            <IonIcon icon={sparklesOutline} />
            <IonLabel>Enchanting</IonLabel>
          </IonTabButton>
          <IonTabButton tab="refining" href="/refining">
            <IonIcon icon={cubeOutline} />
            <IonLabel>Refining</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;
