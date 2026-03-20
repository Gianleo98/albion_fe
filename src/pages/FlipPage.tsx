import { useCallback, useState, useEffect, useRef } from 'react';
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
  IonInput,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  useIonViewWillEnter,
} from '@ionic/react';
import { arrowDownOutline, arrowUpOutline, searchOutline, funnelOutline, funnel } from 'ionicons/icons';
import { getFlipProfits, getFlipProfitSortOptions } from '../services/api';
import type { FlipProfitResponse, SortOption } from '../types';
import AppHeader from '../components/AppHeader';
import './CraftingPage.css';

const formatPrice = (price: number) =>
  price > 0 ? price.toLocaleString('it-IT') : '—';

const cleanItemName = (itemId: string): string => {
  let name = itemId;
  if (name.length > 3 && /^T\d/.test(name)) name = name.replace(/^T\d_/, '');
  const at = name.indexOf('@');
  if (at >= 0) name = name.substring(0, at) + ' .' + name.substring(at + 1);
  const levelIdx = name.indexOf('_LEVEL');
  if (levelIdx >= 0) name = name.substring(0, levelIdx);
  name = name.replace(/^2H_/, '').replace(/^MAIN_/, '').replace(/^OFF_/, '');
  return name.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
};

const FlipPage: React.FC = () => {
  const [items, setItems] = useState<FlipProfitResponse[]>([]);
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [sortBy, setSortBy] = useState('PROFIT');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [expandedIcon, setExpandedIcon] = useState<string | null>(null);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [materialsUnderAvg, setMaterialsUnderAvg] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    searchDebounceRef.current = setTimeout(() => setNameSearch(searchInput), 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setLoading(true);
    fetchItems(0, true);
  }, [nameSearch, materialsUnderAvg]);

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
        const data = await getFlipProfits(
          pageNum,
          20,
          sort,
          direction,
          nameSearch || undefined,
          materialsUnderAvg || undefined
        );
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
        if (reset) setError('Impossibile caricare le opportunità flip.');
      } finally {
        setLoading(false);
      }
    },
    [sortBy, sortDirection, nameSearch, materialsUnderAvg]
  );

  const fetchInitial = async () => {
    try {
      setError(null);
      setLoading(true);
      const optionsData = await getFlipProfitSortOptions();
      setSortOptions(optionsData);
    } catch {
      /* ignore */
    }
    await fetchItems(0, true);
  };

  useIonViewWillEnter(() => {
    fetchInitial();
  });

  const handleRefresh = async (e: CustomEvent) => {
    setLoading(true);
    await fetchItems(0, true);
    (e.target as HTMLIonRefresherElement).complete();
  };

  const loadMore = async (e: CustomEvent) => {
    if (!hasMore || loading) {
      (e.target as HTMLIonInfiniteScrollElement).complete();
      return;
    }
    await fetchItems(page + 1, false);
    (e.target as HTMLIonInfiniteScrollElement).complete();
  };

  const handleSortChange = (value: string | undefined) => {
    if (!value) return;
    setSortBy(value);
    setLoading(true);
    fetchItems(0, true, value, sortDirection);
  };

  const handleSortDirectionToggle = () => {
    const next = sortDirection === 'DESC' ? 'ASC' : 'DESC';
    setSortDirection(next);
    setLoading(true);
    fetchItems(0, true, sortBy, next);
  };

  return (
    <IonPage>
      <AppHeader onFlipUpdated={() => { setLoading(true); fetchItems(0, true); }} />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="cp-container">
          <div className="cp-search-row">
            <IonItem className="cp-search-item" lines="none">
              <IonIcon icon={searchOutline} slot="start" />
              <IonInput
                value={searchInput}
                onIonInput={(e) => setSearchInput(e.detail.value ?? '')}
                placeholder="Cerca per nome..."
              />
            </IonItem>
            <button
              type="button"
              className={`cp-filter-below-btn ${materialsUnderAvg ? 'active' : ''}`}
              onClick={() => {
                setSearchInput('');
                setNameSearch('');
                setMaterialsUnderAvg((prev) => !prev);
              }}
              title="Solo flip con margine ≥ 8% sul costo Caerleon"
              aria-label="Filtra margini alti"
            >
              <IonIcon icon={materialsUnderAvg ? funnel : funnelOutline} />
            </button>
          </div>

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
            <p className="cp-count">{totalElements} opportunità</p>
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
              <p>Nessuna opportunità flip trovata.</p>
              <p style={{ fontSize: '0.9rem', marginTop: 8 }}>
                Aggiorna <strong>Royal Continent</strong> e <strong>Black Market</strong> dal menu. Controlla Premium (tassa 4% / 8%).
              </p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <IonList className="cp-list">
                {items.map((item) => (
                  <IonItem key={item.itemId} className="cp-item">
                    <div className="cp-item-left" slot="start">
                      <button
                        type="button"
                        className="cp-icon-btn"
                        onClick={() =>
                          setExpandedIcon(expandedIcon === item.itemId ? null : item.itemId)
                        }
                      >
                        {item.iconUrl && !failedIcons.has(item.itemId) ? (
                          <img
                            src={item.iconUrl}
                            alt=""
                            className={`cp-item-icon ${expandedIcon === item.itemId ? 'expanded' : ''}`}
                            loading="lazy"
                            onError={() =>
                              setFailedIcons((prev) => new Set(prev).add(item.itemId))
                            }
                          />
                        ) : (
                          <div className={`cp-item-icon ${expandedIcon === item.itemId ? 'expanded' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ion-color-step-150)', fontSize: 10 }}>
                            T{item.tier}
                          </div>
                        )}
                      </button>
                    </div>
                    <IonLabel>
                      <h3 className="cp-item-name">{cleanItemName(item.itemId)}</h3>
                      <div className="cp-meta">
                        <span>T{item.tier}</span>
                        {item.enchantment > 0 && <span> .{item.enchantment}</span>}
                        <span> · {item.category}</span>
                      </div>
                      <div className="cp-resources" style={{ marginTop: 6 }}>
                        <span className="cp-res-price cp-res-price--equal">
                          Caerleon: {formatPrice(item.caerleonSellPriceMin)}
                        </span>
                        <span className="cp-res-sep">→</span>
                        <span>BM buy: {formatPrice(item.blackMarketBuyPriceMax)}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: 4 }}>
                        Netto BM: {formatPrice(item.revenueAfterTax)} (tassa {item.taxPercentApplied}%)
                      </div>
                    </IonLabel>
                    <div slot="end" className="cp-profit-col">
                      <span className="cp-profit positive">+{formatPrice(item.profit)}</span>
                      <span className="cp-bm-price">+{item.profitPercentage.toFixed(1)}%</span>
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

export default FlipPage;
