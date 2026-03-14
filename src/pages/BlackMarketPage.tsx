import { useCallback, useState } from 'react';
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
  IonLabel,
  IonList,
  IonItem,
  IonNote,
  IonBadge,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  useIonViewWillEnter,
  useIonToast,
} from '@ionic/react';
import { refreshOutline, arrowDownOutline, arrowUpOutline } from 'ionicons/icons';
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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [presentToast] = useIonToast();

  const fetchItems = useCallback(
    async (
      pageNum: number = 0,
      reset: boolean = false,
      sortByOverride?: string,
      sortDirectionOverride?: 'ASC' | 'DESC'
    ) => {
      const sort = sortByOverride ?? sortBy;
      const direction = sortDirectionOverride ?? sortDirection;
      try {
        const data = await getBlackMarketPrices(pageNum, 20, sort, direction);
        if (reset) {
          setItems(data.content);
        } else {
          setItems((prev) => [...prev, ...data.content]);
        }
        setHasMore(!data.last);
        setPage(pageNum);
        setTotalElements(data.totalElements);
      } catch {
        setItems((prev) => (reset ? [] : prev));
        setHasMore(false);
        if (reset) setError('Impossibile caricare i dati del Black Market.');
      } finally {
        setLoading(false);
      }
    },
    [sortBy, sortDirection]
  );

  const fetchInitial = async () => {
    try {
      setError(null);
      setLoading(true);
      const optionsData = await getBlackMarketSortOptions();
      setSortOptions(optionsData);
    } catch { /* ignore */ }
    await fetchItems(0, true);
  };

  useIonViewWillEnter(() => {
    fetchInitial();
  });

  const handleRefresh = async (event: CustomEvent) => {
    setError(null);
    setLoading(true);
    await fetchItems(0, true);
    event.detail.complete();
  };

  const loadMore = async (event: CustomEvent) => {
    await fetchItems(page + 1);
    (event.target as HTMLIonInfiniteScrollElement).complete();
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
      setLoading(true);
      await fetchItems(0, true);
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

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    setLoading(true);
    fetchItems(0, true, newSortBy, sortDirection);
  };

  const handleSortDirectionToggle = () => {
    const next = sortDirection === 'DESC' ? 'ASC' : 'DESC';
    setSortDirection(next);
    setLoading(true);
    fetchItems(0, true, sortBy, next);
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
          {/* Toolbar */}
          <div className="bm-toolbar">
            {sortOptions.length > 0 && (
              <IonItem className="bm-sort-selector" lines="none">
                <IonLabel>Ordina per</IonLabel>
                <IonSelect
                  value={sortBy}
                  onIonChange={(e) => handleSortChange(e.detail.value)}
                  interface="popover"
                  placeholder="Ordina"
                >
                  {sortOptions.map((opt) => (
                    <IonSelectOption key={opt.code} value={opt.code}>
                      {opt.displayName}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            )}
            <IonButton
              fill="clear"
              className="bm-toolbar-icon-btn"
              onClick={handleSortDirectionToggle}
              title={sortDirection === 'DESC' ? 'Decrescente' : 'Crescente'}
            >
              <IonIcon icon={sortDirection === 'DESC' ? arrowDownOutline : arrowUpOutline} />
            </IonButton>
            <IonButton
              fill="clear"
              className="bm-toolbar-icon-btn"
              onClick={() => setShowConfirm(true)}
              disabled={updating}
              title="Aggiorna prezzi"
            >
              {updating ? (
                <IonSpinner name="dots" />
              ) : (
                <IonIcon icon={refreshOutline} />
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

          {/* Item count */}
          {!loading && totalElements > 0 && (
            <p className="bm-count">{totalElements} item totali</p>
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
            <>
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
              <IonInfiniteScroll disabled={!hasMore} onIonInfinite={loadMore}>
                <IonInfiniteScrollContent loadingSpinner="crescent" loadingText="Caricamento..." />
              </IonInfiniteScroll>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BlackMarketPage;
