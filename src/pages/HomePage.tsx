import { useCallback, useMemo, useRef, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonText,
  useIonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import { funnelOutline, funnel, timeOutline } from 'ionicons/icons';
import { getMaterialPrices, getEnchantmentMaterialsStrip, getIslandKennelBabiesStrip } from '../services/api';
import {
  DAILY_REMINDER_HOUR,
  DAILY_REMINDER_MINUTE,
  getNotificationPermissionStatus,
  isNativeNotificationsAvailable,
  requestNotificationPermission,
  syncAlbionDailyReminder,
} from '../services/albionNotifications';
import { refreshFlipHighProfitAlerts } from '../services/flipHighProfitNotify';
import type { EnchantmentMaterialStripResponse, KennelBabyStripItemResponse, MaterialPriceResponse } from '../types';
import AppHeader from '../components/AppHeader';
import './HomePage.css';

const NOTIF_DISMISS_KEY = 'albus_notif_prompt_dismissed';

const MATERIAL_ORDER = ['CLOTH', 'LEATHER', 'PLANKS', 'METALBAR', 'INGREDIENT', 'ARTEFACT', 'CREST'];

const MATERIAL_LABELS: Record<string, string> = {
  CLOTH: 'Cloth',
  LEATHER: 'Leather',
  PLANKS: 'Planks',
  METALBAR: 'Metal Bar',
  INGREDIENT: 'Cook / Alchemy (base)',
  ARTEFACT: 'Artefact',
  CREST: 'Crest',
};

const ENCHANT_MATERIAL_ORDER = ['RUNE', 'SOUL', 'RELIC'] as const;

const ENCHANT_MATERIAL_LABELS: Record<string, string> = {
  RUNE: 'Rune',
  SOUL: 'Soul',
  RELIC: 'Relic',
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

const enchantKindFromRow = (r: EnchantmentMaterialStripResponse) => {
  if (r.materialKind) return r.materialKind;
  const m = r.itemId.match(/_(RUNE|SOUL|RELIC)$/);
  return m ? m[1] : 'RUNE';
};

const groupByEnchantKind = (rows: EnchantmentMaterialStripResponse[]) => {
  const groups: Record<string, EnchantmentMaterialStripResponse[]> = {};
  for (const r of rows) {
    const k = enchantKindFromRow(r);
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  }
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => a.itemId.localeCompare(b.itemId));
  }
  return groups;
};

/** Media listino della riga (T5–T8); usata per colore e filtro (non c’è media 7g sui mercati royal). */
const enchantRowAvg = (items: EnchantmentMaterialStripResponse[]): number => {
  const vals = items.map((i) => i.sellPriceMin).filter((v) => v > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const medianSell = (items: { sellPriceMin: number }[]): number => {
  const v = items.map((i) => i.sellPriceMin).filter((x) => x > 0).sort((a, b) => a - b);
  if (v.length === 0) return 0;
  const m = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
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
  const [presentToast] = useIonToast();
  const [prices, setPrices] = useState<MaterialPriceResponse[]>([]);
  const [enchantStrip, setEnchantStrip] = useState<EnchantmentMaterialStripResponse[]>([]);
  const [kennelBabies, setKennelBabies] = useState<KennelBabyStripItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBelow, setFilterBelow] = useState<Record<string, boolean>>({});
  const [notifBanner, setNotifBanner] = useState<'off' | 'prompt' | 'denied'>('off');
  const [enablingNotif, setEnablingNotif] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const pricesData = await getMaterialPrices();
      setPrices(pricesData);
      try {
        const rows = await getEnchantmentMaterialsStrip();
        setEnchantStrip(rows);
      } catch {
        setEnchantStrip([]);
      }
      try {
        const kb = await getIslandKennelBabiesStrip();
        setKennelBabies(kb);
      } catch {
        setKennelBabies([]);
      }
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

  const refreshNotificationBanner = useCallback(async () => {
    const native = await isNativeNotificationsAvailable();
    if (!native) {
      setNotifBanner('off');
      return;
    }
    const status = await getNotificationPermissionStatus();
    if (status === 'granted') {
      setNotifBanner('off');
      return;
    }
    if (localStorage.getItem(NOTIF_DISMISS_KEY) === '1') {
      setNotifBanner('off');
      return;
    }
    setNotifBanner(status === 'denied' ? 'denied' : 'prompt');
  }, []);

  useIonViewWillEnter(() => {
    void fetchData();
    void refreshNotificationBanner();
  });

  const onEnableNotifications = async () => {
    setEnablingNotif(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        localStorage.removeItem(NOTIF_DISMISS_KEY);
        setNotifBanner('off');
        try {
          await syncAlbionDailyReminder();
          await refreshFlipHighProfitAlerts();
        } catch {
          /* offline / API */
        }
        presentToast({
          message: 'Notifiche attivate',
          duration: 2000,
          color: 'success',
          position: 'top',
        });
        return;
      }
      const after = await getNotificationPermissionStatus();
      setNotifBanner(after === 'denied' ? 'denied' : 'prompt');
      presentToast({
        message: 'Permesso non concesso. Puoi attivarlo dalle impostazioni del dispositivo.',
        duration: 3200,
        color: 'warning',
        position: 'top',
      });
    } finally {
      setEnablingNotif(false);
    }
  };

  const onDismissNotifBanner = () => {
    localStorage.setItem(NOTIF_DISMISS_KEY, '1');
    setNotifBanner('off');
  };

  const notifTimeLabel = `${String(DAILY_REMINDER_HOUR).padStart(2, '0')}:${String(DAILY_REMINDER_MINUTE).padStart(2, '0')}`;

  const handleRefresh = async (event: CustomEvent) => {
    await fetchData();
    event.detail.complete();
  };

  const drag = useDragScroll();
  const homePrices = prices.filter((p) => p.materialType !== 'HEART');
  const grouped = groupByMaterial(homePrices);
  const groupedEnchant = groupByEnchantKind(enchantStrip);
  const kennelMedian = useMemo(() => medianSell(kennelBabies), [kennelBabies]);
  const lastUpdate = homePrices.length > 0 ? homePrices[0].updatedAt : null;

  return (
    <IonPage>
      <AppHeader onMaterialsUpdated={fetchData} lastUpdate={lastUpdate} />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="home-container">
          {notifBanner !== 'off' && (
            <div className="albus-notif-banner-wrap">
              <IonCard className="albus-notif-banner">
                <IonCardContent>
                  <IonText>
                    <h2 className="albus-notif-banner__title">Notifiche Albus</h2>
                    <p className="albus-notif-banner__text">
                      {notifBanner === 'denied' ? (
                        <>
                          Le notifiche sono disattivate. Per un promemoria ogni mattina alle{' '}
                          <strong>{notifTimeLabel}</strong> e avvisi sugli <strong>Flip</strong> a alto profitto (anche
                          con l’app chiusa), attivale dalle impostazioni di sistema o riprova qui sotto.
                        </>
                      ) : (
                        <>
                          Attiva le notifiche: promemoria giornaliero alle <strong>{notifTimeLabel}</strong> e avvisi
                          quando un <strong>Flip</strong> supera la soglia di profitto, anche in background.
                        </>
                      )}
                    </p>
                  </IonText>
                  <div className="albus-notif-banner__actions">
                    <IonButton
                      size="small"
                      className="albus-notif-banner__primary"
                      disabled={enablingNotif}
                      onClick={() => void onEnableNotifications()}
                    >
                      {enablingNotif ? 'Attendere…' : 'Attiva notifiche'}
                    </IonButton>
                    <IonButton size="small" fill="clear" disabled={enablingNotif} onClick={onDismissNotifBanner}>
                      Non ora
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          )}

          <header className="home-hero">
            <img
              src="/assets/logo_homepage.png"
              alt=""
              className="home-hero-logo"
            />
            <h1 className="home-hero-title">Lymhurst</h1>
            <p className="home-hero-tag">
              Materiali e ingredienti base (cibo/pozioni: chopped fish, seaweed, animal remains) · media 7 giorni · più
              cuccioli kennel selvaggi (listino Lymhurst, tab Isola per stime carne/pelle)
            </p>
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

          {/* Rune / Soul / Relic (ultima sezione, come le altre strip + filtro) */}
          {!loading && !error && enchantStrip.length > 0 && (
            <div className="home-enchant-block">
              {ENCHANT_MATERIAL_ORDER.map((kind) => {
                const allItems = groupedEnchant[kind];
                if (!allItems || allItems.length === 0) return null;
                const rowAvg = enchantRowAvg(allItems);
                const isFiltered = !!filterBelow[kind];
                const items = isFiltered
                  ? allItems.filter(
                      (i) => i.sellPriceMin > 0 && rowAvg > 0 && i.sellPriceMin < rowAvg,
                    )
                  : allItems;
                return (
                  <section key={kind} className="home-section home-section--enchant-row">
                    <div className="home-section-head">
                      <span className="home-section-name">
                        {ENCHANT_MATERIAL_LABELS[kind] ?? kind}
                      </span>
                      <button
                        type="button"
                        className={`home-filter ${isFiltered ? 'home-filter--on' : ''}`}
                        onClick={() => setFilterBelow((prev) => ({ ...prev, [kind]: !prev[kind] }))}
                        title="Solo sotto la media di questa riga (listino)"
                        aria-label="Filtra sotto media riga"
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
                      ) : (
                        items.map((item) => (
                          <div key={item.itemId} className="home-tile" title={item.itemId}>
                            {item.iconUrl && (
                              <img
                                src={item.iconUrl}
                                alt=""
                                className="home-tile-icon"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span
                              className={`home-tile-sell ${sellPriceClass(item.sellPriceMin, rowAvg)}`}
                            >
                              {formatPrice(item.sellPriceMin)}
                            </span>
                            <span className="home-tile-7g">
                              <IonIcon icon={timeOutline} aria-hidden />
                              {rowAvg > 0 ? formatPrice(Math.round(rowAvg)) : '—'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {!loading && !error && kennelBabies.length > 0 && (
            <div className="home-enchant-block">
              <section className="home-section home-section--enchant-row">
                <div className="home-section-head">
                  <span className="home-section-name">Cuccioli kennel (selvaggi, carne)</span>
                </div>
                <div
                  className="home-scroll"
                  onPointerDown={drag.onPointerDown}
                  onPointerMove={drag.onPointerMove}
                  onPointerUp={drag.onPointerUp}
                  onPointerCancel={drag.onPointerUp}
                >
                  {kennelBabies.map((item) => (
                    <div key={item.itemId} className="home-tile" title={item.itemId}>
                      {item.iconUrl && (
                        <img
                          src={item.iconUrl}
                          alt=""
                          className="home-tile-icon"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span
                        className={`home-tile-sell ${sellPriceClass(item.sellPriceMin, kennelMedian)}`}
                      >
                        {formatPrice(item.sellPriceMin)}
                      </span>
                      <span className="home-tile-7g">
                        T{item.tier}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
