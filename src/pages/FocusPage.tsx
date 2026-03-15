import { useCallback, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonList,
  IonItem,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  useIonViewWillEnter,
} from '@ionic/react';
import { arrowDownOutline, arrowUpOutline } from 'ionicons/icons';
import { getFocusProfits, getFocusProfitSortOptions } from '../services/api';
import type { FocusProfitResponse, SortOption } from '../types';
import AppHeader from '../components/AppHeader';
import './CraftingPage.css';

const formatPrice = (price: number) =>
  price > 0 ? price.toLocaleString('it-IT') : '—';

const cleanItemName = (itemId: string): string => {
  let name = itemId;
  if (name.length > 3 && /^T\d_/.test(name)) name = name.substring(3);
  const levelIdx = name.indexOf('_LEVEL');
  if (levelIdx >= 0) name = name.substring(0, levelIdx);
  const atEnchant = name.indexOf('@');
  if (atEnchant >= 0) name = name.substring(0, atEnchant);
  name = name.replace(/^2H_/, '').replace(/^MAIN_/, '').replace(/^OFF_/, '');
  return name.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
};

const FocusPage: React.FC = () => {
  const [items, setItems] = useState<FocusProfitResponse[]>([]);
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [sortBy, setSortBy] = useState('PROFIT_SELL');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [expandedIcon, setExpandedIcon] = useState<string | null>(null);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());

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
        const data = await getFocusProfits(pageNum, 20, sort, direction);
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
        if (reset) setError('Impossibile caricare i dati Focus.');
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
      const optionsData = await getFocusProfitSortOptions();
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
      <AppHeader onFocusUpdated={() => { setLoading(true); fetchItems(0, true); }} />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="cp-container">
          <div className="cp-toolbar">
            {sortOptions.length > 0 && (
              <IonItem className="cp-sort-selector" lines="none">
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
              className="cp-toolbar-icon-btn"
              onClick={handleSortDirectionToggle}
              title={sortDirection === 'DESC' ? 'Decrescente' : 'Crescente'}
            >
              <IonIcon icon={sortDirection === 'DESC' ? arrowDownOutline : arrowUpOutline} />
            </IonButton>
          </div>

          {!loading && totalElements > 0 && (
            <p className="cp-count">{totalElements} item totali (Lymhurst + focus)</p>
          )}

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

          {!loading && !error && items.length === 0 && (
            <div className="cp-state-container">
              <p>Nessun dato Focus.</p>
              <p>Aggiorna il mercato Lymhurst e ricalcola Focus dalle impostazioni.</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <IonList className="cp-list">
                {items.filter((item) => item.iconUrl && !failedIcons.has(item.itemId)).map((item) => (
                  <IonItem key={item.itemId} className="cp-item">
                    <div className="cp-item-left" slot="start">
                      <button
                        type="button"
                        className="cp-icon-btn"
                        onClick={() => setExpandedIcon(expandedIcon === item.itemId ? null : item.itemId)}
                      >
                        <img
                          src={item.iconUrl ?? undefined}
                          alt={cleanItemName(item.itemId)}
                          className={`cp-item-icon ${expandedIcon === item.itemId ? 'expanded' : ''}`}
                          loading="lazy"
                          onError={() => setFailedIcons((prev) => new Set(prev).add(item.itemId))}
                        />
                      </button>
                    </div>

                    <IonLabel>
                          <h3 className="cp-item-name">{cleanItemName(item.itemId)}</h3>
                      <div className="cp-resources">
                        {item.primaryResourceIconUrl && (
                          <img src={item.primaryResourceIconUrl} alt="" className="cp-res-icon" />
                        )}
                        <span className="cp-res-qty">{item.primaryResourceQty}x</span>
                        <span className="cp-res-price">{formatPrice(item.primaryResourcePrice)}</span>
                        {item.secondaryResourceId && (
                          <>
                            <span className="cp-res-sep">+</span>
                            {item.secondaryResourceIconUrl && (
                              <img src={item.secondaryResourceIconUrl} alt="" className="cp-res-icon" />
                            )}
                            <span className="cp-res-qty">{item.secondaryResourceQty}x</span>
                            <span className="cp-res-price">{formatPrice(item.secondaryResourcePrice)}</span>
                          </>
                        )}
                        {item.artifactId && (
                          <>
                            <span className="cp-res-sep">+</span>
                            {item.artifactIconUrl && (
                              <img src={item.artifactIconUrl} alt="" className="cp-res-icon" />
                            )}
                            <span className="cp-res-price">{formatPrice(item.artifactPrice)}</span>
                          </>
                        )}
                        {item.heartId && (
                          <>
                            <span className="cp-res-sep">+</span>
                            {item.heartIconUrl && (
                              <img src={item.heartIconUrl} alt="" className="cp-res-icon" />
                            )}
                            <span className="cp-res-price">{formatPrice(item.heartPrice)}</span>
                          </>
                        )}
                        {item.crestId && (
                          <>
                            <span className="cp-res-sep">+</span>
                            {item.crestIconUrl && (
                              <img src={item.crestIconUrl} alt="" className="cp-res-icon" />
                            )}
                            <span className="cp-res-price">{formatPrice(item.crestPrice)}</span>
                          </>
                        )}
                      </div>
                      <div className="cp-meta">
                        <span className="cp-rrr">RRR {item.returnRateWithFocus}% (con focus)</span>
                        {item.hasCityBonus && <span className="cp-bonus-badge">Bonus</span>}
                        {item.hasDailyBonus && <span className="cp-daily-badge">Bonus daily</span>}
                      </div>
                    </IonLabel>

                    <div slot="end" className="cp-profit-col">
                      <span className={`cp-profit ${item.profitSell >= 0 ? 'positive' : 'negative'}`}>
                        Vendita: {item.profitSell >= 0 ? '+' : ''}{formatPrice(item.profitSell)}
                      </span>
                      <span className={`cp-profit ${item.profitBuyOrder >= 0 ? 'positive' : 'negative'}`}>
                        Buy order: {item.profitBuyOrder >= 0 ? '+' : ''}{formatPrice(item.profitBuyOrder)}
                      </span>
                      <span className="cp-bm-price">Lymhurst sell: {formatPrice(item.lymhurstSellPriceMin)}</span>
                      <span className="cp-bm-price">Lymhurst buy: {formatPrice(item.lymhurstBuyPriceMax)}</span>
                      <span className="cp-cost">Costo: {formatPrice(item.effectiveCostWithFocus > 0 ? item.effectiveCostWithFocus : item.totalMaterialCost)}</span>
                    </div>
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

export default FocusPage;
