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
  useIonViewWillEnter,
  useIonToast,
} from '@ionic/react';
import {
  arrowDownOutline,
  arrowUpOutline,
  searchOutline,
  funnelOutline,
  funnel,
  globeOutline,
  globe,
  refreshOutline,
  bagCheckOutline,
  pricetagOutline,
  bookmarkOutline,
  trashOutline,
  listOutline,
} from 'ionicons/icons';
import {
  getFlipProfits,
  getFlipProfitSortOptions,
  getRoyalContinentFlipProfits,
  getRoyalFlipSortOptions,
  recomputeRoyalContinentFlip,
  getSavedFlipItemIds,
  saveFlipItem,
  deleteSavedFlipItem,
  getSavedFlipItemsWithCurrent,
  getSavedRoyalFlipItemIds,
  saveRoyalFlipItem,
  deleteSavedRoyalFlipItem,
  getSavedRoyalFlipItemsWithCurrent,
} from '../services/api';
import { refreshFlipHighProfitAlerts } from '../services/flipHighProfitNotify';
import type {
  FlipProfitResponse,
  RoyalContinentFlipResponse,
  SavedFlipItemResponse,
  SavedRoyalFlipItemResponse,
  SortOption,
} from '../types';
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

type FlipListMode = 'bm' | 'royal';
type SavedListMode = 'all' | 'saved';

function isRoyalRow(r: FlipProfitResponse | RoyalContinentFlipResponse): r is RoyalContinentFlipResponse {
  return 'boProfit' in r && 'soProfit' in r;
}

const FlipPage: React.FC = () => {
  const [flipListMode, setFlipListMode] = useState<FlipListMode>('bm');
  const [savedListMode, setSavedListMode] = useState<SavedListMode>('all');
  const [items, setItems] = useState<(FlipProfitResponse | RoyalContinentFlipResponse)[]>([]);
  const [savedItems, setSavedItems] = useState<SavedFlipItemResponse[]>([]);
  const [savedRoyalItems, setSavedRoyalItems] = useState<SavedRoyalFlipItemResponse[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [savedRoyalItemIds, setSavedRoyalItemIds] = useState<Set<string>>(new Set());
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [sortBy, setSortBy] = useState('PROFIT');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [expandedIcon, setExpandedIcon] = useState<string | null>(null);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [materialsUnderAvg, setMaterialsUnderAvg] = useState(false);
  /** Royal: BO = listino → buy order; SO = listino → sell listino */
  const [royalFlipPath, setRoyalFlipPath] = useState<'BO' | 'SO'>('BO');
  const [lastRoyalComputedHint, setLastRoyalComputedHint] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountSearchRef = useRef(false);
  const didMountModeRef = useRef(false);
  const [presentToast] = useIonToast();

  useEffect(() => {
    searchDebounceRef.current = setTimeout(() => setNameSearch(searchInput), 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!didMountSearchRef.current) {
      didMountSearchRef.current = true;
      return;
    }
    setLoading(true);
    void fetchItems(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ordinamento gestito da handleSortChange
  }, [nameSearch, materialsUnderAvg]);

  useEffect(() => {
    if (!didMountModeRef.current) {
      didMountModeRef.current = true;
      return;
    }
    void (async () => {
      try {
        const opts =
          flipListMode === 'bm' ? await getFlipProfitSortOptions() : await getRoyalFlipSortOptions();
        setSortOptions(opts);
        await fetchSavedIds();
      } catch {
        /* ignore */
      }
      setLoading(true);
      if (savedListMode === 'saved') {
        await fetchSavedList();
      } else {
        await fetchItems(0, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ordinamento gestito da handleSortChange
  }, [flipListMode, royalFlipPath]);

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
        if (flipListMode === 'bm') {
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
        } else {
          const data = await getRoyalContinentFlipProfits(
            pageNum,
            20,
            sort,
            direction,
            nameSearch || undefined,
            royalFlipPath
          );
          if (reset) {
            setItems(data.content);
            const first = data.content[0];
            if (first && isRoyalRow(first) && first.computedAt) {
              try {
                setLastRoyalComputedHint(
                  new Date(first.computedAt).toLocaleString('it-IT', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                );
              } catch {
                setLastRoyalComputedHint(null);
              }
            } else if (data.content.length === 0) {
              setLastRoyalComputedHint(null);
            }
          } else {
            setItems((prev) => [...prev, ...data.content]);
          }
          setHasMore(!data.last);
          setPage(pageNum);
          setTotalElements(data.totalElements);
        }
      } catch {
        setItems((prev) => (reset ? [] : prev));
        setHasMore(false);
        if (reset) {
          setError(
            flipListMode === 'bm'
              ? 'Impossibile caricare le opportunità flip.'
              : 'Impossibile caricare il flip Royal Continent.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [sortBy, sortDirection, nameSearch, materialsUnderAvg, flipListMode, royalFlipPath]
  );

  const fetchSavedIds = useCallback(async () => {
    try {
      if (flipListMode === 'bm') {
        const ids = await getSavedFlipItemIds();
        setSavedItemIds(new Set(ids));
      } else {
        const ids = await getSavedRoyalFlipItemIds(royalFlipPath);
        setSavedRoyalItemIds(new Set(ids));
      }
    } catch {
      /* ignore */
    }
  }, [flipListMode, royalFlipPath]);

  const fetchSavedList = useCallback(async () => {
    try {
      if (flipListMode === 'bm') {
        const list = await getSavedFlipItemsWithCurrent();
        setSavedItems(list);
      } else {
        const list = await getSavedRoyalFlipItemsWithCurrent(royalFlipPath);
        setSavedRoyalItems(list);
      }
    } catch {
      if (flipListMode === 'bm') setSavedItems([]);
      else setSavedRoyalItems([]);
    }
  }, [flipListMode, royalFlipPath]);

  const runRoyalRecompute = useCallback(async () => {
    setRecomputing(true);
    try {
      const res = await recomputeRoyalContinentFlip();
      presentToast({
        message: `Royal cross: ${res.itemsStored} opportunità salvate.`,
        duration: 2500,
        color: 'success',
        position: 'top',
      });
      setLoading(true);
      await fetchItems(0, true);
    } catch {
      presentToast({
        message: 'Ricalcolo Royal Continent fallito.',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setRecomputing(false);
    }
  }, [fetchItems, presentToast]);

  const fetchInitial = async () => {
    try {
      setError(null);
      setLoading(true);
      const optionsData =
        flipListMode === 'bm' ? await getFlipProfitSortOptions() : await getRoyalFlipSortOptions();
      setSortOptions(optionsData);
      await fetchSavedIds();
    } catch {
      /* ignore */
    }
    if (savedListMode === 'saved') {
      await fetchSavedList();
      setLoading(false);
      return;
    }
    await fetchItems(0, true);
  };

  useIonViewWillEnter(() => {
    void fetchInitial();
  });

  useEffect(() => {
    if (savedListMode !== 'saved') return;
    setLoading(true);
    void fetchSavedList().finally(() => setLoading(false));
  }, [savedListMode, flipListMode, fetchSavedList]);

  const handleRefresh = async (e: CustomEvent) => {
    setLoading(true);
    await fetchSavedIds();
    if (savedListMode === 'saved') {
      await fetchSavedList();
    } else {
      await fetchItems(0, true);
      if (flipListMode === 'bm') {
        void refreshFlipHighProfitAlerts();
      }
    }
    setLoading(false);
    (e.target as HTMLIonRefresherElement).complete();
  };

  const loadMore = async (e: CustomEvent) => {
    if (savedListMode === 'saved') {
      (e.target as HTMLIonInfiniteScrollElement).complete();
      return;
    }
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

  const toggleRoyalMode = () => {
    setFlipListMode((m) => {
      const next = m === 'bm' ? 'royal' : 'bm';
      if (next === 'royal') {
        setRoyalFlipPath('BO');
      }
      return next;
    });
    setSortBy('PROFIT');
    setItems([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  };

  const toggleRoyalPathOrBmMargin = () => {
    if (flipListMode === 'bm') {
      setSearchInput('');
      setNameSearch('');
      setMaterialsUnderAvg((prev) => !prev);
    } else {
      setRoyalFlipPath((p) => (p === 'BO' ? 'SO' : 'BO'));
    }
  };

  const toggleSaveFlip = async (itemId: string) => {
    const isBm = flipListMode === 'bm';
    const isSaved = isBm ? savedItemIds.has(itemId) : savedRoyalItemIds.has(itemId);
    try {
      if (isSaved) {
        if (isBm) {
          await deleteSavedFlipItem(itemId);
          setSavedItemIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
          setSavedItems((prev) => prev.filter((s) => s.itemId !== itemId));
        } else {
          await deleteSavedRoyalFlipItem(itemId, royalFlipPath);
          setSavedRoyalItemIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
          setSavedRoyalItems((prev) => prev.filter((s) => s.itemId !== itemId));
        }
        presentToast({ message: 'Rimosso dai salvati.', duration: 1800, color: 'medium', position: 'top' });
      } else {
        if (isBm) {
          await saveFlipItem(itemId);
          setSavedItemIds((prev) => new Set(prev).add(itemId));
        } else {
          await saveRoyalFlipItem(itemId, royalFlipPath);
          setSavedRoyalItemIds((prev) => new Set(prev).add(itemId));
        }
        presentToast({ message: 'Aggiunto ai salvati.', duration: 1800, color: 'success', position: 'top' });
        if (savedListMode === 'saved') {
          await fetchSavedList();
        }
      }
    } catch {
      presentToast({ message: 'Operazione fallita.', duration: 1800, color: 'danger', position: 'top' });
    }
  };

  return (
    <IonPage>
      <AppHeader
        onFlipUpdated={() => {
          setLoading(true);
          if (savedListMode === 'saved') {
            void fetchSavedList().finally(() => setLoading(false));
          } else {
            void fetchItems(0, true).finally(() => {
              if (flipListMode === 'bm') {
                void refreshFlipHighProfitAlerts();
              }
            });
          }
        }}
      />
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="cp-container">
          <IonSegment
            value={savedListMode}
            onIonChange={(e) => setSavedListMode((e.detail.value as SavedListMode) ?? 'all')}
            className="cp-segment"
          >
            <IonSegmentButton value="all" title="Tutti">
              <IonIcon icon={listOutline} />
            </IonSegmentButton>
            <IonSegmentButton value="saved" title="Salvati">
              <IonIcon icon={bookmarkOutline} />
            </IonSegmentButton>
          </IonSegment>

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
              className={`cp-filter-below-btn ${flipListMode === 'royal' ? 'active' : ''}`}
              onClick={() => toggleRoyalMode()}
              title={
                flipListMode === 'bm'
                  ? 'Flip royal tra 6 città (senza Caerleon). Tocca di nuovo per Caerleon → Black Market.'
                  : 'Torna a Caerleon → Black Market'
              }
              aria-label={flipListMode === 'bm' ? 'Attiva flip Royal Continent' : 'Torna a flip Black Market'}
            >
              <IonIcon icon={flipListMode === 'royal' ? globe : globeOutline} />
            </button>
            {flipListMode === 'royal' && (
              <button
                type="button"
                className="cp-filter-below-btn"
                onClick={() => void runRoyalRecompute()}
                disabled={recomputing}
                title="Ricalcola opportunità tra Lymhurst, Bridgewatch, Martlock, Fort Sterling, Thetford e Brecilien (Caerleon escluso)"
                aria-label="Ricalcola flip Royal Continent"
              >
                {recomputing ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} /> : <IonIcon icon={refreshOutline} />}
              </button>
            )}
            <button
              type="button"
              className={`cp-filter-below-btn ${
                flipListMode === 'bm' ? (materialsUnderAvg ? 'active' : '') : royalFlipPath === 'SO' ? 'active' : ''
              }`}
              onClick={() => toggleRoyalPathOrBmMargin()}
              title={
                flipListMode === 'bm'
                  ? 'Solo flip con margine ≥ 8% sul costo Caerleon'
                  : royalFlipPath === 'BO'
                    ? 'Percorso: listino → buy order a destinazione. Tocca per listino → sell listino.'
                    : 'Percorso: listino → sell listino a destinazione. Tocca per listino → buy order.'
              }
              aria-label={
                flipListMode === 'bm' ? 'Filtra margini alti' : 'Alterna percorso royal buy order / sell listino'
              }
            >
              <IonIcon
                icon={
                  flipListMode === 'bm'
                    ? materialsUnderAvg
                      ? funnel
                      : funnelOutline
                    : royalFlipPath === 'SO'
                      ? pricetagOutline
                      : bagCheckOutline
                }
              />
            </button>
          </div>

          {flipListMode === 'royal' && (
            <p
              className="cp-count"
              style={{ margin: '6px 12px 4px', fontSize: '0.78rem', opacity: 0.78, lineHeight: 1.4 }}
            >
              <strong>Royal Continent:</strong> solo le 6 città royal più Brecilien — <strong>Caerleon esclusa</strong>{' '}
              (usa la lista Caerleon → BM). Compri al <strong>listino minimo</strong> in una città. Il filtro a destra
              alterna solo <strong>listino → buy order</strong> (icona carrello) o solo{' '}
              <strong>listino → sell listino</strong> (icona tag). Buy order: solo tassa mercato; sell listino: tassa +{' '}
              <strong>2,5% setup</strong>. Usa <strong>aggiorna</strong> accanto al globo dopo &quot;Aggiorna Royal
              Continent&quot;.
              {lastRoyalComputedHint && (
                <>
                  {' '}
                  Dati da: <strong>{lastRoyalComputedHint}</strong>
                </>
              )}
            </p>
          )}

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

          {!loading && savedListMode === 'all' && totalElements > 0 && (
            <p className="cp-count">
              {totalElements} opportunità
              {flipListMode === 'royal'
                ? royalFlipPath === 'BO'
                  ? ' — listino → buy order'
                  : ' — listino → sell listino'
                : ''}
            </p>
          )}
          {!loading && savedListMode === 'saved' && flipListMode === 'bm' && (
            <p className="cp-count">{savedItems.length} salvati</p>
          )}
          {!loading && savedListMode === 'saved' && flipListMode === 'royal' && (
            <p className="cp-count">{savedRoyalItems.length} salvati ({royalFlipPath === 'BO' ? 'Buy order' : 'Sell listino'})</p>
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

          {!loading && !error && savedListMode === 'all' && items.length === 0 && (
            <div className="cp-state-container">
              <p>Nessuna opportunità flip trovata.</p>
              {flipListMode === 'bm' ? (
                <p style={{ fontSize: '0.9rem', marginTop: 8 }}>
                  Aggiorna <strong>Royal Continent</strong> e <strong>Black Market</strong> dal menu. Controlla Premium (tassa 4% /
                  8%).
                </p>
              ) : (
                <p style={{ fontSize: '0.9rem', marginTop: 8 }}>
                  Tocca <strong>ricarica</strong> accanto al globo per calcolare le rotte tra le 6 città royal (senza Caerleon), oppure esegui{' '}
                  <strong>Aggiorna Royal Continent</strong> dal menu (ricalcola anche questa lista).
                </p>
              )}
            </div>
          )}

          {!loading && !error && savedListMode === 'saved' && flipListMode === 'bm' && savedItems.length === 0 && (
            <div className="cp-state-container">
              <p>Nessun item salvato.</p>
              <p>Scorri a sinistra su un item in “Tutti” per salvarlo.</p>
            </div>
          )}

          {!loading && !error && savedListMode === 'saved' && flipListMode === 'royal' && savedRoyalItems.length === 0 && (
            <div className="cp-state-container">
              <p>Nessun item Royal salvato.</p>
              <p>Salva dalla lista “Tutti” nel percorso attivo ({royalFlipPath === 'BO' ? 'Buy order' : 'Sell listino'}).</p>
            </div>
          )}

          {!loading && !error && savedListMode === 'saved' && flipListMode === 'bm' && savedItems.length > 0 && (
            <IonList className="cp-list">
              {savedItems.map((s) => {
                const profitShow = s.currentDataMissing ? s.savedProfit : s.currentProfit;
                return (
                  <IonItemSliding key={s.itemId}>
                    <IonItem className="cp-item">
                      <div className="cp-item-left" slot="start">
                        {s.iconUrl && !failedIcons.has(s.itemId) ? (
                          <img
                            src={s.iconUrl}
                            alt=""
                            className="cp-item-icon"
                            loading="lazy"
                            onError={() => setFailedIcons((prev) => new Set(prev).add(s.itemId))}
                          />
                        ) : (
                          <div
                            className="cp-item-icon"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'var(--ion-color-step-150)',
                              fontSize: 10,
                            }}
                          >
                            T{s.tier}
                          </div>
                        )}
                      </div>
                      <IonLabel>
                        <h3 className="cp-item-name">{cleanItemName(s.itemId)}</h3>
                        <div className="cp-meta">
                          <span>T{s.tier}</span>
                          {s.currentDataMissing ? (
                            <span className="cp-rrr"> · Dati al salvataggio</span>
                          ) : (
                            <>
                              <span className="cp-rrr"> · BM ora {formatPrice(s.currentBmBuy)}</span>
                              <span className="cp-rrr"> · Caer ora {formatPrice(s.currentCaerleonSell)}</span>
                            </>
                          )}
                        </div>
                        {!s.currentDataMissing && s.profitDiff !== 0 && (
                          <div className={s.profitDiff > 0 ? 'cp-profit positive' : 'cp-profit negative'}>
                            {s.profitDiff > 0 ? '+' : ''}
                            {formatPrice(s.profitDiff)} vs salvataggio
                          </div>
                        )}
                      </IonLabel>
                      <div slot="end" className="cp-profit-col">
                        <span className={`cp-profit ${profitShow >= 0 ? 'positive' : 'negative'}`}>
                          {profitShow >= 0 ? '+' : ''}
                          {formatPrice(profitShow)}
                        </span>
                      </div>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption color="danger" onClick={() => void toggleSaveFlip(s.itemId)}>
                        <IonIcon icon={trashOutline} slot="start" />
                        Rimuovi
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                );
              })}
            </IonList>
          )}

          {!loading && !error && savedListMode === 'saved' && flipListMode === 'royal' && savedRoyalItems.length > 0 && (
            <IonList className="cp-list">
              {savedRoyalItems.map((s) => {
                const profitShow = s.currentDataMissing ? s.savedProfit : s.currentProfit;
                return (
                  <IonItemSliding key={s.itemId}>
                    <IonItem className="cp-item">
                      <div className="cp-item-left" slot="start">
                        {s.iconUrl && !failedIcons.has(s.itemId) ? (
                          <img
                            src={s.iconUrl}
                            alt=""
                            className="cp-item-icon"
                            loading="lazy"
                            onError={() => setFailedIcons((prev) => new Set(prev).add(s.itemId))}
                          />
                        ) : (
                          <div
                            className="cp-item-icon"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'var(--ion-color-step-150)',
                              fontSize: 10,
                            }}
                          >
                            T{s.tier}
                          </div>
                        )}
                      </div>
                      <IonLabel>
                        <h3 className="cp-item-name">{cleanItemName(s.itemId)}</h3>
                        <div className="cp-meta">
                          <span>T{s.tier}</span>
                          <span className="cp-rrr"> · {s.path === 'BO' ? 'Buy order' : 'Sell listino'}</span>
                          {s.currentDataMissing ? (
                            <span className="cp-rrr"> · Dati al salvataggio</span>
                          ) : (
                            <>
                              <span className="cp-rrr"> · {s.currentBuyCity} → {s.currentSellCity}</span>
                              <span className="cp-rrr"> · Netto {formatPrice(s.currentRevenueNet)}</span>
                            </>
                          )}
                        </div>
                        {!s.currentDataMissing && s.profitDiff !== 0 && (
                          <div className={s.profitDiff > 0 ? 'cp-profit positive' : 'cp-profit negative'}>
                            {s.profitDiff > 0 ? '+' : ''}
                            {formatPrice(s.profitDiff)} vs salvataggio
                          </div>
                        )}
                      </IonLabel>
                      <div slot="end" className="cp-profit-col">
                        <span className={`cp-profit ${profitShow >= 0 ? 'positive' : 'negative'}`}>
                          {profitShow >= 0 ? '+' : ''}
                          {formatPrice(profitShow)}
                        </span>
                      </div>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption color="danger" onClick={() => void toggleSaveFlip(s.itemId)}>
                        <IonIcon icon={trashOutline} slot="start" />
                        Rimuovi
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                );
              })}
            </IonList>
          )}

          {!loading && !error && savedListMode === 'all' && items.length > 0 && (
            <>
              <IonList className="cp-list">
                {items.map((item) => {
                  if (!isRoyalRow(item)) {
                    const isSaved = savedItemIds.has(item.itemId);
                    return (
                      <IonItemSliding key={item.itemId}>
                        <IonItem className="cp-item">
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
                                <div
                                  className={`cp-item-icon ${expandedIcon === item.itemId ? 'expanded' : ''}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--ion-color-step-150)',
                                    fontSize: 10,
                                  }}
                                >
                                  T{item.tier}
                                </div>
                              )}
                            </button>
                          </div>
                          <IonLabel>
                            <h3 className="cp-item-name">
                              {cleanItemName(item.itemId)} {isSaved && <span className="cp-saved-badge">Salvato</span>}
                            </h3>
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
                        <IonItemOptions side="end">
                          <IonItemOption
                            color={isSaved ? 'danger' : 'success'}
                            onClick={() => void toggleSaveFlip(item.itemId)}
                          >
                            <IonIcon icon={isSaved ? trashOutline : bookmarkOutline} slot="start" />
                            {isSaved ? 'Rimuovi' : 'Salva'}
                          </IonItemOption>
                        </IonItemOptions>
                      </IonItemSliding>
                    );
                  }
                  const r = item;
                  const isSavedRoyal = savedRoyalItemIds.has(r.itemId);
                  const royalBo = royalFlipPath === 'BO';
                  const boLine =
                    royalBo && r.boProfit > 0 && r.boBuyCity && r.boSellCity ? (
                      <div className="cp-resources" style={{ marginTop: 6 }}>
                        <span className="cp-res-price cp-res-price--equal" style={{ fontWeight: 600 }}>
                          Buy order
                        </span>
                        <span className="cp-res-sep">:</span>
                        <span>
                          {r.boBuyCity} {formatPrice(r.boCost)} → {r.boSellCity} BO {formatPrice(r.boDestBuyOrderMax)}
                        </span>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 2 }}>
                          Netto {formatPrice(r.boRevenueNet)} · +{formatPrice(r.boProfit)} (
                          {r.boProfitPercentage.toFixed(1)}%)
                        </div>
                      </div>
                    ) : null;
                  const soLine =
                    !royalBo && r.soProfit > 0 && r.soBuyCity && r.soSellCity ? (
                      <div className="cp-resources" style={{ marginTop: 6 }}>
                        <span className="cp-res-price cp-res-price--equal" style={{ fontWeight: 600 }}>
                          Sell listino
                        </span>
                        <span className="cp-res-sep">:</span>
                        <span>
                          {r.soBuyCity} {formatPrice(r.soCost)} → {r.soSellCity} min {formatPrice(r.soDestSellMin)}
                        </span>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 2 }}>
                          Netto {formatPrice(r.soRevenueNet)} · +{formatPrice(r.soProfit)} (
                          {r.soProfitPercentage.toFixed(1)}%)
                        </div>
                      </div>
                    ) : null;
                  return (
                    <IonItemSliding key={r.itemId}>
                    <IonItem className="cp-item">
                      <div className="cp-item-left" slot="start">
                        <button
                          type="button"
                          className="cp-icon-btn"
                          onClick={() =>
                            setExpandedIcon(expandedIcon === r.itemId ? null : r.itemId)
                          }
                        >
                          {r.iconUrl && !failedIcons.has(r.itemId) ? (
                            <img
                              src={r.iconUrl}
                              alt=""
                              className={`cp-item-icon ${expandedIcon === r.itemId ? 'expanded' : ''}`}
                              loading="lazy"
                              onError={() =>
                                setFailedIcons((prev) => new Set(prev).add(r.itemId))
                              }
                            />
                          ) : (
                            <div
                              className={`cp-item-icon ${expandedIcon === r.itemId ? 'expanded' : ''}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--ion-color-step-150)',
                                fontSize: 10,
                              }}
                            >
                              T{r.tier}
                            </div>
                          )}
                        </button>
                      </div>
                      <IonLabel>
                        <h3 className="cp-item-name">
                          {cleanItemName(r.itemId)} {isSavedRoyal && <span className="cp-saved-badge">Salvato</span>}
                        </h3>
                        <div className="cp-meta">
                          <span>T{r.tier}</span>
                          {r.enchantment > 0 && <span> .{r.enchantment}</span>}
                          <span> · {r.category}</span>
                        </div>
                        {boLine}
                        {soLine}
                        <div style={{ fontSize: '0.72rem', opacity: 0.65, marginTop: 4 }}>
                          {royalBo
                            ? `Ricavo: solo tassa mercato ${r.taxPercentApplied}% (nessun setup 2,5%).`
                            : `Ricavo: tassa ${r.taxPercentApplied}% + setup listino 2,5% (come Focus).`}
                        </div>
                      </IonLabel>
                      <div slot="end" className="cp-profit-col">
                        <span className="cp-profit positive" title="Profitto sul percorso selezionato">
                          +
                          {formatPrice(royalBo ? r.boProfit : r.soProfit)}
                        </span>
                        <span className="cp-bm-price" title="Rendimento % sul costo listino (origine)">
                          +{(royalBo ? r.boProfitPercentage : r.soProfitPercentage).toFixed(1)}%
                        </span>
                      </div>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption
                        color={isSavedRoyal ? 'danger' : 'success'}
                        onClick={() => void toggleSaveFlip(r.itemId)}
                      >
                        <IonIcon icon={isSavedRoyal ? trashOutline : bookmarkOutline} slot="start" />
                        {isSavedRoyal ? 'Rimuovi' : 'Salva'}
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
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FlipPage;
