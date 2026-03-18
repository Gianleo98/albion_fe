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
import { homeOutline, hammerOutline, flashOutline, swapHorizontalOutline } from 'ionicons/icons';

import HomePage from './pages/HomePage';
import CraftingPage from './pages/CraftingPage';
import FocusPage from './pages/FocusPage';
import FlipPage from './pages/FlipPage';

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
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/home">
            <HomePage />
          </Route>
          <Route exact path="/crafting">
            <CraftingPage />
          </Route>
          <Route exact path="/focus">
            <FocusPage />
          </Route>
          <Route exact path="/flip">
            <FlipPage />
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
          <IonTabButton tab="crafting" href="/crafting">
            <IonIcon icon={hammerOutline} />
            <IonLabel>Crafting</IonLabel>
          </IonTabButton>
          <IonTabButton tab="focus" href="/focus">
            <IonIcon icon={flashOutline} />
            <IonLabel>Focus</IonLabel>
          </IonTabButton>
          <IonTabButton tab="flip" href="/flip">
            <IonIcon icon={swapHorizontalOutline} />
            <IonLabel>Flip</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;
