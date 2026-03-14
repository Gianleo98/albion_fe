import { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  useIonViewWillEnter,
} from '@ionic/react';
import { getAppInfo } from '../services/api';
import type { AppInfo } from '../types';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getAppInfo();
      setAppInfo(data);
    } catch {
      setError('Impossibile connettersi al backend.');
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    fetchInfo();
  });

  const handleRefresh = async (event: CustomEvent) => {
    await fetchInfo();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Albion</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Albion</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="home-container">
          <div className="logo-section">
            <h1 className="logo-title">Albion</h1>
            <p className="logo-credit">Developed by Janraion</p>
          </div>

          {loading && (
            <div className="loading-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {error && (
            <div className="error-container">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && appInfo && (
            <div className="info-section">
              <p className="info-text">
                {appInfo.name} v{appInfo.version}
              </p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
