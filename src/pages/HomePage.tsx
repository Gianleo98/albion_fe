import { useCallback, useRef, useState } from 'react';
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
  useIonViewWillEnter,
  useIonToast,
} from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import { getMaterialPrices, getRateLimitStatus, triggerPriceUpdate } from '../services/api';
import type { MaterialPriceResponse, RateLimitStatus } from '../types';
import './HomePage.css';

const MATERIAL_ORDER = ['CLOTH', 'LEATHER', 'PLANKS', 'METALBAR'];

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

const useDragScroll = () => {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    isDragging.current = true;
    startX.current = e.clientX;
    scrollLeft.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    e.currentTarget.scrollLeft = scrollLeft.current - dx;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    e.currentTarget.style.cursor = '';
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
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

  const drag = useDragScroll();
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
            <div className="state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="state-container">
              <p>{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && prices.length === 0 && (
            <div className="state-container">
              <p>Nessun dato disponibile.</p>
              <p>Forza un aggiornamento per iniziare.</p>
            </div>
          )}

          {/* Material strips */}
          {!loading && !error && prices.length > 0 && (
            <div className="material-strips">
              {MATERIAL_ORDER.map((type) => {
                const items = grouped[type];
                if (!items || items.length === 0) return null;
                return (
                  <div key={type} className="material-strip">
                    <h3 className="strip-title">{MATERIAL_LABELS[type] ?? type}</h3>
                    <div
                      className="strip-scroll"
                      onPointerDown={drag.onPointerDown}
                      onPointerMove={drag.onPointerMove}
                      onPointerUp={drag.onPointerUp}
                      onPointerCancel={drag.onPointerUp}
                    >
                      {items.map((item) => (
                        <div key={item.itemId} className="material-card">
                          {item.iconUrl && (
                            <img
                              src={item.iconUrl}
                              alt={item.itemId}
                              className="material-icon"
                              loading="lazy"
                            />
                          )}
                          <span className="card-tier">
                            {formatTier(item.tier, item.enchantment)}
                          </span>
                          <div className="card-prices">
                            <span className="card-sell">{formatPrice(item.sellPriceMin)}</span>
                            <span className="card-buy">{formatPrice(item.buyPriceMax)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
