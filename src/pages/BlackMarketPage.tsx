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
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonNote,
  IonBadge,
  useIonViewWillEnter,
  useIonToast,
} from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import {
  getBlackMarketPrices,
  getBlackMarketSortOptions,
  triggerBlackMarketUpdate,
} from '../services/api';
import type { BlackMarketPriceResponse, SortOption } from '../types';
import './BlackMarketPage.css';

const formatTier = (tier: number, enchantment: number) =>
  enchantment > 0 ? `T${tier}.${enchantment}` : `T${tier}`;

const formatPrice = (price: number) =>
  price > 0 ? price.toLocaleString('it-IT') : '—';

const cleanItemName = (itemId: string): string => {
  let name = itemId;
  if (name.length > 3 && /^T\d_/.test(name)) {
    name = name.substring(3);
  }
  const levelIdx = name.indexOf('_LEVEL');
  if (levelIdx >= 0) name = name.substring(0, levelIdx);
  return name
    .replaceAll('_', ' ')
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'WEAPON': return 'danger';
    case 'ARMOR': return 'primary';
    case 'OFFHAND': return 'warning';
    case 'ACCESSORY': return 'tertiary';
    default: return 'medium';
  }
};

const BlackMarketPage: React.FC = () => {
  const [items, setItems] = useState<BlackMarketPriceResponse[]>([]);
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [sortBy, setSortBy] = useState('PRICE');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentToast] = useIonToast();

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [pricesData, optionsData] = await Promise.all([
        getBlackMarketPrices(sortBy, sortDirection),
        getBlackMarketSortOptions(),
      ]);
      setItems(pricesData);
      setSortOptions(optionsData);
    } catch {
      setError('Impossibile caricare i dati del Black Market.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPricesOnly = async () => {
    try {
      setError(null);
      const data = await getBlackMarketPrices(sortBy, sortDirection);
      setItems(data);
    } catch {
      setError('Errore nel caricamento.');
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
      const result = await triggerBlackMarketUpdate();
      presentToast({
        message: `${result.message} (${result.itemsUpdated} item)`,
        duration: 2500,
        color: 'success',
        position: 'top',
      });
      await fetchPricesOnly();
    } catch {
      presentToast({
        message: "Errore durante l'aggiornamento.",
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSortChange = async (newSortBy: string) => {
    setSortBy(newSortBy);
    try {
      const data = await getBlackMarketPrices(newSortBy, sortDirection);
      setItems(data);
    } catch { /* ignore */ }
  };

  const handleDirectionChange = async (newDir: 'ASC' | 'DESC') => {
    setSortDirection(newDir);
    try {
      const data = await getBlackMarketPrices(sortBy, newDir);
      setItems(data);
    } catch { /* ignore */ }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Black Market</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Black Market</IonTitle>
          </IonToolbar>
        </IonHeader>

        {updating && <IonProgressBar type="indeterminate" color="danger" />}

        <div className="bm-container">
          {/* Actions */}
          <div className="bm-actions">
            <IonButton
              expand="block"
              fill="outline"
              color="danger"
              className="bm-update-button"
              onClick={() => setShowConfirm(true)}
              disabled={updating}
            >
              {updating ? (
                <IonSpinner name="dots" />
              ) : (
                <>
                  <IonIcon icon={refreshOutline} slot="start" />
                  Aggiorna Black Market
                </>
              )}
            </IonButton>
          </div>

          <IonAlert
            isOpen={showConfirm}
            onDidDismiss={() => setShowConfirm(false)}
            header="Aggiorna Black Market"
            message="Vuoi forzare l'aggiornamento dei prezzi del Black Market? (~22 chiamate API)"
            buttons={[
              { text: 'Annulla', role: 'cancel' },
              { text: 'Aggiorna', handler: handleForceUpdate },
            ]}
          />

          {/* Sort controls */}
          {sortOptions.length > 0 && (
            <div className="bm-sort-controls">
              <div className="bm-sort-select-wrapper">
                <IonSelect
                  value={sortBy}
                  onIonChange={(e) => handleSortChange(e.detail.value)}
                  interface="popover"
                  label="Ordina per"
                  labelPlacement="stacked"
                >
                  {sortOptions.map((opt) => (
                    <IonSelectOption key={opt.code} value={opt.code}>
                      {opt.displayName}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>
              <IonSegment
                value={sortDirection}
                onIonChange={(e) => handleDirectionChange(e.detail.value as 'ASC' | 'DESC')}
                className="bm-direction-segment"
              >
                <IonSegmentButton value="ASC">
                  <IonLabel>ASC</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="DESC">
                  <IonLabel>DESC</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>
          )}

          {/* Item count */}
          {!loading && items.length > 0 && (
            <p className="bm-count">{items.length} item trovati</p>
          )}

          {/* Loading */}
          {loading && (
            <div className="bm-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bm-state-container">
              <p>{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && items.length === 0 && (
            <div className="bm-state-container">
              <p>Nessun dato disponibile.</p>
              <p>Forza un aggiornamento per iniziare.</p>
            </div>
          )}

          {/* Item list */}
          {!loading && !error && items.length > 0 && (
            <IonList className="bm-list">
              {items.map((item) => (
                <IonItem key={item.itemId} className="bm-item">
                  <div className="bm-item-left" slot="start">
                    <span className="bm-tier">{formatTier(item.tier, item.enchantment)}</span>
                    <IonBadge color={getCategoryColor(item.category)} className="bm-category-badge">
                      {item.category.charAt(0)}
                    </IonBadge>
                  </div>
                  <IonLabel>
                    <h3 className="bm-item-name">{cleanItemName(item.itemId)}</h3>
                  </IonLabel>
                  <IonNote slot="end" className="bm-prices">
                    <span className="bm-sell">{formatPrice(item.sellPriceMin)}</span>
                    <span className="bm-buy">{formatPrice(item.buyPriceMax)}</span>
                  </IonNote>
                </IonItem>
              ))}
            </IonList>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BlackMarketPage;
