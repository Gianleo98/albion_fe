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
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSegment,
  IonSegmentButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  useIonViewWillEnter,
  useIonToast,
  IonAlert,
} from '@ionic/react';
import { arrowDownOutline, arrowUpOutline, searchOutline, funnelOutline, funnel, bookmarkOutline, trashOutline, listOutline } from 'ionicons/icons';
import {
  getFocusProfits,
  getFocusProfitSortOptions,
  getFocusRoyalMarkets,
  getSavedFocusItemIds,
  saveFocusItem,
  deleteSavedFocusItem,
  getSavedFocusItemsWithCurrent,
  getSavedFocusItemDetail,
} from '../services/api';
import type { FocusProfitResponse, RoyalMarketsResponse, SavedFocusItemResponse, SortOption } from '../types';
import AppHeader from '../components/AppHeader';
import './CraftingPage.css';

const formatPrice = (price: number) =>
  price > 0 ? price.toLocaleString('it-IT') : '—';

const resPriceClass = (level?: 'below' | 'equal' | 'above') =>
  `cp-res-price cp-res-price--${level ?? 'equal'}`;

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

type ListMode = 'all' | 'saved';

const FocusPage: React.FC = () => {
  const [items, setItems] = useState<FocusProfitResponse[]>([]);
  const [savedItems, setSavedItems] = useState<SavedFocusItemResponse[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [listMode, setListMode] = useState<ListMode>('all');
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
  const [searchInput, setSearchInput] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [materialsUnderAvg, setMaterialsUnderAvg] = useState(false);
  const [saveAlertItem, setSaveAlertItem] = useState<{ itemId: string; isSaved: boolean } | null>(null);
  const [detailItem, setDetailItem] = useState<SavedFocusItemResponse | null>(null);
  const [detailBasicItem, setDetailBasicItem] = useState<FocusProfitResponse | null>(null);
  const [royalMarkets, setRoyalMarkets] = useState<RoyalMarketsResponse | null>(null);
  const [royalMarketsLoading, setRoyalMarketsLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef = useRef(false);
  const slidingRefs = useRef<Record<string, HTMLIonItemSlidingElement | null>>({});
  const [presentToast] = useIonToast();

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
        const data = await getFocusProfits(pageNum, 20, sort, direction, nameSearch || undefined, materialsUnderAvg || undefined);
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
    [sortBy, sortDirection, nameSearch, materialsUnderAvg]
  );

  const fetchSavedIds = useCallback(async () => {
    try {
      const ids = await getSavedFocusItemIds();
      setSavedItemIds(new Set(ids));
    } catch { /* ignore */ }
  }, []);

  const fetchSavedList = useCallback(async () => {
    try {
      const list = await getSavedFocusItemsWithCurrent();
      setSavedItems(list);
    } catch {
      setSavedItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInitial = async () => {
    try {
      setError(null);
      setLoading(true);
      const optionsData = await getFocusProfitSortOptions();
      setSortOptions(optionsData);
      await fetchSavedIds();
    } catch { /* ignore */ }
    await fetchItems(0, true);
  };

  useIonViewWillEnter(() => {
    fetchInitial();
  });

  useEffect(() => {
    if (listMode === 'saved') {
      setLoading(true);
      fetchSavedList();
    }
  }, [listMode, fetchSavedList]);

  const openSaveAlert = (itemId: string, isSaved: boolean) => {
    setSaveAlertItem({ itemId, isSaved });
  };

  const handleSaveOrRemoveConfirm = async () => {
    if (!saveAlertItem) return;
    const { itemId, isSaved } = saveAlertItem;
    try {
      if (isSaved) {
        await deleteSavedFocusItem(itemId);
        setSavedItemIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        if (listMode === 'saved') {
          setSavedItems((prev) => prev.filter((s) => s.itemId !== itemId));
        }
        presentToast({ message: 'Rimosso dai salvati.', duration: 2000, color: 'medium', position: 'top' });
      } else {
        await saveFocusItem(itemId);
        setSavedItemIds((prev) => new Set(prev).add(itemId));
        presentToast({ message: 'Aggiunto ai salvati.', duration: 2000, color: 'success', position: 'top' });
      }
    } catch {
      presentToast({ message: 'Operazione fallita.', duration: 2000, color: 'danger', position: 'top' });
    } finally {
      setSaveAlertItem(null);
      slidingRefs.current[itemId]?.close();
    }
  };

  const detailItemId = detailItem?.itemId ?? detailBasicItem?.itemId ?? null;

  const openDetailFromSaved = async (itemId: string) => {
    const detail = await getSavedFocusItemDetail(itemId);
    if (detail) {
      setDetailItem(detail);
      setDetailBasicItem(null);
      setRoyalMarkets(null);
    }
  };

  const openDetailFromItem = (item: FocusProfitResponse) => {
    setDetailBasicItem(item);
    setDetailItem(null);
    setRoyalMarkets(null);
  };

  const closeDetail = () => {
    setDetailItem(null);
    setDetailBasicItem(null);
    setRoyalMarkets(null);
  };

  const loadRoyalMarkets = async () => {
    if (!detailItemId) return;
    setRoyalMarketsLoading(true);
    setRoyalMarkets(null);
    try {
      const data = await getFocusRoyalMarkets(detailItemId);
      setRoyalMarkets(data);
    } catch {
      presentToast({ message: 'Errore nel caricamento mercati.', duration: 2000, color: 'danger', position: 'top' });
    } finally {
      setRoyalMarketsLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    setError(null);
    await fetchSavedIds();
    if (listMode === 'saved') {
      setLoading(true);
      await fetchSavedList();
    } else {
      setLoading(true);
      await fetchItems(0, true);
    }
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
          <IonSegment
            value={listMode}
            onIonChange={(e) => setListMode((e.detail.value as ListMode) ?? 'all')}
            className="cp-segment"
          >
            <IonSegmentButton value="all" title="Tutti">
              <IonIcon icon={listOutline} />
            </IonSegmentButton>
            <IonSegmentButton value="saved" title="Solo salvati">
              <IonIcon icon={bookmarkOutline} />
            </IonSegmentButton>
          </IonSegment>

          {listMode === 'all' && (
          <>
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
              title="Solo item con materiali sotto media 7gg"
              aria-label="Filtra: materiali sotto media"
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

          {!loading && listMode === 'all' && totalElements > 0 && (
            <p className="cp-count">{totalElements} item totali (Lymhurst + focus)</p>
          )}

          {listMode === 'all' && loading && (
            <div className="cp-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {listMode === 'all' && error && !loading && (
            <div className="cp-state-container">
              <p>{error}</p>
            </div>
          )}

          {listMode === 'all' && !loading && !error && items.length === 0 && (
            <div className="cp-state-container">
              <p>Nessun dato Focus.</p>
              <p>Aggiorna il mercato Lymhurst e ricalcola Focus dalle impostazioni.</p>
            </div>
          )}

          {!loading && !error && listMode === 'all' && items.length > 0 && (
            <>
              <IonList className="cp-list">
                {items.filter((item) => item.iconUrl && !failedIcons.has(item.itemId)).map((item) => {
                  const isSaved = savedItemIds.has(item.itemId);
                  return (
                    <IonItemSliding key={item.itemId} ref={(el) => { slidingRefs.current[item.itemId] = el; }}>
                      <IonItem className="cp-item" button onClick={() => openDetailFromItem(item)}>
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
                        <span className={resPriceClass(item.primaryResourcePriceLevel)}>{formatPrice(item.primaryResourcePrice)}</span>
                        {item.secondaryResourceId && (
                          <>
                            <span className="cp-res-sep">+</span>
                            {item.secondaryResourceIconUrl && (
                              <img src={item.secondaryResourceIconUrl} alt="" className="cp-res-icon" />
                            )}
                            <span className="cp-res-qty">{item.secondaryResourceQty}x</span>
                            <span className={resPriceClass(item.secondaryResourcePriceLevel)}>{formatPrice(item.secondaryResourcePrice)}</span>
                          </>
                        )}
                        {item.artifactId && (
                          <>
                            <span className="cp-res-sep">+</span>
                            {item.artifactIconUrl && (
                              <img src={item.artifactIconUrl} alt="" className="cp-res-icon" />
                            )}
                            <span className={resPriceClass(item.artifactPriceLevel)}>{formatPrice(item.artifactPrice)}</span>
                          </>
                        )}
                        {item.heartId && (
                          <>
                            <span className="cp-res-sep">+</span>
                            {item.heartIconUrl && (
                              <img src={item.heartIconUrl} alt="" className="cp-res-icon" />
                            )}
                            <span className={resPriceClass(item.heartPriceLevel)}>{formatPrice(item.heartPrice)}</span>
                          </>
                        )}
                        {item.crestId && (
                          <>
                            <span className="cp-res-sep">+</span>
                            {item.crestIconUrl && (
                              <img src={item.crestIconUrl} alt="" className="cp-res-icon" />
                            )}
                            <span className={resPriceClass(item.crestPriceLevel)}>{formatPrice(item.crestPrice)}</span>
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
                      <IonItemOptions side="end" onIonSwipe={() => openSaveAlert(item.itemId, isSaved)}>
                        <IonItemOption
                          color={isSaved ? 'danger' : 'success'}
                          onClick={() => openSaveAlert(item.itemId, isSaved)}
                        >
                          <IonIcon icon={isSaved ? trashOutline : bookmarkOutline} slot="start" />
                          {isSaved ? 'Rimuovi' : 'Salva'}
                        </IonItemOption>
                      </IonItemOptions>
                    </IonItemSliding>
                  );
                })}
              </IonList>
              <IonInfiniteScroll disabled={!hasMore} onIonInfinite={loadMore}>
                <IonInfiniteScrollContent loadingSpinner="crescent" loadingText="Caricamento..." />
              </IonInfiniteScroll>
            </>
          )}
          </>
          )}

          {listMode === 'saved' && loading && (
            <div className="cp-state-container">
              <IonSpinner name="crescent" />
            </div>
          )}

          {listMode === 'saved' && !loading && savedItems.length > 0 && (
            <IonList className="cp-list">
              {savedItems.map((s) => (
                <IonItemSliding key={s.itemId} ref={(el) => { slidingRefs.current[s.itemId] = el; }}>
                  <IonItem className="cp-item" button onClick={() => openDetailFromSaved(s.itemId)}>
                    <div className="cp-item-left" slot="start">
                      {s.iconUrl && (
                        <img
                          src={s.iconUrl}
                          alt={cleanItemName(s.itemId)}
                          className="cp-item-icon"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <IonLabel>
                      <h3 className="cp-item-name">{cleanItemName(s.itemId)}</h3>
                      <div className="cp-meta">
                        <span className="cp-rrr">Vendita: {formatPrice(s.savedProfitSell)} → {formatPrice(s.currentProfitSell)}</span>
                        {s.profitSellDiff !== 0 && (
                          <span className={s.profitSellDiff >= 0 ? 'cp-profit positive' : 'cp-profit negative'}>
                            {s.profitSellDiff >= 0 ? '+' : ''}{formatPrice(s.profitSellDiff)}
                          </span>
                        )}
                      </div>
                    </IonLabel>
                    <div slot="end" className="cp-profit-col">
                      <span className={`cp-profit ${s.currentProfitSell >= 0 ? 'positive' : 'negative'}`}>
                        {s.currentProfitSell >= 0 ? '+' : ''}{formatPrice(s.currentProfitSell)}
                      </span>
                    </div>
                  </IonItem>
                  <IonItemOptions side="end" onIonSwipe={() => openSaveAlert(s.itemId, true)}>
                    <IonItemOption color="danger" onClick={() => openSaveAlert(s.itemId, true)}>
                      <IonIcon icon={trashOutline} slot="start" />
                      Rimuovi
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </IonList>
          )}

          {listMode === 'saved' && !loading && savedItems.length === 0 && (
            <div className="cp-state-container">
              <p>Nessun item salvato.</p>
              <p>Scorri a sinistra su un item nella lista &quot;Tutti&quot; per salvarlo.</p>
            </div>
          )}

          <IonAlert
            isOpen={!!saveAlertItem}
            onDidDismiss={() => setSaveAlertItem(null)}
            header={saveAlertItem?.isSaved ? 'Rimuovi dai salvati' : 'Salva item'}
            message={saveAlertItem?.isSaved
              ? 'Rimuovere questo item dai salvati?'
              : 'Salvare questo item per tracciare il prezzo nel tempo?'}
            buttons={[
              { text: 'Annulla', role: 'cancel' },
              { text: saveAlertItem?.isSaved ? 'Rimuovi' : 'Salva', handler: handleSaveOrRemoveConfirm },
            ]}
          />

          <IonModal
            isOpen={!!detailItemId}
            onDidDismiss={closeDetail}
            className="cp-detail-modal focus-detail-modal"
          >
            <IonHeader className="focus-detail-header">
              <IonToolbar>
                <IonTitle>{detailItemId ? cleanItemName(detailItemId) : ''}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={closeDetail} fill="clear">Chiudi</IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding focus-detail-content">
              {detailItem && (
                <IonCard className="focus-detail-card comparison-card">
                  <IonCardHeader>
                    <IonCardTitle>Confronto nel tempo</IonCardTitle>
                    <p className="comparison-saved-at">Salvato il {new Date(detailItem.savedAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className="comparison-list">
                      <div className="comparison-row">
                        <div className="comparison-metric-name">Prezzo vendita (Lymhurst)</div>
                        <div className="comparison-columns">
                          <div className="comparison-col">
                            <span className="comparison-col-label">Al salvataggio</span>
                            <span className="comparison-col-value">{formatPrice(detailItem.savedLymhurstSell)}</span>
                          </div>
                          <div className="comparison-col">
                            <span className="comparison-col-label">Ora</span>
                            <span className="comparison-col-value comparison-value-now">{formatPrice(detailItem.currentLymhurstSell)}</span>
                          </div>
                        </div>
                        {detailItem.sellPriceDiff !== 0 && (
                          <div className={`comparison-diff ${detailItem.sellPriceDiff > 0 ? 'diff-up' : 'diff-down'}`}>
                            {detailItem.sellPriceDiff > 0 ? '+' : ''}{formatPrice(detailItem.sellPriceDiff)}
                          </div>
                        )}
                      </div>
                      <div className="comparison-row">
                        <div className="comparison-metric-name">Prezzo buy order (Lymhurst)</div>
                        <div className="comparison-columns">
                          <div className="comparison-col">
                            <span className="comparison-col-label">Al salvataggio</span>
                            <span className="comparison-col-value">{formatPrice(detailItem.savedLymhurstBuy)}</span>
                          </div>
                          <div className="comparison-col">
                            <span className="comparison-col-label">Ora</span>
                            <span className="comparison-col-value comparison-value-now">{formatPrice(detailItem.currentLymhurstBuy)}</span>
                          </div>
                        </div>
                        {detailItem.buyPriceDiff !== 0 && (
                          <div className={`comparison-diff ${detailItem.buyPriceDiff > 0 ? 'diff-up' : 'diff-down'}`}>
                            {detailItem.buyPriceDiff > 0 ? '+' : ''}{formatPrice(detailItem.buyPriceDiff)}
                          </div>
                        )}
                      </div>
                      <div className="comparison-row">
                        <div className="comparison-metric-name">Profitto (vendita)</div>
                        <div className="comparison-columns">
                          <div className="comparison-col">
                            <span className="comparison-col-label">Al salvataggio</span>
                            <span className="comparison-col-value">{detailItem.savedProfitSell >= 0 ? '+' : ''}{formatPrice(detailItem.savedProfitSell)}</span>
                          </div>
                          <div className="comparison-col">
                            <span className="comparison-col-label">Ora</span>
                            <span className="comparison-col-value comparison-value-now">{detailItem.currentProfitSell >= 0 ? '+' : ''}{formatPrice(detailItem.currentProfitSell)}</span>
                          </div>
                        </div>
                        {detailItem.profitSellDiff !== 0 && (
                          <div className={`comparison-diff ${detailItem.profitSellDiff > 0 ? 'diff-up' : 'diff-down'}`}>
                            {detailItem.profitSellDiff > 0 ? '+' : ''}{formatPrice(detailItem.profitSellDiff)}
                          </div>
                        )}
                      </div>
                      <div className="comparison-row">
                        <div className="comparison-metric-name">Profitto (buy order)</div>
                        <div className="comparison-columns">
                          <div className="comparison-col">
                            <span className="comparison-col-label">Al salvataggio</span>
                            <span className="comparison-col-value">{detailItem.savedProfitBuyOrder >= 0 ? '+' : ''}{formatPrice(detailItem.savedProfitBuyOrder)}</span>
                          </div>
                          <div className="comparison-col">
                            <span className="comparison-col-label">Ora</span>
                            <span className="comparison-col-value comparison-value-now">{detailItem.currentProfitBuyOrder >= 0 ? '+' : ''}{formatPrice(detailItem.currentProfitBuyOrder)}</span>
                          </div>
                        </div>
                        {detailItem.profitBuyOrderDiff !== 0 && (
                          <div className={`comparison-diff ${detailItem.profitBuyOrderDiff > 0 ? 'diff-up' : 'diff-down'}`}>
                            {detailItem.profitBuyOrderDiff > 0 ? '+' : ''}{formatPrice(detailItem.profitBuyOrderDiff)}
                          </div>
                        )}
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              )}

              <IonCard className="focus-detail-card">
                <IonCardHeader>
                  <IonCardTitle>Tutti i mercati Royal</IonCardTitle>
                  <p className="focus-detail-subtitle">Lista completa di tutti i mercati, ordinata dal più proficuo.</p>
                </IonCardHeader>
                <IonCardContent>
                  <IonButton expand="block" onClick={loadRoyalMarkets} disabled={royalMarketsLoading} className="focus-detail-load-btn">
                    {royalMarketsLoading ? 'Caricamento...' : 'Carica lista mercati'}
                  </IonButton>
                  {royalMarkets && (
                    <div className="focus-markets-wrap">
                      <div className="focus-market-section">
                        <h3 className="focus-market-section-title">Vendita (sell order)</h3>
                        <div className="focus-market-list">
                          {royalMarkets.sellOrders.length === 0 ? (
                            <p className="focus-market-empty">Nessun prezzo vendita</p>
                          ) : (
                            royalMarkets.sellOrders.map((e, i) => (
                              <div key={e.city} className="focus-market-row">
                                <span className="focus-market-rank">{i + 1}</span>
                                <span className="focus-market-city">{e.city}</span>
                                <span className="focus-market-prices">
                                  min {formatPrice(e.sellPriceMin)} · max {formatPrice(e.sellPriceMax)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="focus-market-section">
                        <h3 className="focus-market-section-title">Buy order</h3>
                        <div className="focus-market-list">
                          {royalMarkets.buyOrders.length === 0 ? (
                            <p className="focus-market-empty">Nessun buy order</p>
                          ) : (
                            royalMarkets.buyOrders.map((e, i) => (
                              <div key={e.city} className="focus-market-row">
                                <span className="focus-market-rank">{i + 1}</span>
                                <span className="focus-market-city">{e.city}</span>
                                <span className="focus-market-prices">
                                  min {formatPrice(e.buyPriceMin)} · max {formatPrice(e.buyPriceMax)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonContent>
          </IonModal>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FocusPage;
