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
  IonProgressBar,
  IonButton,
  IonIcon,
  IonAlert,
  IonItemDivider,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  useIonViewWillEnter,
  useIonToast,
} from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import { getMaterialPrices, getRateLimitStatus, triggerPriceUpdate } from '../services/api';
import type { MaterialPriceResponse, RateLimitStatus } from '../types';
import './HomePage.css';

const MATERIAL_LABELS: Record<string, string> = {
  CLOTH: 'Cloth',
  LEATHER: 'Leather',
  PLANKS: 'Planks',
  METALBAR: 'Metal Bar',
};

const formatTier = (tier: number, enchantment: number) =>
  enchantment > 0 ? `T${tier}.${enchantment}` : `T${tier}`;

const formatPrice = (price: number) =>
  price > 0 ? price.toLocaleString('it-IT') : '—';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const groupByMaterial = (prices: MaterialPriceResponse[]) => {
  const groups: Record<string, MaterialPriceResponse[]> = {};
  for (const p of prices) {
    if (!groups[p.materialType]) groups[p.materialType] = [];
    groups[p.materialType].push(p);
  }
  return groups;
};

const HomePage: React.FC = () => {
  const [prices, setPrices] = useState<MaterialPriceResponse[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentToast] = useIonToast();

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [pricesData, rateLimitData] = await Promise.all([
        getMaterialPrices(),
        getRateLimitStatus(),
      ]);
      setPrices(pricesData);
      setRateLimit(rateLimitData);
    } catch {
      setError('Impossibile connettersi al backend.');
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    fetchData();
  });

  const handleRefresh = async (event: CustomEvent) => {
    await fetchData();
    event.detail.complete();
  };

  const handleForceUpdate = async () => {
    setUpdating(true);
    try {
      const result = await triggerPriceUpdate();
      presentToast({
        message: `${result.message} (${result.itemsUpdated} item)`,
        duration: 2500,
        color: 'success',
        position: 'top',
      });
      await fetchData();
    } catch {
      presentToast({
        message: "Errore durante l'aggiornamento dei prezzi.",
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setUpdating(false);
    }
  };

  const grouped = groupByMaterial(prices);
  const lastUpdate = prices.length > 0 ? prices[0].updatedAt : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Albus</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Albus</IonTitle>
          </IonToolbar>
        </IonHeader>

        {updating && <IonProgressBar type="indeterminate" color="primary" />}

        <div className="home-container">
          {/* Branding */}
          <div className="logo-section">
            <img
              src="/assets/logo_homepage.png"
              alt="Albion Online"
              className="albion-logo"
            />
            <h1 className="logo-title">Albus</h1>
            <p className="logo-subtitle">Lymhurst Market Tracker</p>
            <p className="logo-credit">Developed by Janraion</p>
          </div>

          {/* Rate limit + Update */}
          <div className="actions-section">
            {rateLimit && (
              <p className="rate-limit-text">
                API: {rateLimit.callsRemaining}/{rateLimit.maxCalls} chiamate disponibili
              </p>
            )}
            <IonButton
              expand="block"
              fill="outline"
              className="update-button"
              onClick={() => setShowConfirm(true)}
              disabled={updating}
            >
              {updating ? (
                <IonSpinner name="dots" />
              ) : (
                <>
                  <IonIcon icon={refreshOutline} slot="start" />
                  Aggiorna Prezzi
                </>
              )}
            </IonButton>
            {lastUpdate && (
              <p className="last-update-text">
                Ultimo aggiornamento: {formatDate(lastUpdate)}
              </p>
            )}
          </div>

          <IonAlert
            isOpen={showConfirm}
            onDidDismiss={() => setShowConfirm(false)}
            header="Aggiorna Prezzi"
            message="Vuoi forzare l'aggiornamento dei prezzi dal market di Lymhurst?"
            buttons={[
              { text: 'Annulla', role: 'cancel' },
              { text: 'Aggiorna', handler: handleForceUpdate },
            ]}
          />

          {/* Loading */}
          {loading && (
            <div className="loading-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="error-container">
              <p>{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && prices.length === 0 && (
            <div className="empty-container">
              <p>Nessun dato disponibile.</p>
              <p>Forza un aggiornamento per iniziare.</p>
            </div>
          )}

          {/* Price table */}
          {!loading && !error && prices.length > 0 && (
            <IonList className="price-list">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <IonItemDivider className="material-divider">
                    <IonLabel>{MATERIAL_LABELS[type] ?? type}</IonLabel>
                  </IonItemDivider>
                  {items.map((item) => (
                    <IonItem key={item.itemId} className="price-item">
                      <IonLabel>
                        <span className="tier-label">{formatTier(item.tier, item.enchantment)}</span>
                      </IonLabel>
                      <IonNote slot="end" className="price-values">
                        <span className="sell-price">
                          {formatPrice(item.sellPriceMin)}
                          <small> sell</small>
                        </span>
                        <span className="buy-price">
                          {formatPrice(item.buyPriceMax)}
                          <small> buy</small>
                        </span>
                      </IonNote>
                    </IonItem>
                  ))}
                </div>
              ))}
            </IonList>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
