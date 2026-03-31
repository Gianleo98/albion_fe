import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
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
import {
  arrowDownOutline,
  arrowUpOutline,
  searchOutline,
  bookmarkOutline,
  trashOutline,
  listOutline,
  pricetagOutline,
  pricetag,
} from 'ionicons/icons';
import {
  getEnchantingProfits,
  getEnchantingProfitByItemId,
  getEnchantingProfitSortOptions,
  getSavedEnchantingKeys,
  enchantingSavedCompositeKey,
  saveEnchantingItem,
  deleteSavedEnchantingItem,
  getSavedEnchantingItemsWithCurrent,
  getSavedEnchantingItemDetail,
  patchSavedEnchantingTracking,
} from '../services/api';
import type {
  AvailabilityLevelCode,
  EnchantingProfitResponse,
  RoyalCityEnchantBuyProfit,
  SavedEnchantingItemResponse,
  SortOption,
} from '../types';
import AppHeader from '../components/AppHeader';
import { StockAvailabilityIcon } from '../components/StockAvailabilityIcon';
import './CraftingPage.css';

const formatPrice = (price: number) => (price > 0 ? price.toLocaleString('it-IT') : '—');

/** Medie sui prezzi della lista corrente (per tier; se meno di 2 campioni nel tier → media globale). */
type EnchantMetricAvgs = {
  byTier: Record<number, number>;
  tierN: Record<number, number>;
  global: number;
};

const computeEnchantMetricAvgs = (
  items: EnchantingProfitResponse[],
  pick: (i: EnchantingProfitResponse) => number,
): EnchantMetricAvgs => {
  const sums: Record<number, { sum: number; n: number }> = {};
  const all: number[] = [];
  for (const i of items) {
    const v = pick(i);
    if (!Number.isFinite(v) || v <= 0) continue;
    all.push(v);
    const t = i.tier;
    if (!sums[t]) sums[t] = { sum: 0, n: 0 };
    sums[t].sum += v;
    sums[t].n += 1;
  }
  const byTier: Record<number, number> = {};
  const tierN: Record<number, number> = {};
  for (const [t, { sum, n }] of Object.entries(sums)) {
    const tn = Number(t);
    byTier[tn] = sum / n;
    tierN[tn] = n;
  }
  const global = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
  return { byTier, tierN, global };
};

const enchantRefAvg = (avg: EnchantMetricAvgs, tier: number): number => {
  const n = avg.tierN[tier] ?? 0;
  const v = avg.byTier[tier];
  if (n >= 2 && v > 0) return v;
  return avg.global;
};

/** Come Home: verde sotto la media, rosso sopra (listino vs media lista). */
const priceVsAvgClass = (sell: number, refAvg: number): string => {
  if (sell <= 0 || refAvg <= 0) return 'cp-price-vs-avg--neutral';
  if (sell < refAvg) return 'cp-price-vs-avg--below';
  if (sell > refAvg) return 'cp-price-vs-avg--above';
  return 'cp-price-vs-avg--neutral';
};

type EnchantListPriceAvgs = {
  sell0: EnchantMetricAvgs;
  sell1: EnchantMetricAvgs;
  sell2: EnchantMetricAvgs;
  sell3: EnchantMetricAvgs;
  rune: EnchantMetricAvgs;
  soul: EnchantMetricAvgs;
  relic: EnchantMetricAvgs;
};

const buildEnchantListPriceAvgs = (items: EnchantingProfitResponse[]): EnchantListPriceAvgs => ({
  sell0: computeEnchantMetricAvgs(items, (i) => i.sellPrice0),
  sell1: computeEnchantMetricAvgs(items, (i) => i.sellPrice1),
  sell2: computeEnchantMetricAvgs(items, (i) => i.sellPrice2),
  sell3: computeEnchantMetricAvgs(items, (i) => i.sellPrice3),
  rune: computeEnchantMetricAvgs(items, (i) => i.runeUnitPrice),
  soul: computeEnchantMetricAvgs(items, (i) => i.soulUnitPrice),
  relic: computeEnchantMetricAvgs(items, (i) => i.relicUnitPrice),
});

const matAvgForMaterialRow = (avgs: EnchantListPriceAvgs, materialItemId: string): EnchantMetricAvgs => {
  if (materialItemId.includes('_RUNE')) return avgs.rune;
  if (materialItemId.includes('_SOUL')) return avgs.soul;
  return avgs.relic;
};

const formatProfitWithSign = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(Math.round(n)).toLocaleString('it-IT');
  return n < 0 ? `-${abs}` : `+${abs}`;
};

const cleanItemName = (itemId: string): string => {
  let name = itemId;
  if (name.length > 3 && /^T\d_/.test(name)) name = name.substring(3);
  const atEnchant = name.indexOf('@');
  if (atEnchant >= 0) name = name.substring(0, atEnchant);
  name = name.replace(/^2H_/, '').replace(/^MAIN_/, '').replace(/^OFF_/, '');
  return name.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
};

type ListMode = 'all' | 'saved';

const AVAIL_OPTIONS: { value: AvailabilityLevelCode; label: string }[] = [
  { value: 'NONE', label: 'Non impostato' },
  { value: 'LOW', label: 'Basso' },
  { value: 'MEDIUM', label: 'Medio' },
  { value: 'HIGH', label: 'Alto' },
];

const pathCodeLabel = (code: string): string =>
  ({ FROM_0: 'Da .0', FROM_1: 'Da .1', FROM_2: 'Da .2', BUY_3: 'Compra .3' } as Record<string, string>)[code] ?? code;

/** .1 / .2 / .3 = prodotto finale enchant su cui calcoli ricavo − costo min (vendita .1, .2 o .3). */
type ProfitPathView = '1' | '2' | '3';

const pathViewSellProfit = (item: EnchantingProfitResponse, pv: ProfitPathView): number | null => {
  if (pv === '1') return item.profitFinalEnchant1 ?? null;
  if (pv === '2') return item.profitFinalEnchant2 ?? null;
  return item.bestProfit;
};

const pathViewRoyalBuyRank = (item: EnchantingProfitResponse, pv: ProfitPathView): RoyalCityEnchantBuyProfit[] => {
  if (pv === '1') return item.royalBuyOrderRankFinal1 ?? [];
  if (pv === '2') return item.royalBuyOrderRankFinal2 ?? [];
  return item.royalBuyOrderRank ?? [];
};

const pathViewBestBuyOrder = (item: EnchantingProfitResponse, pv: ProfitPathView): number | null | undefined => {
  if (pv === '1') return item.bestProfitBuyOrderFinal1;
  if (pv === '2') return item.bestProfitBuyOrderFinal2;
  return item.bestProfitBuyOrder;
};

const pathViewBestBuyCity = (item: EnchantingProfitResponse, pv: ProfitPathView): string | null | undefined => {
  if (pv === '1') return item.bestProfitBuyOrderCityItFinal1;
  if (pv === '2') return item.bestProfitBuyOrderCityItFinal2;
  return item.bestProfitBuyOrderCityIt;
};

const formatProfitMaybe = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? '—' : formatProfitWithSign(n);

const base0CostSourceExplain = (src: string | undefined): string => {
  switch (src) {
    case 'BUY':
      return 'Nel totale sotto entra il prezzo mercato (minimo tra mercato e craft).';
    case 'CRAFT':
      return 'Nel totale sotto entra il costo craft (minimo tra mercato e craft).';
    case 'EQUAL':
      return 'Mercato e craft coincidono; nel totale è usato il listino mercato.';
    case 'BUY_ONLY':
      return 'Solo listino mercato (stima craft non disponibile o materiali mancanti).';
    default:
      return '';
  }
};

const matLineTotal = (count: number, unit: number): number | null =>
  count > 0 && unit > 0 ? count * unit : null;

const formatMatLine = (count: number, unit: number): string => {
  const tot = matLineTotal(count, unit);
  if (tot == null) return unit > 0 ? `${count} × ${formatPrice(unit)} → —` : `${count} × —`;
  return `${count.toLocaleString('it-IT')} × ${formatPrice(unit)} = ${formatPrice(tot)}`;
};

const ALBION_ITEM_ICON_BASE = 'https://render.albiononline.com/v1/item/';

const albionItemIconUrl = (itemId: string) => `${ALBION_ITEM_ICON_BASE}${itemId}.png`;

/** Id completo item base su mercato (es. T5_MAIN_SWORD, T5_MAIN_SWORD@1). */
const enchantBaseFullItemId = (tier: number, baseItemId: string, enchant: 0 | 1 | 2): string => {
  const p = `T${tier}_${baseItemId}`;
  return enchant === 0 ? p : `${p}@${enchant}`;
};

const listItemIconUrl = (item: EnchantingProfitResponse, pv: ProfitPathView): string => {
  if (pv === '1') return albionItemIconUrl(enchantBaseFullItemId(item.tier, item.baseItemId, 1));
  if (pv === '2') return albionItemIconUrl(enchantBaseFullItemId(item.tier, item.baseItemId, 2));
  return item.iconUrl;
};

const BreakdownLabelWithIcon: React.FC<{ itemId: string; text: string }> = ({ itemId, text }) => (
  <span className="cp-enchant-breakdown__label-with-icon">
    <img
      src={albionItemIconUrl(itemId)}
      alt=""
      className="cp-enchant-breakdown__icon"
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
    <span className="cp-enchant-breakdown__label-text" title={itemId}>
      {text}
    </span>
  </span>
);

const EnchantPathCostBreakdown: React.FC<{
  item: EnchantingProfitResponse;
  priceAvgs: EnchantListPriceAvgs;
  profitPathView: ProfitPathView;
}> = ({ item, priceAvgs, profitPathView }) => {
  const q = item.enchantMaterialQuantity;
  const tier = item.tier;
  const t = tier;
  const base0FullId = enchantBaseFullItemId(item.tier, item.baseItemId, 0);
  const ref0 = enchantRefAvg(priceAvgs.sell0, tier);

  const base0CraftBlock = (
    <>
      <div className="cp-enchant-breakdown__row">
        <span className="cp-enchant-breakdown__label">
          <BreakdownLabelWithIcon itemId={base0FullId} text="Base .0 — mercato (Lymhurst, sell min)" />
        </span>
        <span
          className={`cp-enchant-breakdown__val ${
            item.sellPrice0 > 0 ? priceVsAvgClass(item.sellPrice0, ref0) : 'cp-price-vs-avg--neutral'
          }`}
        >
          {item.sellPrice0 > 0 ? formatPrice(item.sellPrice0) : '—'}
        </span>
      </div>
      {item.craftCostBase0 != null && item.craftCostBase0 > 0 && (
        <div className="cp-enchant-breakdown__row">
          <span className="cp-enchant-breakdown__label">
            <span
              className="cp-enchant-breakdown__label-text"
              title="Stima come pagina Crafting (Lymhurst sell min + RRR)"
            >
              Base .0 — craft (stima)
            </span>
          </span>
          <span className="cp-enchant-breakdown__val cp-price-vs-avg--neutral">
            {formatPrice(item.craftCostBase0)}
          </span>
        </div>
      )}
      {item.base0CostSource && base0CostSourceExplain(item.base0CostSource) && (
        <p className="cp-enchant-breakdown__sub" style={{ margin: '4px 0 0' }}>
          {base0CostSourceExplain(item.base0CostSource)}
          {item.base0UsedInCost > 0 && (
            <>
              {' '}
              Base conteggiata: <strong>{formatPrice(item.base0UsedInCost)}</strong>.
            </>
          )}
        </p>
      )}
    </>
  );

  const matSection = (
    rows: { itemId: string; label: string; count: number; unit: number }[],
    totalLabel: string,
    totalValue: number | null | undefined
  ) => {
    const materialsSum = rows.reduce((acc, row) => acc + (matLineTotal(row.count, row.unit) ?? 0), 0);
    const hasAllMatPriced = rows.every((row) => row.unit > 0);
    return (
      <>
        <div className="cp-enchant-breakdown__title" style={{ marginTop: 8 }}>
          Materiali enchant — acquisto Lymhurst (sell min)
        </div>
        {rows.map((row) => {
          const matAvg = matAvgForMaterialRow(priceAvgs, row.itemId);
          const refMat = enchantRefAvg(matAvg, tier);
          return (
            <div key={row.itemId} className="cp-enchant-breakdown__row">
              <span className="cp-enchant-breakdown__label">
                <BreakdownLabelWithIcon itemId={row.itemId} text={row.label} />
              </span>
              <span className={`cp-enchant-breakdown__val ${priceVsAvgClass(row.unit, refMat)}`}>
                {formatMatLine(row.count, row.unit)}
              </span>
            </div>
          );
        })}
        <div className="cp-enchant-breakdown__row">
          <span className="cp-enchant-breakdown__label">Totale materiali</span>
          <span className="cp-enchant-breakdown__val">
            {hasAllMatPriced ? formatPrice(materialsSum) : '—'}
          </span>
        </div>
        <div className="cp-enchant-breakdown__row cp-enchant-breakdown__row--sum">
          <span className="cp-enchant-breakdown__label">{totalLabel}</span>
          <span className="cp-enchant-breakdown__val">
            {totalValue != null && totalValue > 0 ? formatPrice(totalValue) : '—'}
          </span>
        </div>
      </>
    );
  };

  if (profitPathView === '1') {
    const ref1 = enchantRefAvg(priceAvgs.sell1, tier);
    if (item.bestPathFinal1 === 'BUY_1') {
      return (
        <div className="cp-enchant-breakdown">
          <div className="cp-enchant-breakdown__title">Costo per ottenere .1 — prodotto finale</div>
          <div className="cp-enchant-breakdown__row">
            <span className="cp-enchant-breakdown__label">Acquisto .1 (Lymhurst, sell min)</span>
            <span className={`cp-enchant-breakdown__val ${priceVsAvgClass(item.sellPrice1, ref1)}`}>
              {formatPrice(item.sellPrice1)}
            </span>
          </div>
          <div className="cp-enchant-breakdown__row cp-enchant-breakdown__row--sum">
            <span className="cp-enchant-breakdown__label">Totale costo</span>
            <span className="cp-enchant-breakdown__val">
              {item.costMinFinal1 != null && item.costMinFinal1 > 0 ? formatPrice(item.costMinFinal1) : '—'}
            </span>
          </div>
        </div>
      );
    }
    if (item.bestPathFinal1 === 'FROM_0') {
      return (
        <div className="cp-enchant-breakdown">
          <div className="cp-enchant-breakdown__title">Costo per ottenere .1 — {item.bestPathFinal1LabelIt}</div>
          {base0CraftBlock}
          {matSection(
            [{ itemId: `T${t}_RUNE`, label: 'Rune (0→1)', count: q, unit: item.runeUnitPrice }],
            'Base + materiali (tot.)',
            item.costMinFinal1
          )}
        </div>
      );
    }
    return (
      <div className="cp-enchant-breakdown">
        <p className="cp-enchant-breakdown__sub">Costo verso .1 non calcolabile (prezzi mancanti).</p>
      </div>
    );
  }

  if (profitPathView === '2') {
    const ref1b = enchantRefAvg(priceAvgs.sell1, tier);
    const ref2 = enchantRefAvg(priceAvgs.sell2, tier);
    const id1 = enchantBaseFullItemId(item.tier, item.baseItemId, 1);
    if (item.bestPathFinal2 === 'BUY_2') {
      return (
        <div className="cp-enchant-breakdown">
          <div className="cp-enchant-breakdown__title">Costo per ottenere .2 — prodotto finale</div>
          <div className="cp-enchant-breakdown__row">
            <span className="cp-enchant-breakdown__label">Acquisto .2 (Lymhurst, sell min)</span>
            <span className={`cp-enchant-breakdown__val ${priceVsAvgClass(item.sellPrice2, ref2)}`}>
              {formatPrice(item.sellPrice2)}
            </span>
          </div>
          <div className="cp-enchant-breakdown__row cp-enchant-breakdown__row--sum">
            <span className="cp-enchant-breakdown__label">Totale costo</span>
            <span className="cp-enchant-breakdown__val">
              {item.costMinFinal2 != null && item.costMinFinal2 > 0 ? formatPrice(item.costMinFinal2) : '—'}
            </span>
          </div>
        </div>
      );
    }
    if (item.bestPathFinal2 === 'FROM_1') {
      return (
        <div className="cp-enchant-breakdown">
          <div className="cp-enchant-breakdown__title">Costo per ottenere .2 — {item.bestPathFinal2LabelIt}</div>
          <div className="cp-enchant-breakdown__row">
            <span className="cp-enchant-breakdown__label">
              <BreakdownLabelWithIcon itemId={id1} text="Base .1 — acquisto Lymhurst (sell min)" />
            </span>
            <span
              className={`cp-enchant-breakdown__val ${
                item.sellPrice1 > 0 ? priceVsAvgClass(item.sellPrice1, ref1b) : 'cp-price-vs-avg--neutral'
              }`}
            >
              {item.sellPrice1 > 0 ? formatPrice(item.sellPrice1) : '—'}
            </span>
          </div>
          {matSection(
            [{ itemId: `T${t}_SOUL`, label: 'Soul (1→2)', count: q, unit: item.soulUnitPrice }],
            'Base + materiali (tot.)',
            item.costMinFinal2
          )}
        </div>
      );
    }
    if (item.bestPathFinal2 === 'FROM_0') {
      return (
        <div className="cp-enchant-breakdown">
          <div className="cp-enchant-breakdown__title">Costo per ottenere .2 — {item.bestPathFinal2LabelIt}</div>
          {base0CraftBlock}
          {matSection(
            [
              { itemId: `T${t}_RUNE`, label: 'Rune (0→1)', count: q, unit: item.runeUnitPrice },
              { itemId: `T${t}_SOUL`, label: 'Soul (1→2)', count: q, unit: item.soulUnitPrice },
            ],
            'Base + materiali (tot.)',
            item.costMinFinal2
          )}
        </div>
      );
    }
    return (
      <div className="cp-enchant-breakdown">
        <p className="cp-enchant-breakdown__sub">Costo verso .2 non calcolabile (prezzi mancanti).</p>
      </div>
    );
  }

  const path = item.bestPath;
  if (path === 'BUY_3') {
    const ref3 = enchantRefAvg(priceAvgs.sell3, tier);
    return (
      <div className="cp-enchant-breakdown">
        <div className="cp-enchant-breakdown__title">Costo percorso migliore</div>
        <div className="cp-enchant-breakdown__row">
          <span className="cp-enchant-breakdown__label">Acquisto .3 (Lymhurst, sell min)</span>
          <span className={`cp-enchant-breakdown__val ${priceVsAvgClass(item.sellPrice3, ref3)}`}>
            {formatPrice(item.sellPrice3)}
          </span>
        </div>
        <p className="cp-enchant-breakdown__sub" style={{ margin: '6px 0 0' }}>
          Nessun craft: conviene comprare già enchantato.
        </p>
      </div>
    );
  }

  const baseEnchant: 0 | 1 | 2 = path === 'FROM_0' ? 0 : path === 'FROM_1' ? 1 : 2;
  const baseFullId = enchantBaseFullItemId(item.tier, item.baseItemId, baseEnchant);
  const base =
    path === 'FROM_0'
      ? {
          label: `Base .0 — acquisto Lymhurst (sell min)`,
          itemId: baseFullId,
          price: item.sellPrice0,
          totalCost: item.costFrom0,
        }
      : path === 'FROM_1'
        ? {
            label: `Base .1 — acquisto Lymhurst (sell min)`,
            itemId: baseFullId,
            price: item.sellPrice1,
            totalCost: item.costFrom1,
          }
        : {
            label: `Base .2 — acquisto Lymhurst (sell min)`,
            itemId: baseFullId,
            price: item.sellPrice2,
            totalCost: item.costFrom2,
          };

  const from0WithCraftCompare = path === 'FROM_0';
  const matRows: { itemId: string; label: string; count: number; unit: number }[] =
    path === 'FROM_0'
      ? [
          { itemId: `T${t}_RUNE`, label: 'Rune', count: q, unit: item.runeUnitPrice },
          { itemId: `T${t}_SOUL`, label: 'Soul', count: q, unit: item.soulUnitPrice },
          { itemId: `T${t}_RELIC`, label: 'Relic', count: q, unit: item.relicUnitPrice },
        ]
      : path === 'FROM_1'
        ? [
            { itemId: `T${t}_SOUL`, label: 'Soul', count: q, unit: item.soulUnitPrice },
            { itemId: `T${t}_RELIC`, label: 'Relic', count: q, unit: item.relicUnitPrice },
          ]
        : [{ itemId: `T${t}_RELIC`, label: 'Relic', count: q, unit: item.relicUnitPrice }];

  const materialsSum = matRows.reduce((acc, row) => {
    const x = matLineTotal(row.count, row.unit);
    return acc + (x ?? 0);
  }, 0);
  const hasAllMatPriced = matRows.every((row) => row.unit > 0);
  const baseOk = base.price > 0;

  const baseAvg =
    path === 'FROM_0' ? priceAvgs.sell0 : path === 'FROM_1' ? priceAvgs.sell1 : priceAvgs.sell2;
  const refBase = enchantRefAvg(baseAvg, tier);

  return (
    <div className="cp-enchant-breakdown">
      <div className="cp-enchant-breakdown__title">Costo percorso migliore verso .3 ({pathCodeLabel(path)})</div>
      {from0WithCraftCompare ? (
        base0CraftBlock
      ) : (
        <div className="cp-enchant-breakdown__row">
          <span className="cp-enchant-breakdown__label">
            <BreakdownLabelWithIcon itemId={base.itemId} text={base.label} />
          </span>
          <span
            className={`cp-enchant-breakdown__val ${
              baseOk ? priceVsAvgClass(base.price, refBase) : 'cp-price-vs-avg--neutral'
            }`}
          >
            {baseOk ? formatPrice(base.price) : '—'}
          </span>
        </div>
      )}
      <div className="cp-enchant-breakdown__title" style={{ marginTop: 8 }}>
        Materiali enchant — acquisto Lymhurst (sell min)
      </div>
      {matRows.map((row) => {
        const matAvg = matAvgForMaterialRow(priceAvgs, row.itemId);
        const refMat = enchantRefAvg(matAvg, tier);
        return (
          <div key={row.itemId} className="cp-enchant-breakdown__row">
            <span className="cp-enchant-breakdown__label">
              <BreakdownLabelWithIcon itemId={row.itemId} text={row.label} />
            </span>
            <span className={`cp-enchant-breakdown__val ${priceVsAvgClass(row.unit, refMat)}`}>
              {formatMatLine(row.count, row.unit)}
            </span>
          </div>
        );
      })}
      <div className="cp-enchant-breakdown__row">
        <span className="cp-enchant-breakdown__label">Totale materiali</span>
        <span className="cp-enchant-breakdown__val">
          {hasAllMatPriced ? formatPrice(materialsSum) : '—'}
        </span>
      </div>
      <div className="cp-enchant-breakdown__row cp-enchant-breakdown__row--sum">
        <span className="cp-enchant-breakdown__label">Base + materiali (tot.)</span>
        <span className="cp-enchant-breakdown__val">
          {base.totalCost != null && base.totalCost > 0 ? formatPrice(base.totalCost) : '—'}
        </span>
      </div>
    </div>
  );
};

const EnchantingPage: React.FC = () => {
  const [items, setItems] = useState<EnchantingProfitResponse[]>([]);
  const [savedItems, setSavedItems] = useState<SavedEnchantingItemResponse[]>([]);
  /** Chiavi composite itemId + finalEnchant (enchantingSavedCompositeKey). */
  const [savedEnchantKeySet, setSavedEnchantKeySet] = useState<Set<string>>(new Set());
  const [listMode, setListMode] = useState<ListMode>('all');
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [sortBy, setSortBy] = useState('BEST_PROFIT');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [profitPathView, setProfitPathView] = useState<ProfitPathView>('3');
  const [saveAlertItem, setSaveAlertItem] = useState<{
    itemId: string;
    finalEnchant: number;
    isSaved: boolean;
  } | null>(null);
  const [detailItem, setDetailItem] = useState<SavedEnchantingItemResponse | null>(null);
  const [detailBasicItem, setDetailBasicItem] = useState<EnchantingProfitResponse | null>(null);
  const [trListed, setTrListed] = useState(false);
  const [trSell, setTrSell] = useState<AvailabilityLevelCode>('NONE');
  const [trStock, setTrStock] = useState<AvailabilityLevelCode>('NONE');
  const [trackSaving, setTrackSaving] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef = useRef(false);
  const skipPathViewEffectRef = useRef(true);
  const slidingRefs = useRef<Record<string, HTMLIonItemSlidingElement | null>>({});
  const [presentToast] = useIonToast();

  const enchantPriceAvgs = useMemo(() => buildEnchantListPriceAvgs(items), [items]);

  const filteredSavedItems = useMemo(
    () => savedItems.filter((s) => Number(s.finalEnchant ?? 3) === Number(profitPathView)),
    [savedItems, profitPathView]
  );

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
    void fetchItems(0, true);
  }, [nameSearch]);

  const fetchItems = useCallback(
    async (
      pageNum: number = 0,
      reset: boolean = false,
      sortByOverride?: string,
      sortDirectionOverride?: 'ASC' | 'DESC'
    ) => {
      const sort = sortByOverride ?? sortBy;
      const direction = sortDirectionOverride ?? sortDirection;
      const pv = Number(profitPathView) as 1 | 2 | 3;
      try {
        const data = await getEnchantingProfits(pageNum, 20, sort, direction, nameSearch || undefined, pv);
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
        if (reset) setError('Impossibile caricare i dati Enchanting.');
      } finally {
        setLoading(false);
      }
    },
    [sortBy, sortDirection, nameSearch, profitPathView]
  );

  useEffect(() => {
    if (skipPathViewEffectRef.current) {
      skipPathViewEffectRef.current = false;
      return;
    }
    if (listMode !== 'all') return;
    setLoading(true);
    void fetchItems(0, true);
  }, [profitPathView, listMode, fetchItems]);

  const fetchSavedKeys = useCallback(async () => {
    try {
      const keys = await getSavedEnchantingKeys();
      setSavedEnchantKeySet(
        new Set(keys.map((k) => enchantingSavedCompositeKey(k.itemId, k.finalEnchant)))
      );
    } catch {
      /* ignore */
    }
  }, []);

  const fetchSavedList = useCallback(async () => {
    try {
      const list = await getSavedEnchantingItemsWithCurrent();
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
      const optionsData = await getEnchantingProfitSortOptions();
      setSortOptions(optionsData);
      await fetchSavedKeys();
    } catch {
      /* ignore */
    }
    await fetchItems(0, true);
  };

  useIonViewWillEnter(() => {
    void fetchInitial();
  });

  useEffect(() => {
    if (listMode === 'saved') {
      setLoading(true);
      void fetchSavedList();
    }
  }, [listMode, fetchSavedList]);

  useEffect(() => {
    if (detailItem) {
      setTrListed(!!detailItem.listedForSale);
      setTrSell((detailItem.sellAvailability as AvailabilityLevelCode) || 'NONE');
      setTrStock((detailItem.stockAvailability as AvailabilityLevelCode) || 'NONE');
    }
  }, [
    detailItem?.itemId,
    detailItem?.finalEnchant,
    detailItem?.listedForSale,
    detailItem?.sellAvailability,
    detailItem?.stockAvailability,
  ]);

  const openSaveAlert = (itemId: string, finalEnchant: number, isSaved: boolean) => {
    setSaveAlertItem({ itemId, finalEnchant, isSaved });
  };

  const handleSaveOrRemoveConfirm = async () => {
    if (!saveAlertItem) return;
    const { itemId, finalEnchant, isSaved } = saveAlertItem;
    const key = enchantingSavedCompositeKey(itemId, finalEnchant);
    try {
      if (isSaved) {
        await deleteSavedEnchantingItem(itemId, finalEnchant);
        setSavedEnchantKeySet((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        if (listMode === 'saved') {
          setSavedItems((prev) =>
            prev.filter((s) => !(s.itemId === itemId && Number(s.finalEnchant ?? 3) === finalEnchant))
          );
        }
        presentToast({ message: 'Rimosso dai salvati.', duration: 2000, color: 'medium', position: 'top' });
      } else {
        await saveEnchantingItem(itemId, finalEnchant as 1 | 2 | 3);
        setSavedEnchantKeySet((prev) => new Set(prev).add(key));
        void fetchSavedList();
        presentToast({ message: 'Aggiunto ai salvati.', duration: 2000, color: 'success', position: 'top' });
      }
    } catch {
      presentToast({ message: 'Operazione fallita.', duration: 2000, color: 'danger', position: 'top' });
    } finally {
      setSaveAlertItem(null);
      slidingRefs.current[itemId]?.close();
    }
  };

  const openDetail = async (s: SavedEnchantingItemResponse) => {
    if (listMode !== 'saved') return;
    const fe = Number(s.finalEnchant ?? 3) as 1 | 2 | 3;
    setProfitPathView(String(fe) as ProfitPathView);
    const [detail, curr] = await Promise.all([
      getSavedEnchantingItemDetail(s.itemId, fe),
      getEnchantingProfitByItemId(s.itemId),
    ]);
    if (detail) {
      setDetailItem(detail);
      setDetailBasicItem(curr);
    }
  };

  const openEnchantDetailForItem = async (item: EnchantingProfitResponse) => {
    const fe = Number(profitPathView) as 1 | 2 | 3;
    const key = enchantingSavedCompositeKey(item.itemId, fe);
    if (savedEnchantKeySet.has(key)) {
      const detail = await getSavedEnchantingItemDetail(item.itemId, fe);
      if (detail) {
        setDetailItem(detail);
        setDetailBasicItem(item);
        return;
      }
    }

    setDetailBasicItem(item);
    setDetailItem(null);
  };

  const saveEnchantingTracking = async () => {
    if (!detailItem) return;
    setTrackSaving(true);
    try {
      const updated = await patchSavedEnchantingTracking(
        detailItem.itemId,
        Number(detailItem.finalEnchant ?? 3),
        {
          listedForSale: trListed,
          sellAvailability: trSell,
          stockAvailability: trStock,
        }
      );
      setDetailItem(updated);
      await fetchSavedList();
      presentToast({ message: 'Note salvate.', duration: 2000, color: 'success', position: 'top' });
    } catch {
      presentToast({ message: 'Salvataggio fallito.', duration: 2000, color: 'danger', position: 'top' });
    } finally {
      setTrackSaving(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    setError(null);
    await fetchSavedKeys();
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
    void fetchItems(0, true, newSortBy, sortDirection);
  };

  const handleSortDirectionToggle = () => {
    const next = sortDirection === 'DESC' ? 'ASC' : 'DESC';
    setSortDirection(next);
    setLoading(true);
    void fetchItems(0, true, sortBy, next);
  };

  return (
    <IonPage>
      <AppHeader
        onEnchantingUpdated={() => {
          void fetchItems(0, true);
          void fetchSavedList();
          void fetchSavedKeys();
        }}
      />
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
            <IonSegmentButton value="saved" title="Salvati">
              <IonIcon icon={bookmarkOutline} />
            </IonSegmentButton>
          </IonSegment>

          {(listMode === 'all' || listMode === 'saved') && (
            <IonSegment
              value={profitPathView}
              onIonChange={(e) => {
                const v = e.detail.value;
                if (v === '1' || v === '2' || v === '3') setProfitPathView(v);
              }}
              className="cp-segment"
              style={{ margin: '0 0 8px' }}
            >
              <IonSegmentButton value="1" title="Prodotto finale .1: profitto vendendo l’item @1">
                <IonLabel>.1</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="2" title="Prodotto finale .2: profitto vendendo l’item @2">
                <IonLabel>.2</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="3" title="Prodotto finale .3: profitto vendendo l’item @3 (percorso costo min)">
                <IonLabel>.3</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          )}

          {listMode === 'all' && (
            <>
              <div className="cp-search-row">
                <IonItem className="cp-search-item" lines="none">
                  <IonIcon icon={searchOutline} slot="start" />
                  <IonInput
                    value={searchInput}
                    onIonInput={(e) => setSearchInput(e.detail.value ?? '')}
                    placeholder="Cerca per nome o ID..."
                  />
                </IonItem>
              </div>

              <div className="cp-toolbar">
                {sortOptions.length > 0 && (
                  <IonItem className="cp-sort-selector" lines="none">
                    <IonLabel>Ordina per</IonLabel>
                    <IonSelect
                      value={sortBy}
                      onIonChange={(e) => handleSortChange(e.detail.value as string)}
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

              <p className="cp-count" style={{ padding: '0 16px', fontSize: '0.85rem', opacity: 0.85 }}>
                <strong>.1 / .2 / .3</strong> = <strong>prodotto finale</strong> enchant: il profitto è ricavo (sell min
                Lymhurst su quell’item @1, @2 o @3) meno il costo minimo per <strong>ottenere quel livello</strong>{' '}
                (compra al livello oppure enchant: Rune 0→1, Soul 1→2, Relic 2→3). La vista <strong>.3</strong> è come
                prima (miglior percorso fino a .3). <strong>Sell order</strong>: tassa + setup 2,5%.{' '}
                <strong>Buy order</strong>: buy max royal sullo stesso item finale. Colori vs <strong>media lista</strong>{' '}
                (tier).
              </p>

              {!loading && totalElements > 0 && <p className="cp-count">{totalElements} item</p>}

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
                  <p>Nessun risultato.</p>
                </div>
              )}

              {!loading && !error && items.length > 0 && (
                <>
                  <IonList className="cp-list">
                    {items
                      .filter((item) => item.iconUrl && !failedIcons.has(item.itemId))
                      .map((item) => {
                        const isSaved = savedEnchantKeySet.has(
                          enchantingSavedCompositeKey(item.itemId, Number(profitPathView))
                        );
                        const refSell1 = enchantRefAvg(enchantPriceAvgs.sell1, item.tier);
                        const refSell2 = enchantRefAvg(enchantPriceAvgs.sell2, item.tier);
                        const refSell3 = enchantRefAvg(enchantPriceAvgs.sell3, item.tier);
                        const sellP = pathViewSellProfit(item, profitPathView);
                        const buyTop = pathViewBestBuyOrder(item, profitPathView);
                        const buyCity = pathViewBestBuyCity(item, profitPathView);
                        const buyRank = pathViewRoyalBuyRank(item, profitPathView);
                        return (
                          <IonItemSliding
                            key={item.itemId}
                            ref={(el) => {
                              slidingRefs.current[item.itemId] = el;
                            }}
                          >
                            <IonItem
                              className="cp-item cp-item--enchant"
                              button
                              onClick={() => void openEnchantDetailForItem(item)}
                            >
                              <div className="cp-item-left" slot="start">
                                <img
                                  src={listItemIconUrl(item, profitPathView)}
                                  alt=""
                                  className="cp-item-icon"
                                  loading="lazy"
                                  onError={() => setFailedIcons((prev) => new Set(prev).add(item.itemId))}
                                />
                              </div>
                              <IonLabel>
                                <h3 className="cp-item-name">
                                  T{item.tier} · {cleanItemName(item.itemId)} · ×{item.enchantMaterialQuantity}
                                </h3>
                                <div className="cp-meta">
                                  <span className="cp-rrr">
                                    {profitPathView === '3' ? (
                                      <>Verso .3: {item.bestPathLabelIt}</>
                                    ) : profitPathView === '1' ? (
                                      <>
                                        Obiettivo <strong>.1</strong> · Costo min: {item.bestPathFinal1LabelIt ?? '—'}
                                      </>
                                    ) : (
                                      <>
                                        Obiettivo <strong>.2</strong> · Costo min: {item.bestPathFinal2LabelIt ?? '—'}
                                      </>
                                    )}
                                  </span>
                                  {profitPathView === '3' &&
                                    item.enchantVersusBuySilver != null &&
                                    item.enchantVersusBuySilver !== 0 && (
                                    <span className="cp-rrr" title="Positivo = enchant più economico dell’acquisto .3">
                                      vs compra .3: {formatProfitWithSign(item.enchantVersusBuySilver)}
                                    </span>
                                  )}
                                  {isSaved && <span className="cp-saved-badge">Salvato</span>}
                                </div>
                              </IonLabel>
                              <div slot="end" className="cp-profit-col cp-profit-col--enchant">
                                <span className="cp-enchant-profit-label">Sell order</span>
                                <span
                                  className={
                                    sellP == null ? 'cp-profit' : `cp-profit ${sellP >= 0 ? 'positive' : 'negative'}`
                                  }
                                >
                                  {formatProfitMaybe(sellP)}
                                </span>
                                <span
                                  className="cp-bm-price"
                                  title="Listino Lymhurst sell min sul prodotto finale; colore vs media lista (tier)"
                                >
                                  {profitPathView === '1' ? (
                                    <>
                                      .1 sell min:{' '}
                                      <span className={priceVsAvgClass(item.sellPrice1, refSell1)}>
                                        {formatPrice(item.sellPrice1)}
                                      </span>
                                    </>
                                  ) : profitPathView === '2' ? (
                                    <>
                                      .2 sell min:{' '}
                                      <span className={priceVsAvgClass(item.sellPrice2, refSell2)}>
                                        {formatPrice(item.sellPrice2)}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      .3 sell min:{' '}
                                      <span className={priceVsAvgClass(item.sellPrice3, refSell3)}>
                                        {formatPrice(item.sellPrice3)}
                                      </span>
                                    </>
                                  )}
                                </span>
                                <span className="cp-enchant-profit-label">Buy order (royal)</span>
                                {buyTop != null ? (
                                  <>
                                    <span
                                      className={`cp-profit ${buyTop >= 0 ? 'positive' : 'negative'}`}
                                      title={
                                        profitPathView === '3'
                                          ? 'Ricavo buy max .3 − costo min verso .3 (Lymhurst)'
                                          : profitPathView === '1'
                                            ? 'Ricavo buy max .1 − costo min verso .1'
                                            : 'Ricavo buy max .2 − costo min verso .2'
                                      }
                                    >
                                      {formatProfitWithSign(buyTop)}
                                    </span>
                                    {buyCity && <span className="cp-bm-price">Miglior: {buyCity}</span>}
                                    {buyRank.length > 0 && (
                                      <ol className="cp-enchant-buy-rank" aria-label="Classifica buy order royal">
                                        {buyRank.map((r) => (
                                          <li
                                            key={r.cityCode}
                                            title={`Buy max: ${formatPrice(r.buyPriceMax3)}`}
                                          >
                                            {r.cityLabelIt}: {formatProfitWithSign(r.profitBuyOrder)}
                                          </li>
                                        ))}
                                      </ol>
                                    )}
                                  </>
                                ) : (
                                  <span className="cp-bm-price">
                                    — (nessun buy order sul prodotto {profitPathView === '1' ? '.1' : profitPathView === '2' ? '.2' : '.3'})
                                  </span>
                                )}
                              </div>
                            </IonItem>
                            <IonItemOptions
                              side="end"
                              onIonSwipe={() => openSaveAlert(item.itemId, Number(profitPathView), isSaved)}
                            >
                              <IonItemOption
                                color={isSaved ? 'danger' : 'success'}
                                onClick={() => openSaveAlert(item.itemId, Number(profitPathView), isSaved)}
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

          {listMode === 'saved' && !loading && savedItems.length > 0 && filteredSavedItems.length > 0 && (
            <IonList className="cp-list">
              {filteredSavedItems.map((s) => {
                const profitShow = s.currentDataMissing ? s.savedBestProfit : s.currentBestProfit;
                const sellNeedsSetup = s.sellAvailability === 'NONE' || !s.sellAvailability;
                const listed = !!s.listedForSale;
                const sellTagTitle = listed
                  ? 'In vendita'
                  : sellNeedsSetup
                    ? 'Vendita: da impostare'
                    : `Non in vendita (${s.sellAvailabilityLabel ?? s.sellAvailability ?? '—'})`;
                return (
                  <IonItemSliding
                    key={enchantingSavedCompositeKey(s.itemId, Number(s.finalEnchant ?? 3))}
                    ref={(el) => {
                      slidingRefs.current[s.itemId] = el;
                    }}
                  >
                    <IonItem className="cp-item" button onClick={() => void openDetail(s)}>
                      <div className="cp-item-left" slot="start">
                        {s.iconUrl ? (
                          <img src={s.iconUrl} alt="" className="cp-item-icon" loading="lazy" />
                        ) : (
                          <div
                            className="cp-item-icon"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
                          >
                            T{s.tier}
                          </div>
                        )}
                      </div>
                      <IonLabel>
                        <h3
                          className="cp-item-name"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
                        >
                          <span title={sellTagTitle} style={{ display: 'inline-flex', lineHeight: 0 }}>
                            <IonIcon
                              icon={listed ? pricetag : pricetagOutline}
                              style={{
                                fontSize: '1.05rem',
                                flexShrink: 0,
                                color: 'var(--ion-color-success-tint, #2dd36f)',
                                opacity: listed ? 1 : 0.72,
                              }}
                              aria-hidden
                            />
                          </span>
                          <span style={{ display: 'inline-flex', lineHeight: 0 }}>
                            <StockAvailabilityIcon
                              variant="titleRow"
                              level={s.stockAvailability}
                              label={s.stockAvailabilityLabel}
                            />
                          </span>
                          {cleanItemName(s.itemId)}
                          <span style={{ opacity: 0.75, fontSize: '0.85em' }}> · .{s.finalEnchant ?? 3}</span>
                        </h3>
                        <div className="cp-meta cp-saved-live-meta">
                          {s.currentDataMissing ? (
                            <span className="cp-rrr">Dati al salvataggio</span>
                          ) : (
                            <>
                              <span className="cp-rrr">
                                Profitto migliore ora: {formatProfitWithSign(s.currentBestProfit)}
                              </span>
                              {s.profitDiff !== 0 && (
                                <span
                                  className={
                                    s.profitDiff >= 0
                                      ? 'cp-saved-profit-vs-save cp-saved-profit-vs-save--up'
                                      : 'cp-saved-profit-vs-save cp-saved-profit-vs-save--down'
                                  }
                                >
                                  vs salvataggio: {formatProfitWithSign(s.profitDiff)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </IonLabel>
                      <div slot="end" className="cp-profit-col">
                        <span className={`cp-profit ${profitShow >= 0 ? 'positive' : 'negative'}`}>
                          {formatProfitWithSign(profitShow)}
                        </span>
                      </div>
                    </IonItem>
                    <IonItemOptions
                      side="end"
                      onIonSwipe={() => openSaveAlert(s.itemId, Number(s.finalEnchant ?? 3), true)}
                    >
                      <IonItemOption
                        color="danger"
                        onClick={() => openSaveAlert(s.itemId, Number(s.finalEnchant ?? 3), true)}
                      >
                        <IonIcon icon={trashOutline} slot="start" />
                        Rimuovi
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                );
              })}
            </IonList>
          )}

          {listMode === 'saved' &&
            !loading &&
            savedItems.length > 0 &&
            filteredSavedItems.length === 0 && (
              <div className="cp-state-container">
                <p>
                  Nessun salvataggio per la vista <strong>.{profitPathView}</strong>. Usa il selettore .1 / .2 / .3
                  sopra, oppure salva dalla lista principale con la vista desiderata.
                </p>
              </div>
            )}

          {listMode === 'saved' && !loading && savedItems.length === 0 && (
            <div className="cp-state-container">
              <p>Nessun item salvato.</p>
            </div>
          )}
        </div>

        <IonAlert
          isOpen={!!saveAlertItem}
          onDidDismiss={() => setSaveAlertItem(null)}
          header={saveAlertItem?.isSaved ? 'Rimuovere?' : 'Salvare?'}
          message={
            saveAlertItem
              ? `${saveAlertItem.itemId}\nVista prodotto finale: .${saveAlertItem.finalEnchant}`
              : undefined
          }
          buttons={[
            { text: 'Annulla', role: 'cancel' },
            {
              text: saveAlertItem?.isSaved ? 'Rimuovi' : 'Salva',
              handler: handleSaveOrRemoveConfirm,
            },
          ]}
        />

        <IonModal
          isOpen={!!detailBasicItem}
          onDidDismiss={() => {
            setDetailBasicItem(null);
            setDetailItem(null);
          }}
          className="cp-detail-modal craft-detail-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{detailBasicItem ? cleanItemName(detailBasicItem.itemId) : ''}</IonTitle>
              <IonButtons slot="end">
                <IonButton
                  onClick={() => {
                    setDetailBasicItem(null);
                    setDetailItem(null);
                  }}
                  fill="clear"
                >
                  Chiudi
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          {detailBasicItem && (
            <IonContent className="ion-padding">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Riepilogo</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{ margin: '4px 0' }}>
                    Prodotto finale:{' '}
                    <strong>
                      {profitPathView === '3' ? '.3' : profitPathView === '1' ? '.1' : '.2'}
                    </strong>{' '}
                    (ricavo listino su quell’item − costo min per ottenerlo)
                  </p>
                  {profitPathView === '3' ? (
                    <p style={{ margin: '4px 0' }}>
                      Percorso costo min verso .3: <strong>{detailBasicItem.bestPathLabelIt}</strong> (
                      {detailBasicItem.bestPath})
                    </p>
                  ) : profitPathView === '1' ? (
                    <p style={{ margin: '4px 0' }}>
                      Costo minimo per .1: <strong>{detailBasicItem.bestPathFinal1LabelIt ?? '—'}</strong>
                    </p>
                  ) : (
                    <p style={{ margin: '4px 0' }}>
                      Costo minimo per .2: <strong>{detailBasicItem.bestPathFinal2LabelIt ?? '—'}</strong>
                    </p>
                  )}
                  <p style={{ margin: '4px 0' }}>
                    Profitto sell order (vista):{' '}
                    <strong>{formatProfitMaybe(pathViewSellProfit(detailBasicItem, profitPathView))}</strong>
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    Profitto buy order (vista):{' '}
                    <strong>{formatProfitMaybe(pathViewBestBuyOrder(detailBasicItem, profitPathView))}</strong>
                    {pathViewBestBuyCity(detailBasicItem, profitPathView) != null && (
                      <> · {pathViewBestBuyCity(detailBasicItem, profitPathView)}</>
                    )}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    {profitPathView === '1' ? (
                      <>
                        .1 sell min Lymhurst: <strong>{formatPrice(detailBasicItem.sellPrice1)}</strong>
                      </>
                    ) : profitPathView === '2' ? (
                      <>
                        .2 sell min Lymhurst: <strong>{formatPrice(detailBasicItem.sellPrice2)}</strong>
                      </>
                    ) : (
                      <>
                        .3 sell min Lymhurst: <strong>{formatPrice(detailBasicItem.sellPrice3)}</strong>
                      </>
                    )}
                  </p>
                  {profitPathView === '3' &&
                    detailBasicItem.enchantVersusBuySilver != null &&
                    detailBasicItem.enchantVersusBuySilver !== 0 && (
                      <p style={{ margin: '4px 0' }}>
                        vs compra .3: <strong>{formatProfitWithSign(detailBasicItem.enchantVersusBuySilver)}</strong>
                      </p>
                    )}
                </IonCardContent>
              </IonCard>

              <EnchantPathCostBreakdown
                item={detailBasicItem}
                priceAvgs={enchantPriceAvgs}
                profitPathView={profitPathView}
              />

              {detailItem && (
                <IonCard style={{ marginTop: 14 }}>
                  <IonCardHeader>
                    <IonCardTitle>Tracciamento salvato</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p style={{ margin: '4px 0' }}>
                      Percorso al salvataggio: {pathCodeLabel(detailItem.savedBestPath)} ({detailItem.savedBestPath})
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      Profitto al salvataggio: {formatProfitWithSign(detailItem.savedBestProfit)} · Listino .
                      {detailItem.finalEnchant ?? 3}: {formatPrice(detailItem.savedSellPrice3)}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      Ora: profitto {formatProfitWithSign(detailItem.currentBestProfit)} · .
                      {detailItem.finalEnchant ?? 3} {formatPrice(detailItem.currentSellPrice3)}
                    </p>

                    <IonItem lines="none">
                      <IonLabel>In vendita</IonLabel>
                      <IonToggle checked={trListed} onIonChange={(e) => setTrListed(e.detail.checked)} />
                    </IonItem>
                    <IonItem>
                      <IonLabel>Disponibilità vendita</IonLabel>
                      <IonSelect
                        value={trSell}
                        onIonChange={(e) => setTrSell(e.detail.value as AvailabilityLevelCode)}
                        interface="popover"
                      >
                        {AVAIL_OPTIONS.map((o) => (
                          <IonSelectOption key={o.value} value={o.value}>
                            {o.label}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                    <IonItem>
                      <IonLabel>Stock materiali</IonLabel>
                      <IonSelect
                        value={trStock}
                        onIonChange={(e) => setTrStock(e.detail.value as AvailabilityLevelCode)}
                        interface="popover"
                      >
                        {AVAIL_OPTIONS.map((o) => (
                          <IonSelectOption key={o.value} value={o.value}>
                            {o.label}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>

                    <IonButton
                      expand="block"
                      onClick={() => void saveEnchantingTracking()}
                      disabled={trackSaving}
                    >
                      {trackSaving ? 'Salvataggio…' : 'Salva note'}
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              )}
            </IonContent>
          )}
        </IonModal>

        <IonModal
          isOpen={!!detailItem && !detailBasicItem}
          onDidDismiss={() => setDetailItem(null)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Dettaglio salvato</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setDetailItem(null)}>Chiudi</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          {detailItem && (
            <IonContent className="ion-padding">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>{cleanItemName(detailItem.itemId)}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p>
                    Percorso al salvataggio: {pathCodeLabel(detailItem.savedBestPath)} ({detailItem.savedBestPath})
                  </p>
                  <p>
                    Profitto al salvataggio: {formatProfitWithSign(detailItem.savedBestProfit)} · Listino .
                    {detailItem.finalEnchant ?? 3}: {formatPrice(detailItem.savedSellPrice3)}
                  </p>
                  <p>
                    Ora: profitto {formatProfitWithSign(detailItem.currentBestProfit)} · .
                    {detailItem.finalEnchant ?? 3} {formatPrice(detailItem.currentSellPrice3)}
                  </p>
                  <IonItem lines="none">
                    <IonLabel>In vendita</IonLabel>
                    <IonToggle checked={trListed} onIonChange={(e) => setTrListed(e.detail.checked)} />
                  </IonItem>
                  <IonItem>
                    <IonLabel>Disponibilità vendita</IonLabel>
                    <IonSelect
                      value={trSell}
                      onIonChange={(e) => setTrSell(e.detail.value as AvailabilityLevelCode)}
                      interface="popover"
                    >
                      {AVAIL_OPTIONS.map((o) => (
                        <IonSelectOption key={o.value} value={o.value}>
                          {o.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                  <IonItem>
                    <IonLabel>Stock materiali</IonLabel>
                    <IonSelect
                      value={trStock}
                      onIonChange={(e) => setTrStock(e.detail.value as AvailabilityLevelCode)}
                      interface="popover"
                    >
                      {AVAIL_OPTIONS.map((o) => (
                        <IonSelectOption key={o.value} value={o.value}>
                          {o.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                  <IonButton expand="block" onClick={() => void saveEnchantingTracking()} disabled={trackSaving}>
                    {trackSaving ? 'Salvataggio…' : 'Salva note'}
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonContent>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default EnchantingPage;
