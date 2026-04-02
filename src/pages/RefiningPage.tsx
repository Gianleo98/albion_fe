import { useCallback, useEffect, useState } from 'react';
import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToggle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { informationCircleOutline } from 'ionicons/icons';
import { getRefiningFocusPlans, getRefiningOpportunities } from '../services/api';
import type { RefiningFocusPlanResponse, RefiningOpportunityResponse } from '../types';
import AppHeader from '../components/AppHeader';
import './CraftingPage.css';
import './RefiningPage.css';

const formatPrice = (n: number) => (n !== 0 ? n.toLocaleString('it-IT') : '0');

const perPz = (n: number) => `${formatPrice(n)} /pz`;

function compactItemId(itemId: string): string {
  return itemId.replace(/_LEVEL\d+@?\d*/g, '').replace(/_/g, ' ');
}

function arbitrageBatchQty(r: RefiningOpportunityResponse): { raw: number; lower: number; out: number } {
  const tier = typeof r.tier === 'number' && r.tier >= 4 && r.tier <= 8 ? r.tier : 4;
  const out = typeof r.outputPerBatch === 'number' && r.outputPerBatch > 0 ? r.outputPerBatch : 100;
  const raw =
    typeof r.rawInputPerBatch === 'number' && r.rawInputPerBatch > 0
      ? r.rawInputPerBatch
      : tier === 8
        ? 500
        : 300;
  const lower =
    typeof r.lowerRefinedInputPerBatch === 'number' && r.lowerRefinedInputPerBatch > 0
      ? r.lowerRefinedInputPerBatch
      : 100;
  return { raw, lower, out };
}

function focusBatchQty(p: RefiningFocusPlanResponse): { raw: number; lower: number; out: number } {
  const tier = typeof p.tier === 'number' && p.tier >= 4 && p.tier <= 8 ? p.tier : 4;
  const out = typeof p.outputPerBatch === 'number' && p.outputPerBatch > 0 ? p.outputPerBatch : 100;
  let raw = p.materials?.[0]?.quantity ?? p.rawInputPerBatch;
  if (raw == null || raw <= 0) {
    raw = tier === 8 ? 500 : 300;
  }
  let lower = p.materials?.[1]?.quantity ?? p.lowerRefinedInputPerBatch;
  if (lower == null || lower <= 0) {
    lower = 100;
  }
  return { raw, lower, out };
}

type DetailState =
  | { kind: 'arbitrage'; row: RefiningOpportunityResponse }
  | { kind: 'focus'; row: RefiningFocusPlanResponse }
  | null;

function ArbitrageDetailBody({ r, onClose }: { r: RefiningOpportunityResponse; onClose: () => void }) {
  const q = arbitrageBatchQty(r);
  const listCost =
    r.listMaterialSilverPerBatch ?? q.raw * (r.rawUnitBuySilver ?? 0) + q.lower * (r.lowerRefinedUnitBuySilver ?? 0);
  const effectiveCost = r.effectiveMaterialSilverPerBatch ?? listCost;
  const rrrNoFocus = r.returnRateWithoutFocusPercent;
  return (
    <div className="refining-detail-body">
      <div className="refining-detail-hero">
        {r.refinedIconUrl && (
          <img
            src={r.refinedIconUrl}
            alt=""
            width={56}
            height={56}
            className="refining-detail-hero-icon"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div>
          <h2 className="refining-detail-hero-title">
            {r.resourceLineLabel} · output T{r.tier}
          </h2>
          <p className="refining-detail-hero-id">{compactItemId(r.refinedItemId)}</p>
          <p className="refining-detail-hero-profit">
            +{formatPrice(r.batchProfitSilver)} <span className="refining-detail-hero-profit-label">su {q.out} output</span>
          </p>
        </div>
      </div>

      <div className="refining-shopping-summary">
        <div className="refining-prices-title">Cosa prendere (per {q.out} output T{r.tier})</div>
        <ul className="refining-shopping-rows">
          <li>
            <span className="refining-shopping-qty">{q.raw}</span>
            <span className="refining-shopping-desc">
              pezzi <strong>raw T{r.tier}</strong> — <strong>{r.buyRawCity}</strong>
            </span>
          </li>
          <li>
            <span className="refining-shopping-qty">{q.lower}</span>
            <span className="refining-shopping-desc">
              pezzi <strong>raffinato T{r.tier - 1}</strong> — <strong>{r.refineBonusCity}</strong>
            </span>
          </li>
          <li>
            <span className="refining-shopping-qty">{q.out}</span>
            <span className="refining-shopping-desc">
              pezzi <strong>output</strong> — vendita <strong>{r.sellRefinedCity}</strong>
            </span>
          </li>
        </ul>
      </div>

      <div className="refining-prices-block">
        <div className="refining-prices-title">Prezzi (listini)</div>
        <ul className="refining-prices-list">
          <li>
            <strong>Raw</strong>: {q.raw} pz a {perPz(r.rawUnitBuySilver ?? 0)} →{' '}
            <strong>{formatPrice(q.raw * (r.rawUnitBuySilver ?? 0))}</strong>
          </li>
          <li>
            <strong>Raffinato</strong>: {q.lower} pz a {perPz(r.lowerRefinedUnitBuySilver ?? 0)} →{' '}
            <strong>{formatPrice(q.lower * (r.lowerRefinedUnitBuySilver ?? 0))}</strong>
          </li>
          <li>
            <strong>Output</strong>: {q.out} pz a {perPz(r.outputUnitSellSilver ?? 0)} buy order · tassa{' '}
            {r.taxPercentApplied}%
          </li>
          <li>
            <strong>Costo base</strong>: {formatPrice(listCost)}
            {rrrNoFocus != null ? (
              <>
                {' '}
                · RRR senza focus {rrrNoFocus}% → <strong>{formatPrice(effectiveCost)}</strong>
              </>
            ) : null}
          </li>
        </ul>
      </div>

      <div className="refining-flow">
        <div className="refining-step">
          <span className="refining-step-num">1</span>
          <span>
            <strong>{q.raw}</strong> raw T{r.tier} → <strong>{r.buyRawCity}</strong>
          </span>
        </div>
        <div className="refining-step">
          <span className="refining-step-num">2</span>
          <span>
            <strong>{q.lower}</strong> raffinato T{r.tier - 1} → <strong>{r.refineBonusCity}</strong>
          </span>
        </div>
        <div className="refining-step">
          <span className="refining-step-num">3</span>
          <span>
            Raffina · <strong>{q.out}</strong> output → <strong>{r.sellRefinedCity}</strong>
          </span>
        </div>
      </div>

      <IonButton expand="block" fill="outline" className="refining-detail-close-btn" onClick={onClose}>
        Chiudi
      </IonButton>
    </div>
  );
}

function FocusDetailBody({ p, disclaimer, onClose }: { p: RefiningFocusPlanResponse; disclaimer?: string; onClose: () => void }) {
  const lowerIsEnchanted = !!p.lowerRefinedItemId?.includes('_LEVEL');
  const rawQty = p.materials?.[0]?.quantity ?? p.rawInputPerBatch ?? 0;
  const lowerQty = p.materials?.[1]?.quantity ?? p.lowerRefinedInputPerBatch ?? 0;
  const out = p.outputPerBatch ?? 100;

  return (
    <div className="refining-detail-body">
      <div className="refining-detail-hero">
        {p.outputRefinedItemId && (
          <img
            src={`https://render.albiononline.com/v1/item/${p.outputRefinedItemId.replace(/_LEVEL\d+/, '')}.png`}
            alt=""
            width={56}
            height={56}
            className="refining-detail-hero-icon"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div>
          <h2 className="refining-detail-hero-title">
            {p.resourceLineLabel} · T{p.tier} .{p.enchantmentLevel}
          </h2>
          {p.outputRefinedItemId ? (
            <p className="refining-detail-hero-id">{compactItemId(p.outputRefinedItemId)}</p>
          ) : null}
          <p className="refining-detail-hero-profit">
            +{formatPrice(p.profitSilverPerBatch ?? 0)}{' '}
            <span className="refining-detail-hero-profit-label">su {out} output</span>
          </p>
        </div>
      </div>

      <p className="refining-recipe-banner">
        <span className="refining-qty">{rawQty}</span> raw T{p.tier} .3 + <span className="refining-qty">{lowerQty}</span>{' '}
        {lowerIsEnchanted && p.tier != null ? `raff. T${p.tier - 1} .3` : 'raff. T3 norm.'} →{' '}
        <span className="refining-qty">{out}</span> out .3
      </p>

      <div className="refining-prices-block">
        <div className="refining-prices-title">Prezzi (listini)</div>
        <ul className="refining-prices-list">
          <li>
            <strong>Raw .3</strong>: {rawQty} pz a {perPz(p.materials?.[0]?.unitPriceSilver ?? 0)} @ {p.buyRawCity} →{' '}
            <strong>{formatPrice(p.materials?.[0]?.lineTotalSilver ?? 0)}</strong>
          </li>
          <li>
            <strong>Semilavorato</strong>: {lowerQty} pz a {perPz(p.materials?.[1]?.unitPriceSilver ?? 0)} @{' '}
            {p.refineBonusCity} → <strong>{formatPrice(p.materials?.[1]?.lineTotalSilver ?? 0)}</strong>
          </li>
          <li>
            <strong>Output .3</strong>: {out} pz a {perPz(p.outputUnitSellSilver ?? 0)} @ {p.sellRefinedCity}
            {p.taxPercentApplied != null ? ` · tassa ${p.taxPercentApplied}%` : ''}
          </li>
        </ul>
      </div>

      <div className="refining-flow">
        <div className="refining-step">
          <span className="refining-step-num">1</span>
          <span>
            Raw .3 → <strong>{p.buyRawCity}</strong>
          </span>
        </div>
        <div className="refining-step">
          <span className="refining-step-num">2</span>
          <span>
            Semilavorato → <strong>{p.refineBonusCity}</strong>
          </span>
        </div>
        <div className="refining-step">
          <span className="refining-step-num">3</span>
          <span>
            Focus + vendita → <strong>{p.sellRefinedCity}</strong>
          </span>
        </div>
      </div>

      <div className="refining-focus-meta">
        Costo (stima focus) ~{formatPrice(p.totalEffectiveMaterialSilverListed ?? 0)} · Ricavo ~
        {formatPrice(p.totalRevenueSilverListed ?? 0)}
        {p.returnRateWithFocusPercent != null && p.returnRateWithoutFocusPercent != null && (
          <>
            {' '}
            · RRR ~{p.returnRateWithFocusPercent}% / ~{p.returnRateWithoutFocusPercent}%
          </>
        )}
      </div>

      {disclaimer ? <div className="refining-disclaimer-foot">{disclaimer}</div> : null}

      <IonButton expand="block" fill="outline" className="refining-detail-close-btn" onClick={onClose}>
        Chiudi
      </IonButton>
    </div>
  );
}

type ViewMode = 'arbitrage' | 'focus';

const RefiningPage: React.FC = () => {
  const [view, setView] = useState<ViewMode>('arbitrage');
  const [rows, setRows] = useState<RefiningOpportunityResponse[]>([]);
  const [focusRows, setFocusRows] = useState<RefiningFocusPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusLoading, setFocusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [lymhurstAnchor, setLymhurstAnchor] = useState(true);
  /** true = solo 5 città royal (default); false = include Brecilien nei percorsi. */
  const [excludeBrecilien, setExcludeBrecilien] = useState(true);
  const [detail, setDetail] = useState<DetailState>(null);

  const loadArbitrage = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getRefiningOpportunities(lymhurstAnchor, excludeBrecilien);
      setRows(data);
    } catch {
      setError('Non siamo riusciti a caricare l’elenco. Controlla la connessione e riprova.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [lymhurstAnchor, excludeBrecilien]);

  const loadFocus = useCallback(async () => {
    try {
      setFocusError(null);
      setFocusLoading(true);
      const data = await getRefiningFocusPlans(lymhurstAnchor, 40, excludeBrecilien);
      setFocusRows(data.filter((r) => r.found));
    } catch {
      setFocusError('Non siamo riusciti a caricare i piani con focus. Riprova tra poco.');
      setFocusRows([]);
    } finally {
      setFocusLoading(false);
    }
  }, [lymhurstAnchor, excludeBrecilien]);

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

  const reloadFromSettings = useCallback(() => {
    void loadArbitrage();
    void loadFocus();
  }, [loadArbitrage, loadFocus]);

  const closeDetail = () => setDetail(null);

  const arbitrageHelp = (
    <ul>
      <li>
        Confrontiamo <strong>listini</strong> e <strong>buy order</strong>. Con «Senza Brecilien» solo le{' '}
        <strong>5 città royal</strong>; disattiva per includere anche Brecilien.
      </li>
      <li>
        Ricetta per 100 output: fino al T7 <strong>300 + 100</strong> raffinato (t−1); T8 <strong>500 + 100</strong>.
      </li>
      <li>
        <strong>Prezzi:</strong> Impostazioni → <strong>Aggiorna Royal Continent</strong>.
      </li>
    </ul>
  );

  const focusHelp = (
    <ul>
      <li>
        Stessi filtri Lymhurst e <strong>Senza Brecilien</strong> del tab Opportunità (5 royal vs + Brecilien).
      </li>
      <li>
        Materiali <strong>.3</strong>; costo con RRR focus ~<strong>53,9%</strong> (senza ~36,7%).
      </li>
      <li>
        T4 .3 usa <strong>T3 raffinato normale</strong>; dal T5 raffinato .3 del tier sotto.
      </li>
      <li>
        <strong>Prezzi:</strong> come sopra (Royal Continent).
      </li>
    </ul>
  );

  const focusDisclaimer = focusRows[0]?.disclaimer;

  return (
    <IonPage>
      <AppHeader onRefiningUpdated={reloadFromSettings} />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingText="Trascina per ricaricare" />
        </IonRefresher>

        <div className="cp-container refining-page--compact">
          <IonSegment
            value={view}
            onIonChange={(e) => setView((e.detail.value as ViewMode) ?? 'arbitrage')}
            className="cp-segment refining-segment-tight"
          >
            <IonSegmentButton value="arbitrage">
              <IonLabel>Opportunità</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="focus">
              <IonLabel>Focus .3</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          <IonAccordionGroup className="refining-help refining-help--tight">
            <IonAccordion value="help">
              <IonItem slot="header" lines="none">
                <IonLabel>Aiuto</IonLabel>
              </IonItem>
              <div className="refining-help-body" slot="content">
                {view === 'arbitrage' ? arbitrageHelp : focusHelp}
              </div>
            </IonAccordion>
          </IonAccordionGroup>

          <IonList className="cp-list refining-filter-list">
            <IonItem lines="full">
              <IonToggle
                checked={lymhurstAnchor}
                onIonChange={(e) => setLymhurstAnchor(!!e.detail.checked)}
                justify="space-between"
              >
                <IonLabel>
                  <h3 className="refining-toggle-title">Solo via Lymhurst</h3>
                  <p className="refining-toggle-sub">Acquisto raw o vendita output include Lymhurst</p>
                </IonLabel>
              </IonToggle>
            </IonItem>
            <IonItem lines="full">
              <IonToggle
                checked={excludeBrecilien}
                onIonChange={(e) => setExcludeBrecilien(!!e.detail.checked)}
                justify="space-between"
              >
                <IonLabel>
                  <h3 className="refining-toggle-title">Senza Brecilien</h3>
                  <p className="refining-toggle-sub">
                    Solo mercati royal continent (5 città). Spegni per usare anche Brecilien nei percorsi.
                  </p>
                </IonLabel>
              </IonToggle>
            </IonItem>
          </IonList>

          {view === 'arbitrage' && loading && (
            <div className="cp-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {view === 'arbitrage' && error && !loading && (
            <div className="cp-state-container refining-empty">
              <IonIcon icon={informationCircleOutline} className="refining-empty-icon" />
              <p className="refining-empty-title">Errore</p>
              <p>{error}</p>
            </div>
          )}

          {view === 'arbitrage' && !loading && !error && rows.length > 0 && (
            <>
              <p className="refining-list-hint">
                {rows.length} risultat{rows.length === 1 ? 'o' : 'i'} · tocca per dettaglio
              </p>
              <IonList className="cp-list refining-compact-list">
                {rows.map((r) => {
                  const q = arbitrageBatchQty(r);
                  return (
                    <IonItem
                      key={`${r.rawItemId}-${r.lowerRefinedItemId}-${r.buyRawCity}-${r.sellRefinedCity}`}
                      button
                      detail
                      lines="full"
                      className="refining-compact-item"
                      onClick={() => setDetail({ kind: 'arbitrage', row: r })}
                    >
                      {r.refinedIconUrl && (
                        <IonThumbnail slot="start" className="refining-compact-thumb-wrap">
                          <img
                            src={r.refinedIconUrl}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </IonThumbnail>
                      )}
                      <IonLabel>
                        <h3 className="refining-compact-title">
                          {r.resourceLineLabel} · T{r.tier}
                        </h3>
                        <p className="refining-compact-sub">
                          {q.raw} raw + {q.lower} raff. → {q.out}
                        </p>
                      </IonLabel>
                      <div slot="end" className="refining-compact-profit">
                        +{formatPrice(r.batchProfitSilver)}
                      </div>
                    </IonItem>
                  );
                })}
              </IonList>
            </>
          )}

          {view === 'arbitrage' && !loading && !error && rows.length === 0 && (
            <div className="cp-state-container refining-empty">
              <IonIcon icon={informationCircleOutline} className="refining-empty-icon" />
              <p className="refining-empty-title">Nessun margine</p>
              <p className="refining-empty-text">
                Prova a disattivare Lymhurst o aggiorna i prezzi da <strong>Impostazioni</strong>.
              </p>
            </div>
          )}

          {view === 'focus' && focusLoading && (
            <div className="cp-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {view === 'focus' && focusError && !focusLoading && (
            <div className="cp-state-container refining-empty">
              <IonIcon icon={informationCircleOutline} className="refining-empty-icon" />
              <p className="refining-empty-title">Errore</p>
              <p>{focusError}</p>
            </div>
          )}

          {view === 'focus' && !focusLoading && !focusError && focusRows.length > 0 && (
            <>
              <p className="refining-list-hint">
                {focusRows.length} pian{focusRows.length === 1 ? 'o' : 'i'} · tocca per dettaglio
              </p>
              <IonList className="cp-list refining-compact-list">
                {focusRows.map((p, idx) => {
                  const q = focusBatchQty(p);
                  return (
                    <IonItem
                      key={`${p.rawItemId}-${p.buyRawCity}-${p.sellRefinedCity}-${idx}`}
                      button
                      detail
                      lines="full"
                      className="refining-compact-item"
                      onClick={() => setDetail({ kind: 'focus', row: p })}
                    >
                      {p.outputRefinedItemId && (
                        <IonThumbnail slot="start" className="refining-compact-thumb-wrap">
                          <img
                            src={`https://render.albiononline.com/v1/item/${p.outputRefinedItemId.replace(/_LEVEL\d+/, '')}.png`}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </IonThumbnail>
                      )}
                      <IonLabel>
                        <h3 className="refining-compact-title">
                          {p.resourceLineLabel} · T{p.tier} .3
                        </h3>
                        <p className="refining-compact-sub">
                          {q.raw}+{q.lower}→{q.out}
                        </p>
                      </IonLabel>
                      <div slot="end" className="refining-compact-profit">
                        +{formatPrice(p.profitSilverPerBatch ?? 0)}
                      </div>
                    </IonItem>
                  );
                })}
              </IonList>
            </>
          )}

          {view === 'focus' && !focusLoading && !focusError && focusRows.length === 0 && (
            <div className="cp-state-container refining-empty">
              <IonIcon icon={informationCircleOutline} className="refining-empty-icon" />
              <p className="refining-empty-title">Nessun piano</p>
              <p className="refining-empty-text">
                Aggiorna i mercati da <strong>Impostazioni → Royal Continent</strong>.
              </p>
            </div>
          )}
        </div>

        <IonModal isOpen={detail !== null} onDidDismiss={closeDetail}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Dettaglio</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeDetail}>Chiudi</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {detail?.kind === 'arbitrage' && (
              <ArbitrageDetailBody r={detail.row} onClose={closeDetail} />
            )}
            {detail?.kind === 'focus' && (
              <FocusDetailBody p={detail.row} disclaimer={focusDisclaimer} onClose={closeDetail} />
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RefiningPage;
