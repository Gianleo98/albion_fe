import { useCallback, useRef, useState } from 'react';
import {
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  useIonViewWillEnter,
} from '@ionic/react';
import { funnelOutline, funnel, timeOutline } from 'ionicons/icons';
import { getMaterialPrices } from '../services/api';
import type { MaterialPriceResponse } from '../types';
import AppHeader from '../components/AppHeader';
import './HomePage.css';

const MATERIAL_ORDER = ['CLOTH', 'LEATHER', 'PLANKS', 'METALBAR', 'ARTEFACT'];

const MATERIAL_LABELS: Record<string, string> = {
  CLOTH: 'Cloth',
  LEATHER: 'Leather',
  PLANKS: 'Planks',
  METALBAR: 'Metal Bar',
  ARTEFACT: 'Artefact',
};

const formatPrice = (price: number) =>
  price > 0 ? price.toLocaleString('it-IT') : '—';

const getPriceColor = (sell: number, avg7d: number): string => {
  if (sell <= 0 || avg7d <= 0) return 'var(--ion-color-medium)';
  if (sell < avg7d) return '#34d399';
  if (sell > avg7d) return '#f87171';
  return 'var(--ion-color-medium)';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBelow, setFilterBelow] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const pricesData = await getMaterialPrices();
      setPrices(pricesData);
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

  const drag = useDragScroll();
  const grouped = groupByMaterial(prices);
  const lastUpdate = prices.length > 0 ? prices[0].updatedAt : null;

  return (
    <IonPage>
      <AppHeader onMaterialsUpdated={fetchData} lastUpdate={lastUpdate} />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="home-container">
          {/* Branding */}
          <div className="logo-section">
            <img
              src="/assets/logo_homepage.png"
              alt="Albion Online"
              className="albion-logo"
            />
            <p className="logo-subtitle">Lymhurst Market Tracker</p>
            <p className="logo-credit">Developed by Janraion</p>
          </div>

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
              <p>Forza un aggiornamento dalle impostazioni.</p>
            </div>
          )}

          {/* Material strips */}
          {!loading && !error && prices.length > 0 && (
            <div className="material-strips">
              {MATERIAL_ORDER.map((type) => {
                const allItems = grouped[type];
                if (!allItems || allItems.length === 0) return null;
                const isFiltered = !!filterBelow[type];
                const items = isFiltered
                  ? allItems.filter((i) => i.sellPriceMin > 0 && i.avgPrice7d > 0 && i.sellPriceMin < i.avgPrice7d)
                  : allItems;
                return (
                  <div key={type} className="material-strip">
                    <div className="strip-header">
                      <span className="strip-title">{MATERIAL_LABELS[type] ?? type}</span>
                      <button
                        className={`strip-filter-btn ${isFiltered ? 'active' : ''}`}
                        onClick={() => setFilterBelow((prev) => ({ ...prev, [type]: !prev[type] }))}
                        title="Mostra solo sotto media 7g"
                      >
                        <IonIcon icon={isFiltered ? funnel : funnelOutline} />
                      </button>
                    </div>
                    <div
                      className="strip-scroll"
                      onPointerDown={drag.onPointerDown}
                      onPointerMove={drag.onPointerMove}
                      onPointerUp={drag.onPointerUp}
                      onPointerCancel={drag.onPointerUp}
                    >
                      {items.length === 0 ? (
                        <span className="strip-empty">Nessun item sotto media</span>
                      ) : items.map((item) => (
                        <div key={item.itemId} className="material-card">
                          {item.iconUrl && (
                            <img
                              src={item.iconUrl}
                              alt={item.itemId}
                              className="material-icon"
                              loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <div className="card-prices">
                            <span
                              className="card-sell"
                              style={{ color: getPriceColor(item.sellPriceMin, item.avgPrice7d) }}
                            >
                              {formatPrice(item.sellPriceMin)}
                            </span>
                            <span className="card-avg">
                              <IonIcon icon={timeOutline} className="card-avg-icon" />
                              {item.avgPrice7d > 0 ? formatPrice(item.avgPrice7d) : '—'}
                            </span>
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
