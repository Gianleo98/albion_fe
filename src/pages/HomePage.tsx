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

const MATERIAL_ORDER = ['CLOTH', 'LEATHER', 'PLANKS', 'METALBAR', 'ARTEFACT', 'CREST'];

const MATERIAL_LABELS: Record<string, string> = {
  CLOTH: 'Cloth',
  LEATHER: 'Leather',
  PLANKS: 'Planks',
  METALBAR: 'Metal Bar',
  ARTEFACT: 'Artefact',
  CREST: 'Crest',
};

const formatPrice = (price: number) =>
  price > 0 ? price.toLocaleString('it-IT') : '—';

const sellPriceClass = (sell: number, avg7d: number): string => {
  if (sell <= 0 || avg7d <= 0) return 'home-tile-sell--neutral';
  if (sell < avg7d) return 'home-tile-sell--below';
  if (sell > avg7d) return 'home-tile-sell--above';
  return 'home-tile-sell--neutral';
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
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Accesso negato: token API non valido (backend e app devono usare lo stesso segreto).');
      } else {
        setError('Impossibile connettersi al backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    void fetchData();
  });

  const handleRefresh = async (event: CustomEvent) => {
    await fetchData();
    event.detail.complete();
  };

  const drag = useDragScroll();
  const homePrices = prices.filter((p) => p.materialType !== 'HEART');
  const grouped = groupByMaterial(homePrices);
  const lastUpdate = homePrices.length > 0 ? homePrices[0].updatedAt : null;

  return (
    <IonPage>
      <AppHeader onMaterialsUpdated={fetchData} lastUpdate={lastUpdate} />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="home-container">
          <header className="home-hero">
            <img
              src="/assets/logo_homepage.png"
              alt=""
              className="home-hero-logo"
            />
            <h1 className="home-hero-title">Lymhurst</h1>
            <p className="home-hero-tag">Prezzi materiali · media 7 giorni</p>
            <p className="home-hero-foot">Albus · Janraion</p>
          </header>

          {/* Loading */}
          {loading && (
            <div className="home-state">
              <IonSpinner name="crescent" />
            </div>
          )}

          {error && !loading && (
            <div className="home-state">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && homePrices.length === 0 && (
            <div className="home-state">
              <p>Nessun dato al momento.</p>
              <p>Aggiorna dall’icona impostazioni in alto.</p>
            </div>
          )}

          {/* Material strips */}
          {!loading && !error && homePrices.length > 0 && (
            <div className="home-strips">
              {MATERIAL_ORDER.map((type) => {
                const allItems = grouped[type];
                if (!allItems || allItems.length === 0) return null;
                const isFiltered = !!filterBelow[type];
                const items = isFiltered
                  ? allItems.filter((i) => i.sellPriceMin > 0 && i.avgPrice7d > 0 && i.sellPriceMin < i.avgPrice7d)
                  : allItems;
                return (
                  <section key={type} className="home-section">
                    <div className="home-section-head">
                      <span className="home-section-name">{MATERIAL_LABELS[type] ?? type}</span>
                      <button
                        type="button"
                        className={`home-filter ${isFiltered ? 'home-filter--on' : ''}`}
                        onClick={() => setFilterBelow((prev) => ({ ...prev, [type]: !prev[type] }))}
                        title="Solo sotto media 7g"
                        aria-label="Filtra sotto media"
                      >
                        <IonIcon icon={isFiltered ? funnel : funnelOutline} />
                      </button>
                    </div>
                    <div
                      className="home-scroll"
                      onPointerDown={drag.onPointerDown}
                      onPointerMove={drag.onPointerMove}
                      onPointerUp={drag.onPointerUp}
                      onPointerCancel={drag.onPointerUp}
                    >
                      {items.length === 0 ? (
                        <span className="home-empty-hint">Nessun item sotto la media</span>
                      ) : items.map((item) => (
                        <div key={item.itemId} className="home-tile">
                          {item.iconUrl && (
                            <img
                              src={item.iconUrl}
                              alt=""
                              className="home-tile-icon"
                              loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <span className={`home-tile-sell ${sellPriceClass(item.sellPriceMin, item.avgPrice7d)}`}>
                            {formatPrice(item.sellPriceMin)}
                          </span>
                          <span className="home-tile-7g">
                            <IonIcon icon={timeOutline} aria-hidden />
                            {item.avgPrice7d > 0 ? formatPrice(item.avgPrice7d) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
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
