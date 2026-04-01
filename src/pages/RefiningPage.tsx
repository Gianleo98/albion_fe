import { useCallback, useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonToggle,
  useIonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import {
  getRefiningFocusPlans,
  getRefiningOpportunities,
  triggerRoyalContinentUpdate,
} from '../services/api';
import type { RefiningFocusPlanResponse, RefiningMountCode, RefiningOpportunityResponse } from '../types';
import AppHeader from '../components/AppHeader';
import './CraftingPage.css';

const formatPrice = (n: number) => (n !== 0 ? n.toLocaleString('it-IT') : '0');

const MOUNT_OPTIONS: { value: RefiningMountCode; label: string }[] = [
  { value: 'MAMMOTH', label: 'Mammouth trasporto' },
  { value: 'WINTER_BEAR_T8', label: 'Winter Bear T8' },
  { value: 'GRIZZLY', label: 'Grizzly / Direbear' },
  { value: 'OX_T8', label: 'Mucca (Ox) T8' },
];

const DISCLAIMER =
  'Stima su mercati royal + Brecilien (Caerleon escluso). Modello: acquisti raw al listino nella città indicata, ' +
  'compri il raffinato tier inferiore al listino nella città con bonus refining (Thetford legno, Fort Sterling pietra, ' +
  'Bridgewatch minerale, Martlock pelle, Lymhurst tessuto), vendi l’output a buy order nella città di vendita. ' +
  'Ricetta fissata a 200 raw + 100 raffinato (t−1) → 100 output (senza focus / return rate). Pesi mount da application.properties.';

const FOCUS_HINT =
  'Tab Focus .3: materiali _LEVEL3@3, costo equivalente con focus (RRR come crafting). Lista ordinata per profitto trip.';

type ViewMode = 'arbitrage' | 'focus';

const RefiningPage: React.FC = () => {
  const [presentToast] = useIonToast();
  const [view, setView] = useState<ViewMode>('arbitrage');
  const [rows, setRows] = useState<RefiningOpportunityResponse[]>([]);
  const [focusRows, setFocusRows] = useState<RefiningFocusPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusLoading, setFocusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [lymhurstAnchor, setLymhurstAnchor] = useState(true);
  const [mount, setMount] = useState<RefiningMountCode>('MAMMOTH');
  const [royalUpdating, setRoyalUpdating] = useState(false);

  const loadArbitrage = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getRefiningOpportunities(lymhurstAnchor, mount);
      setRows(data);
    } catch {
      setError('Impossibile caricare le opportunità refining.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [lymhurstAnchor, mount]);

  const loadFocus = useCallback(async () => {
    try {
      setFocusError(null);
      setFocusLoading(true);
      const data = await getRefiningFocusPlans(lymhurstAnchor, mount, 40);
      setFocusRows(data.filter((r) => r.found));
    } catch {
      setFocusError('Impossibile caricare i piani focus.');
      setFocusRows([]);
    } finally {
      setFocusLoading(false);
    }
  }, [lymhurstAnchor, mount]);

  useIonViewWillEnter(() => {
    void loadArbitrage();
    void loadFocus();
  });

  useEffect(() => {
    void loadArbitrage();
  }, [loadArbitrage]);

  useEffect(() => {
    if (view === 'focus') {
      void loadFocus();
    }
  }, [view, loadFocus]);

  const handleRefresh = async (event: CustomEvent) => {
    if (view === 'arbitrage') {
      await loadArbitrage();
    } else {
      await loadFocus();
    }
    event.detail.complete();
  };

  const runRoyalRecalc = async () => {
    setRoyalUpdating(true);
    try {
      const res = await triggerRoyalContinentUpdate();
      presentToast({
        message: `Royal aggiornato: ${res.priceRowsWritten} prezzi; Focus ${res.focusItemsUpdated} righe.`,
        duration: 3200,
        color: 'success',
        position: 'top',
      });
      await loadArbitrage();
      await loadFocus();
    } catch {
      presentToast({
        message: 'Aggiornamento royal fallito (timeout o rete).',
        duration: 3000,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setRoyalUpdating(false);
    }
  };

  return (
    <IonPage>
      <AppHeader />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="cp-container">
          <div className="cp-search-row" style={{ marginTop: 4, marginBottom: 8, paddingLeft: 8, paddingRight: 8 }}>
            <IonSegment
              value={view}
              onIonChange={(e) => setView((e.detail.value as ViewMode) ?? 'arbitrage')}
              style={{ flex: 1, maxWidth: '100%' }}
            >
              <IonSegmentButton value="arbitrage">
                <IonLabel>Arbitraggio</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="focus">
                <IonLabel>Focus .3</IonLabel>
              </IonSegmentButton>
            </IonSegment>
            <button
              type="button"
              className="cp-filter-below-btn"
              onClick={() => void runRoyalRecalc()}
              disabled={royalUpdating}
              title="Scarica prezzi royal + Brecilien + Caerleon, ricalcola flip royal e Focus (come menu impostazioni)"
              aria-label="Ricalcola mercati royal per refining"
            >
              {royalUpdating ? (
                <IonSpinner name="crescent" style={{ width: 20, height: 20 }} />
              ) : (
                <IonIcon icon={refreshOutline} />
              )}
            </button>
          </div>

          <IonText>
            <h2 className="cp-count" style={{ margin: '4px 16px 8px', fontSize: '1.05rem', fontWeight: 600 }}>
              Refining (raw → città bonus)
            </h2>
            <p
              style={{
                margin: '0 16px 12px',
                fontSize: '0.82rem',
                opacity: 0.85,
                lineHeight: 1.45,
              }}
            >
              {view === 'arbitrage' ? DISCLAIMER : FOCUS_HINT}
            </p>
          </IonText>

          <IonList className="cp-list" style={{ marginBottom: 8 }}>
            <IonItem lines="full">
              <IonToggle
                checked={lymhurstAnchor}
                onIonChange={(e) => setLymhurstAnchor(!!e.detail.checked)}
                justify="space-between"
              >
                <IonLabel>
                  <h3 style={{ fontSize: '0.95rem' }}>Solo percorsi con Lymhurst</h3>
                  <p style={{ fontSize: '0.78rem', opacity: 0.85 }}>
                    Acquisto raw o vendita raffinato a Lymhurst. Disattiva per il miglior path su tutto il royal (no
                    Caerleon).
                  </p>
                </IonLabel>
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonLabel position="stacked" style={{ marginBottom: 6 }}>
                Mount (capacità kg)
              </IonLabel>
              <IonSelect
                interface="popover"
                value={mount}
                onIonChange={(e) => setMount((e.detail.value as RefiningMountCode) ?? 'MAMMOTH')}
              >
                {MOUNT_OPTIONS.map((o) => (
                  <IonSelectOption key={o.value} value={o.value}>
                    {o.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </IonList>

          {view === 'arbitrage' && loading && (
            <div className="cp-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {view === 'arbitrage' && error && !loading && (
            <div className="cp-state-container">
              <p>{error}</p>
            </div>
          )}

          {view === 'arbitrage' && !loading && !error && rows.length > 0 && (
            <IonList className="cp-list" style={{ paddingBottom: 24 }}>
              {rows.map((r) => (
                <IonItem
                  key={`${r.rawItemId}-${r.lowerRefinedItemId}-${r.buyRawCity}-${r.sellRefinedCity}`}
                  lines="full"
                  className="cp-item"
                >
                  {r.refinedIconUrl && (
                    <img
                      src={r.refinedIconUrl}
                      alt=""
                      width={40}
                      height={40}
                      style={{ marginRight: 12, borderRadius: 6 }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <IonLabel>
                    <h3 className="cp-item-name">
                      {r.resourceLineLabel} T{r.tier} → {r.refinedItemId}
                    </h3>
                    <div className="cp-meta">
                      <span>
                        Bonus refining: <strong>{r.refineBonusCity}</strong>
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', marginTop: 6, opacity: 0.88 }}>
                      Raw <strong>{r.rawItemId}</strong> da <strong>{r.buyRawCity}</strong> · vendi output a{' '}
                      <strong>{r.sellRefinedCity}</strong> (tassa {r.taxPercentApplied}%)
                    </p>
                    <p style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.8 }}>
                      Batch: +{formatPrice(r.batchProfitSilver)} · ~{r.fullBatchesPerTripApprox} batch/trip (
                      {r.mountCode}, {Math.round(r.mountMaxWeightKg)} kg) · raw ~{r.estimatedRawKgPerBatch.toFixed(1)}{' '}
                      kg/batch
                    </p>
                  </IonLabel>
                  <div slot="end" className="cp-profit-col" style={{ textAlign: 'right' }}>
                    <span className="cp-profit positive" style={{ display: 'block' }}>
                      +{formatPrice(r.tripProfitSilver)}
                    </span>
                    <span className="cp-bm-price" style={{ display: 'block', marginTop: 4 }}>
                      / trip
                    </span>
                  </div>
                </IonItem>
              ))}
            </IonList>
          )}

          {view === 'arbitrage' && !loading && !error && rows.length === 0 && (
            <div className="cp-state-container">
              <p>Nessuna opportunità positiva con i filtri attuali.</p>
            </div>
          )}

          {view === 'focus' && focusLoading && (
            <div className="cp-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {view === 'focus' && focusError && !focusLoading && (
            <div className="cp-state-container">
              <p>{focusError}</p>
            </div>
          )}

          {view === 'focus' && !focusLoading && !focusError && focusRows.length > 0 && (
            <IonList className="cp-list" style={{ paddingBottom: 24 }}>
              {focusRows.map((p, idx) => (
                <IonItem key={`${p.rawItemId}-${p.buyRawCity}-${p.sellRefinedCity}-${idx}`} lines="full" className="cp-item">
                  {p.outputRefinedItemId && (
                    <img
                      src={`https://render.albiononline.com/v1/item/${p.outputRefinedItemId.replace(/_LEVEL\d+/, '')}.png`}
                      alt=""
                      width={40}
                      height={40}
                      style={{ marginRight: 12, borderRadius: 6 }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <IonLabel>
                    <h3 className="cp-item-name">
                      {p.resourceLineLabel} T{p.tier} · .{p.enchantmentLevel}
                    </h3>
                    <p style={{ fontSize: '0.78rem', marginTop: 4, opacity: 0.9 }}>
                      Refining <strong>{p.refineBonusCity}</strong> · Raw <strong>{p.buyRawCity}</strong> · Vendi{' '}
                      <strong>{p.sellRefinedCity}</strong>
                    </p>
                    <p style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.82 }}>
                      Acquista: <strong>{p.materials?.[0]?.quantity ?? '—'}</strong>× raw @ {p.buyRawCity} ·{' '}
                      <strong>{p.materials?.[1]?.quantity ?? '—'}</strong>× raffinato (t−1) .3 @ {p.refineBonusCity}
                    </p>
                    {p.transportNote && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--ion-color-warning)', marginTop: 4 }}>
                        {p.transportNote}
                      </p>
                    )}
                    <p style={{ fontSize: '0.7rem', marginTop: 6, opacity: 0.8 }}>
                      Costo focus ~{formatPrice(p.totalEffectiveMaterialSilverListed ?? 0)} · ricavo ~
                      {formatPrice(p.totalRevenueSilverListed ?? 0)}
                    </p>
                  </IonLabel>
                  <div slot="end" className="cp-profit-col" style={{ textAlign: 'right' }}>
                    <span className="cp-profit positive" style={{ display: 'block' }}>
                      +{formatPrice(p.profitSilverFullTripsOnly ?? 0)}
                    </span>
                    <span className="cp-bm-price" style={{ display: 'block', marginTop: 4 }}>
                      trip
                    </span>
                    <span className="cp-bm-price" style={{ display: 'block', marginTop: 2, fontSize: '0.7rem' }}>
                      +{formatPrice(p.profitSilverPerBatch ?? 0)}/batch
                    </span>
                  </div>
                </IonItem>
              ))}
            </IonList>
          )}

          {view === 'focus' && !focusLoading && !focusError && focusRows.length > 0 && focusRows[0]?.disclaimer && (
            <p className="cp-count" style={{ margin: '0 16px 24px', fontSize: '0.72rem', opacity: 0.78, lineHeight: 1.45 }}>
              {focusRows[0].disclaimer}
            </p>
          )}

          {view === 'focus' && !focusLoading && !focusError && focusRows.length === 0 && (
            <div className="cp-state-container">
              <p>Nessun piano focus .3 profittevole con i filtri attuali. Aggiorna i mercati royal (icona refresh).</p>
            </div>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default RefiningPage;
