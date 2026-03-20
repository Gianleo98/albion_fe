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
  IonToggle,
} from '@ionic/react';
import { arrowDownOutline, arrowUpOutline, searchOutline, funnelOutline, funnel, bookmarkOutline, trashOutline, listOutline } from 'ionicons/icons';
import {
  getCraftingProfits,
  getCraftingProfitSortOptions,
  getSavedCraftingItemIds,
  saveCraftingItem,
  deleteSavedCraftingItem,
  getSavedCraftingItemsWithCurrent,
  getSavedCraftingItemDetail,
  patchSavedCraftingTracking,
} from '../services/api';
import type { AvailabilityLevelCode, CraftingProfitResponse, SavedCraftingItemResponse, SortOption } from '../types';
import AppHeader from '../components/AppHeader';
import { formatYieldPercent, yieldPercentFromProfitAndCost } from '../utils/yieldPercent';
import './CraftingPage.css';

const formatPrice = (price: number) =>
  price > 0 ? price.toLocaleString('it-IT') : '—';

const resPriceClass = (level?: 'below' | 'equal' | 'above') =>
  `cp-res-price cp-res-price--${level ?? 'equal'}`;

const AVAIL_OPTIONS: { value: AvailabilityLevelCode; label: string }[] = [
  { value: 'NONE', label: 'Non impostato' },
  { value: 'LOW', label: 'Basso' },
  { value: 'MEDIUM', label: 'Medio' },
  { value: 'HIGH', label: 'Alto' },
];

const cleanItemName = (itemId: string): string => {
  let name = itemId;
  if (name.length > 3 && /^T\d_/.test(name)) name = name.substring(3);
  const levelIdx = name.indexOf('_LEVEL');
  if (levelIdx >= 0) name = name.substring(0, levelIdx);
  name = name.replace(/^2H_/, '').replace(/^MAIN_/, '').replace(/^OFF_/, '');
  return name.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
};

type ListMode = 'all' | 'saved';

const CraftingPage: React.FC = () => {
  const [items, setItems] = useState<CraftingProfitResponse[]>([]);
  const [savedItems, setSavedItems] = useState<SavedCraftingItemResponse[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [listMode, setListMode] = useState<ListMode>('all');
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
  const [saveAlertItem, setSaveAlertItem] = useState<{ itemId: string; isSaved: boolean } | null>(null);
  const [detailItem, setDetailItem] = useState<SavedCraftingItemResponse | null>(null);
  const [trListed, setTrListed] = useState(false);
  const [trSell, setTrSell] = useState<AvailabilityLevelCode>('NONE');
  const [trStock, setTrStock] = useState<AvailabilityLevelCode>('NONE');
  const [trackSaving, setTrackSaving] = useState(false);
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
        const data = await getCraftingProfits(pageNum, 20, sort, direction, nameSearch || undefined, materialsUnderAvg || undefined);
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
        if (reset) setError('Impossibile caricare i dati del crafting.');
      } finally {
        setLoading(false);
      }
    },
    [sortBy, sortDirection, nameSearch, materialsUnderAvg]
  );

  const fetchSavedIds = useCallback(async () => {
    try {
      const ids = await getSavedCraftingItemIds();
      setSavedItemIds(new Set(ids));
    } catch { /* ignore */ }
  }, []);

  const fetchSavedList = useCallback(async () => {
    try {
      const list = await getSavedCraftingItemsWithCurrent();
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
      const optionsData = await getCraftingProfitSortOptions();
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

  useEffect(() => {
    if (detailItem) {
      setTrListed(!!detailItem.listedForSale);
      setTrSell((detailItem.sellAvailability as AvailabilityLevelCode) || 'NONE');
      setTrStock((detailItem.stockAvailability as AvailabilityLevelCode) || 'NONE');
    }
  }, [detailItem?.itemId, detailItem?.listedForSale, detailItem?.sellAvailability, detailItem?.stockAvailability]);

  const openSaveAlert = (itemId: string, isSaved: boolean) => {
    setSaveAlertItem({ itemId, isSaved });
  };

  const handleSaveOrRemoveConfirm = async () => {
    if (!saveAlertItem) return;
    const { itemId, isSaved } = saveAlertItem;
    try {
      if (isSaved) {
        await deleteSavedCraftingItem(itemId);
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
        await saveCraftingItem(itemId);
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

  const openDetail = async (itemId: string) => {
    if (listMode !== 'saved') return;
    const detail = await getSavedCraftingItemDetail(itemId);
    if (detail) setDetailItem(detail);
  };

  const saveCraftingTracking = async () => {
    if (!detailItem) return;
    setTrackSaving(true);
    try {
      const updated = await patchSavedCraftingTracking(detailItem.itemId, {
        listedForSale: trListed,
        sellAvailability: trSell,
        stockAvailability: trStock,
      });
      setDetailItem(updated);
      await fetchSavedList();
      presentToast({ message: 'Note salvate. Lista riordinata.', duration: 2000, color: 'success', position: 'top' });
    } catch {
      presentToast({ message: 'Salvataggio fallito.', duration: 2000, color: 'danger', position: 'top' });
    } finally {
      setTrackSaving(false);
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
      <AppHeader onCraftingUpdated={() => { setLoading(true); fetchItems(0, true); }} />
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
          {/* Search by name */}
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

          {/* Sort toolbar */}
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
            <p className="cp-count">{totalElements} item totali</p>
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
              <p>Nessun item profittevole trovato.</p>
              <p>I materiali devono essere sotto la media 7g.</p>
            </div>
          )}

          {!loading && !error && listMode === 'all' && items.length > 0 && (
            <>
              <IonList className="cp-list">
                {items.filter((item) => item.iconUrl && !failedIcons.has(item.itemId)).map((item) => {
                  const isSaved = savedItemIds.has(item.itemId);
                  return (
                    <IonItemSliding key={item.itemId} ref={(el) => { slidingRefs.current[item.itemId] = el; }}>
                      <IonItem className="cp-item">
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
                            <span className="cp-rrr">RRR {item.returnRate}%</span>
                            {isSaved && <span className="cp-saved-badge">Salvato</span>}
                            {item.hasCityBonus && <span className="cp-bonus-badge">Bonus</span>}
                            {item.hasDailyBonus && <span className="cp-daily-badge">Bonus daily</span>}
                          </div>
                        </IonLabel>

                        <div slot="end" className="cp-profit-col">
                          <span className={`cp-profit ${item.profit >= 0 ? 'positive' : 'negative'}`}>
                            {item.profit >= 0 ? '+' : ''}{formatPrice(item.profit)}
                          </span>
                          <span className={`cp-yield-pct ${item.profit >= 0 ? 'positive' : 'negative'}`}>
                            {formatYieldPercent(item.profitPercentage)}
                          </span>
                          <span className="cp-bm-price">BM: {formatPrice(item.bmSellPrice)}</span>
                          <span className="cp-cost">Costo: {formatPrice(item.effectiveCost > 0 ? item.effectiveCost : item.totalMaterialCost)}</span>
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
            <>
              <p className="cp-count" style={{ marginTop: 4 }}>
                Ordine: prima &quot;vendita non impostata&quot;, poi profitto. Tocca per dettaglio e note.
              </p>
            <IonList className="cp-list">
              {savedItems.map((s) => {
                const profitShow = s.currentDataMissing ? s.savedProfit : s.currentProfit;
                const costShow = s.currentDataMissing ? s.savedEffectiveCost : s.currentEffectiveCost;
                return (
                <IonItemSliding key={s.itemId} ref={(el) => { slidingRefs.current[s.itemId] = el; }}>
                  <IonItem className="cp-item" button onClick={() => openDetail(s.itemId)}>
                    <div className="cp-item-left" slot="start">
                      {s.iconUrl ? (
                        <img
                          src={s.iconUrl}
                          alt=""
                          className="cp-item-icon"
                          loading="lazy"
                        />
                      ) : (
                        <div className="cp-item-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>T{s.tier}</div>
                      )}
                    </div>
                    <IonLabel>
                      <h3 className="cp-item-name">{cleanItemName(s.itemId)}</h3>
                      <div className="cp-saved-chips">
                        {s.listedForSale && <span className="cp-avail-chip cp-avail-chip--listed">In vendita</span>}
                        {(s.sellAvailability === 'NONE' || !s.sellAvailability) && (
                          <span className="cp-avail-chip cp-avail-chip--warn">Vendita: da impostare</span>
                        )}
                        {s.sellAvailability && s.sellAvailability !== 'NONE' && (
                          <span className="cp-avail-chip">Vendita: {s.sellAvailabilityLabel ?? s.sellAvailability}</span>
                        )}
                        <span className="cp-avail-chip">Stock: {s.stockAvailabilityLabel ?? '—'}</span>
                      </div>
                      <div className="cp-meta">
                        {s.currentDataMissing ? (
                          <span className="cp-rrr">Non in elenco profit — dati al salvataggio</span>
                        ) : (
                          <>
                            <span className="cp-rrr">BM ora {formatPrice(s.currentBmPrice)}</span>
                            {s.bmPriceDiff !== 0 && (
                              <span className={s.bmPriceDiff >= 0 ? 'cp-profit positive' : 'cp-profit negative'}>
                                {s.bmPriceDiff >= 0 ? '+' : ''}{formatPrice(s.bmPriceDiff)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </IonLabel>
                    <div slot="end" className="cp-profit-col">
                      <span className={`cp-profit ${profitShow >= 0 ? 'positive' : 'negative'}`}>
                        {profitShow >= 0 ? '+' : ''}{formatPrice(profitShow)}
                      </span>
                      <span className={`cp-yield-pct ${profitShow >= 0 ? 'positive' : 'negative'}`}>
                        {yieldPercentFromProfitAndCost(profitShow, costShow)}
                      </span>
                      <span className="cp-bm-price" style={{ fontSize: '0.75rem' }}>
                        {s.currentDataMissing ? 'snap' : 'oggi'}
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
              );})}
            </IonList>
            </>
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
            isOpen={!!detailItem}
            onDidDismiss={() => setDetailItem(null)}
            className="cp-detail-modal craft-detail-modal"
          >
            <IonHeader className="craft-detail-header">
              <IonToolbar>
                <IonTitle>{detailItem ? cleanItemName(detailItem.itemId) : ''}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setDetailItem(null)} fill="clear">Chiudi</IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding craft-detail-content">
              {detailItem && (
                <>
                  {detailItem.iconUrl && (
                    <img src={detailItem.iconUrl} alt="" className="detail-hero-icon" />
                  )}
                  {detailItem.currentDataMissing && (
                    <div className="detail-missing-banner">
                      <strong>Questo item non è più nell&apos;elenco profit attuale</strong> (materiali non convenienti o BM senza prezzo).
                      Sotto vedi i valori <strong>al momento del salvataggio</strong>. L&apos;icona e il tier restano visibili.
                    </div>
                  )}
                  <IonCard className="craft-detail-card comparison-card">
                    <IonCardHeader>
                      <IonCardTitle>Prezzi Black Market</IonCardTitle>
                      <p className="comparison-saved-at">
                        Snapshot salvato il{' '}
                        {new Date(detailItem.savedAt).toLocaleString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </IonCardHeader>
                    <IonCardContent>
                      <p className="detail-metric-hint">
                        Il prezzo BM è la buy order sul Black Market (quanto ricevi vendendo lì dopo la tassa impostata).
                      </p>
                      <div className="comparison-list">
                        <div className="comparison-row">
                          <div className="comparison-metric-name">Buy order BM</div>
                          <div className="comparison-columns">
                            <div className="comparison-col">
                              <span className="comparison-col-label">Al salvataggio</span>
                              <span className="comparison-col-value">{formatPrice(detailItem.savedBmPrice)}</span>
                            </div>
                            <div className="comparison-col">
                              <span className="comparison-col-label">
                                {detailItem.currentDataMissing ? 'Ora (lista)' : 'Ora aggiornato'}
                              </span>
                              <span className="comparison-col-value comparison-value-now">
                                {detailItem.currentDataMissing ? '—' : formatPrice(detailItem.currentBmPrice)}
                              </span>
                            </div>
                          </div>
                          {!detailItem.currentDataMissing && detailItem.bmPriceDiff !== 0 && (
                            <div className={`comparison-diff ${detailItem.bmPriceDiff > 0 ? 'diff-up' : 'diff-down'}`}>
                              {detailItem.bmPriceDiff > 0 ? '+' : ''}
                              {formatPrice(detailItem.bmPriceDiff)} vs salvataggio
                            </div>
                          )}
                        </div>
                        <div className="comparison-row">
                          <div className="comparison-metric-name">Profitto crafting → BM</div>
                          <p className="detail-metric-hint">Dopo costo materiali e bonus RRR.</p>
                          <div className="comparison-columns">
                            <div className="comparison-col">
                              <span className="comparison-col-label">Al salvataggio</span>
                              <span className="comparison-col-value">
                                {detailItem.savedProfit >= 0 ? '+' : ''}
                                {formatPrice(detailItem.savedProfit)}
                              </span>
                              <span className="comparison-yield-pct">
                                Rend. {yieldPercentFromProfitAndCost(detailItem.savedProfit, detailItem.savedEffectiveCost)}
                              </span>
                            </div>
                            <div className="comparison-col">
                              <span className="comparison-col-label">
                                {detailItem.currentDataMissing ? 'Ora (lista)' : 'Ora aggiornato'}
                              </span>
                              <span className="comparison-col-value comparison-value-now">
                                {detailItem.currentDataMissing ? '—' : `${detailItem.currentProfit >= 0 ? '+' : ''}${formatPrice(detailItem.currentProfit)}`}
                              </span>
                              {!detailItem.currentDataMissing && (
                                <span className="comparison-yield-pct">
                                  Rend. {yieldPercentFromProfitAndCost(detailItem.currentProfit, detailItem.currentEffectiveCost)}
                                </span>
                              )}
                            </div>
                          </div>
                          {!detailItem.currentDataMissing && detailItem.profitDiff !== 0 && (
                            <div className={`comparison-diff ${detailItem.profitDiff > 0 ? 'diff-up' : 'diff-down'}`}>
                              {detailItem.profitDiff > 0 ? '+' : ''}
                              {formatPrice(detailItem.profitDiff)} vs salvataggio
                            </div>
                          )}
                        </div>
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <IonCard className="craft-detail-card detail-tracking-card">
                    <IonCardHeader>
                      <IonCardTitle>Le tue note (mercato personale)</IonCardTitle>
                      <p className="comparison-saved-at">
                        Usa &quot;Non impostato&quot; per gli item da controllare: compaiono in cima alla lista salvati.
                      </p>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonItem lines="none">
                        <IonLabel>Attualmente in vendita</IonLabel>
                        <IonToggle checked={trListed} onIonChange={(e) => setTrListed(e.detail.checked)} />
                      </IonItem>
                      <IonItem lines="none">
                        <IonLabel position="stacked">Disponibilità vendita (ordini)</IonLabel>
                        <IonSelect value={trSell} onIonChange={(e) => setTrSell((e.detail.value as AvailabilityLevelCode) ?? 'NONE')} interface="popover">
                          {AVAIL_OPTIONS.map((o) => (
                            <IonSelectOption key={o.value} value={o.value}>
                              {o.label}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                      <IonItem lines="none">
                        <IonLabel position="stacked">Stock / disponibilità magazzino</IonLabel>
                        <IonSelect value={trStock} onIonChange={(e) => setTrStock((e.detail.value as AvailabilityLevelCode) ?? 'NONE')} interface="popover">
                          {AVAIL_OPTIONS.map((o) => (
                            <IonSelectOption key={o.value} value={o.value}>
                              {o.label}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                      <IonButton expand="block" onClick={() => void saveCraftingTracking()} disabled={trackSaving}>
                        {trackSaving ? 'Salvataggio…' : 'Salva note'}
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                </>
              )}
            </IonContent>
          </IonModal>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CraftingPage;
