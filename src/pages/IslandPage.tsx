import { useCallback, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  useIonViewWillEnter,
} from '@ionic/react';
import { getIslandKennelProfitEstimates } from '../services/api';
import type { KennelProfitEstimateResponse } from '../types';
import AppHeader from '../components/AppHeader';
import './CraftingPage.css';

const formatPrice = (n: number) => (n !== 0 ? n.toLocaleString('it-IT') : '0');

const DISCLAIMER =
  'Animali in kennel selvaggi: dieta solo carne. Stesso fabbisogno in punti nutrizione per ogni tier di carne: conviene comprare la carne col minor costo per coprire i punti (qui calcolato su listino minimo Lymhurst). ' +
  'Premium dimezza il tempo di crescita, non riduce la quantità di carne. ' +
  'Questa vista assume il caso peggiore: nessun cucciolo extra al raccolto. Il “ricavo” e il RRR% sono calcolati solo sulla pelle lavorata (Cured Leather) nella quantità indicata per la sella — non includono cuori, altri materiali del mount né il valore del mount finito. ' +
  'Quantità pelle e nutrizione derivano da dati wiki / database pubblici: verifica in game.';

const IslandPage: React.FC = () => {
  const [rows, setRows] = useState<KennelProfitEstimateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getIslandKennelProfitEstimates();
      setRows(data);
    } catch {
      setError('Impossibile caricare le stime isola.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useIonViewWillEnter(() => {
    void load();
  });

  const handleRefresh = async (event: CustomEvent) => {
    await load();
    event.detail.complete();
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
              Isola — Kennel (selvaggi, carne)
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
                <IonItem key={r.babyItemId} lines="full" className="cp-item">
                  <IonLabel>
                    <h3 className="cp-item-name">{r.labelIt}</h3>
                    <div className="cp-meta">
                      <span>T{r.tier}</span>
                      <span>
                        {' '}
                        · Crescita {r.growHoursNoPremium}h (Premium ~{r.growHoursPremium}h)
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', marginTop: 6, opacity: 0.88 }}>
                      Carne migliore: <strong>{r.bestMeatItemId || '—'}</strong>
                      {r.meatUnitsNeeded > 0 && (
                        <>
                          {' '}
                          × {r.meatUnitsNeeded} @ {formatPrice(r.meatUnitPrice)} →{' '}
                          <strong>{formatPrice(r.totalMeatCost)}</strong>
                        </>
                      )}
                    </p>
                    <p style={{ fontSize: '0.78rem', marginTop: 4, opacity: 0.88 }}>
                      Cucciolo {formatPrice(r.babyBuyCost)} · Solo pelle{' '}
                      <strong>
                        {r.saddleCuredLeatherQty}× {r.curedLeatherItemId}
                      </strong>{' '}
                      @ {formatPrice(r.curedLeatherUnitPrice)} → ricavo{' '}
                      <strong>{formatPrice(r.leatherRevenueOnly)}</strong>
                    </p>
                    {!r.dataComplete && (
                      <p style={{ fontSize: '0.72rem', marginTop: 4, color: 'var(--ion-color-warning)' }}>
                        Dati mercato incompleti (prezzo cucciolo, carne o pelle mancante su Lymhurst).
                      </p>
                    )}
                  </IonLabel>
                  <div slot="end" className="cp-profit-col" style={{ textAlign: 'right' }}>
                    <span
                      className={`cp-profit ${r.netSilverWorstCase >= 0 ? 'positive' : 'negative'}`}
                      style={{ display: 'block' }}
                    >
                      {r.netSilverWorstCase >= 0 ? '+' : ''}
                      {formatPrice(r.netSilverWorstCase)}
                    </span>
                    <span className="cp-bm-price" style={{ display: 'block', marginTop: 4 }}>
                      RRR su pelle {r.rrrPercentOnLeatherOnly.toFixed(1)}%
                    </span>
                  </div>
                </IonItem>
              ))}
            </IonList>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default IslandPage;
