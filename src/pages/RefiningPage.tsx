import { useCallback, useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { getRefiningFocusPlan, getRefiningOpportunities } from '../services/api';
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

const RefiningPage: React.FC = () => {
  const [rows, setRows] = useState<RefiningOpportunityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lymhurstAnchor, setLymhurstAnchor] = useState(true);
  const [mount, setMount] = useState<RefiningMountCode>('MAMMOTH');
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusPlan, setFocusPlan] = useState<RefiningFocusPlanResponse | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);

  const load = useCallback(async () => {
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

  useIonViewWillEnter(() => {
    void load();
  });

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = async (event: CustomEvent) => {
    await load();
    event.detail.complete();
  };

  const openFocusPlanModal = () => {
    setFocusOpen(true);
    setFocusPlan(null);
    setFocusLoading(true);
    void (async () => {
      try {
        const p = await getRefiningFocusPlan(lymhurstAnchor, mount);
        setFocusPlan(p);
      } catch {
        setFocusPlan({
          found: false,
          enchantmentLevel: 3,
          disclaimer: 'Impossibile caricare il piano focus.',
        });
      } finally {
        setFocusLoading(false);
      }
    })();
  };

  return (
    <IonPage>
      <AppHeader />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="cp-container">
          <IonText>
            <h2 className="cp-count" style={{ margin: '12px 16px 8px', fontSize: '1.05rem', fontWeight: 600 }}>
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
              {DISCLAIMER}
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
            <IonItem lines="none">
              <IonButton expand="block" onClick={openFocusPlanModal}>
                Piano refining .3 con focus
              </IonButton>
            </IonItem>
          </IonList>

          {loading && (
            <div className="cp-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {error && !loading && (
            <div className="cp-state-container">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
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

          {!loading && !error && rows.length === 0 && (
            <div className="cp-state-container">
              <p>Nessuna opportunità positiva con i filtri attuali.</p>
            </div>
          )}
        </div>
      </IonContent>

      <IonModal isOpen={focusOpen} onDidDismiss={() => setFocusOpen(false)} className="cp-detail-modal">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Refining .3 + focus</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setFocusOpen(false)} fill="clear">
                Chiudi
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ paddingBottom: 24 }}>
          {focusLoading && (
            <div className="cp-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}
          {!focusLoading && focusPlan && !focusPlan.found && (
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{focusPlan.disclaimer ?? 'Nessun dato.'}</p>
          )}
          {!focusLoading && focusPlan?.found && (
            <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>
                {focusPlan.resourceLineLabel} T{focusPlan.tier} · .{focusPlan.enchantmentLevel}
              </p>
              <p style={{ margin: '6px 0' }}>
                Refining a <strong>{focusPlan.refineBonusCity}</strong> · Raw da <strong>{focusPlan.buyRawCity}</strong> ·
                Vendi output a <strong>{focusPlan.sellRefinedCity}</strong>
              </p>
              <p style={{ margin: '6px 0', opacity: 0.9 }}>
                RRR stima senza focus {focusPlan.returnRateWithoutFocusPercent?.toFixed(1)}% · con focus{' '}
                {focusPlan.returnRateWithFocusPercent?.toFixed(1)}%
              </p>
              <p style={{ margin: '6px 0' }}>
                Batch: costo listino {formatPrice(focusPlan.listMaterialSilverPerBatch ?? 0)} → effettivo con focus ~
                {formatPrice(focusPlan.effectiveMaterialSilverPerBatch ?? 0)} · ricavo BO ~
                {formatPrice(focusPlan.revenueSilverPerBatch ?? 0)} · +{formatPrice(focusPlan.profitSilverPerBatch ?? 0)}
              </p>
              <p style={{ margin: '6px 0' }}>
                Mount {focusPlan.mountCode} ({Math.round(focusPlan.mountMaxWeightKg ?? 0)} kg): ~
                {focusPlan.fullBatchesPerTripApprox} batch/viaggio · profitto trip ~
                {formatPrice(focusPlan.profitSilverFullTripsOnly ?? 0)}
              </p>
              {focusPlan.transportNote && (
                <p style={{ color: 'var(--ion-color-warning)', margin: '8px 0' }}>{focusPlan.transportNote}</p>
              )}
              <p style={{ fontWeight: 600, marginTop: 14, marginBottom: 6 }}>
                Materiali da comprare ({focusPlan.batchesListedForShopping} batch
                {focusPlan.fullBatchesPerTripApprox ? ' = carico stimato' : ''})
              </p>
              <IonList className="cp-list">
                {(focusPlan.materials ?? []).map((m) => (
                  <IonItem key={m.itemId} lines="full">
                    {m.iconUrl ? (
                      <img
                        src={m.iconUrl}
                        alt=""
                        width={36}
                        height={36}
                        slot="start"
                        style={{ marginInlineEnd: 8 }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <IonLabel>
                      <h3 className="cp-item-name" style={{ fontSize: '0.85rem' }}>
                        {m.quantity}× {m.itemId}
                      </h3>
                      <p style={{ fontSize: '0.78rem', opacity: 0.88 }}>
                        Compra a <strong>{m.buyCity}</strong> @ {formatPrice(m.unitPriceSilver)} →{' '}
                        {formatPrice(m.lineTotalSilver)} · ~{m.totalWeightKg.toFixed(0)} kg
                      </p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
              <p style={{ marginTop: 12, fontWeight: 600 }}>
                Totale costo (focus) {formatPrice(focusPlan.totalEffectiveMaterialSilverListed ?? 0)} · ricavo{' '}
                {formatPrice(focusPlan.totalRevenueSilverListed ?? 0)} ·{' '}
                <span className="cp-profit positive">+{formatPrice(focusPlan.profitSilverListed ?? 0)}</span>
              </p>
              {focusPlan.disclaimer && (
                <p style={{ marginTop: 12, fontSize: '0.78rem', opacity: 0.85 }}>{focusPlan.disclaimer}</p>
              )}
            </div>
          )}
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default RefiningPage;
