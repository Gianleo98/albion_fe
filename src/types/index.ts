// --- Pagination ---

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: { sorted: boolean; unsorted: boolean; empty: boolean };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
}

// --- Info ---

export interface AppInfo {
  name: string;
  version: string;
}

// --- Material Prices ---

export interface MaterialPriceResponse {
  itemId: string;
  materialType: string;
  tier: number;
  enchantment: number;
  sellPriceMin: number;
  sellPriceMinDate: string | null;
  avgPrice7d: number;
  iconUrl: string | null;
  location: string;
  updatedAt: string;
}

// --- Enums ---

export interface SortOption {
  code: string;
  displayName: string;
  isDefault: boolean;
}

// --- Crafting Profit ---

export interface CraftingProfitResponse {
  itemId: string;
  tier: number;
  iconUrl: string | null;
  bonusCategory: string | null;
  primaryResourceId: string;
  primaryResourcePrice: number;
  primaryResourceQty: number;
  primaryResourceIconUrl: string | null;
  primaryResourcePriceLevel?: 'below' | 'equal' | 'above';
  secondaryResourceId: string | null;
  secondaryResourcePrice: number;
  secondaryResourceQty: number;
  secondaryResourceIconUrl: string | null;
  secondaryResourcePriceLevel?: 'below' | 'equal' | 'above';
  artifactId: string | null;
  artifactPrice: number;
  artifactIconUrl: string | null;
  artifactPriceLevel?: 'below' | 'equal' | 'above';
  heartId: string | null;
  heartPrice: number;
  heartIconUrl: string | null;
  heartPriceLevel?: 'below' | 'equal' | 'above';
  crestId: string | null;
  crestPrice: number;
  crestIconUrl: string | null;
  crestPriceLevel?: 'below' | 'equal' | 'above';
  totalMaterialCost: number;
  effectiveCost: number;
  bmSellPrice: number;
  profit: number;
  profitPercentage: number;
  returnRate: number;
  hasCityBonus: boolean;
  hasDailyBonus: boolean;
  materialsUnderAvg?: boolean;
  updatedAt: string;
}

// --- Saved Crafting (swipe save + prezzo al salvataggio) ---

export interface SavedCraftingItemResponse {
  itemId: string;
  tier: number;
  iconUrl: string | null;
  bonusCategory: string | null;
  primaryResourceId: string;
  primaryResourcePrice: number;
  primaryResourceQty: number;
  primaryResourceIconUrl: string | null;
  secondaryResourceId: string | null;
  secondaryResourcePrice: number;
  secondaryResourceQty: number;
  secondaryResourceIconUrl: string | null;
  artifactId: string | null;
  artifactPrice: number;
  artifactIconUrl: string | null;
  heartId: string | null;
  heartPrice: number;
  heartIconUrl: string | null;
  crestId: string | null;
  crestPrice: number;
  crestIconUrl: string | null;
  totalMaterialCost: number;
  effectiveCost: number;
  bmSellPrice: number;
  profit: number;
  returnRate: number;
  hasCityBonus: boolean;
  hasDailyBonus: boolean;
  savedBmPrice: number;
  savedEffectiveCost: number;
  savedProfit: number;
  savedAt: string;
  currentBmPrice: number;
  currentEffectiveCost: number;
  currentProfit: number;
  bmPriceDiff: number;
  profitDiff: number;
}

// --- Focus Profit (crafting con focus, mercato Lymhurst) ---

export interface FocusProfitResponse {
  itemId: string;
  tier: number;
  /** 0 = .0, 1 = .1, 2 = .2, 3 = .3 */
  enchantment: number;
  iconUrl: string | null;
  bonusCategory: string | null;
  primaryResourceId: string;
  primaryResourcePrice: number;
  primaryResourceQty: number;
  primaryResourceIconUrl: string | null;
  primaryResourcePriceLevel?: 'below' | 'equal' | 'above';
  secondaryResourceId: string | null;
  secondaryResourcePrice: number;
  secondaryResourceQty: number;
  secondaryResourceIconUrl: string | null;
  secondaryResourcePriceLevel?: 'below' | 'equal' | 'above';
  artifactId: string | null;
  artifactPrice: number;
  artifactIconUrl: string | null;
  artifactPriceLevel?: 'below' | 'equal' | 'above';
  heartId: string | null;
  heartPrice: number;
  heartIconUrl: string | null;
  heartPriceLevel?: 'below' | 'equal' | 'above';
  crestId: string | null;
  crestPrice: number;
  crestIconUrl: string | null;
  crestPriceLevel?: 'below' | 'equal' | 'above';
  totalMaterialCost: number;
  effectiveCostWithFocus: number;
  lymhurstSellPriceMin: number;
  lymhurstBuyPriceMax: number;
  profitSell: number;
  profitBuyOrder: number;
  returnRateWithFocus: number;
  hasCityBonus: boolean;
  hasDailyBonus: boolean;
  materialsUnderAvg?: boolean;
  updatedAt: string;
}

// --- Saved Focus (swipe save + prezzo al salvataggio) ---

export interface SavedFocusItemResponse {
  itemId: string;
  tier: number;
  enchantment: number;
  iconUrl: string | null;
  bonusCategory: string | null;
  primaryResourceId: string;
  primaryResourcePrice: number;
  primaryResourceQty: number;
  primaryResourceIconUrl: string | null;
  secondaryResourceId: string | null;
  secondaryResourcePrice: number;
  secondaryResourceQty: number;
  secondaryResourceIconUrl: string | null;
  artifactId: string | null;
  artifactPrice: number;
  artifactIconUrl: string | null;
  heartId: string | null;
  heartPrice: number;
  heartIconUrl: string | null;
  crestId: string | null;
  crestPrice: number;
  crestIconUrl: string | null;
  totalMaterialCost: number;
  effectiveCostWithFocus: number;
  lymhurstSellPriceMin: number;
  lymhurstBuyPriceMax: number;
  profitSell: number;
  profitBuyOrder: number;
  returnRateWithFocus: number;
  hasCityBonus: boolean;
  hasDailyBonus: boolean;
  savedLymhurstSell: number;
  savedLymhurstBuy: number;
  savedEffectiveCost: number;
  savedProfitSell: number;
  savedProfitBuyOrder: number;
  savedAt: string;
  currentLymhurstSell: number;
  currentLymhurstBuy: number;
  currentEffectiveCost: number;
  currentProfitSell: number;
  currentProfitBuyOrder: number;
  sellPriceDiff: number;
  buyPriceDiff: number;
  profitSellDiff: number;
  profitBuyOrderDiff: number;
}

// --- Royal Markets (Focus: sell/buy order per città, solo lettura) ---

export interface RoyalMarketEntry {
  city: string;
  sellPriceMin: number;
  sellPriceMax: number;
  buyPriceMin: number;
  buyPriceMax: number;
}

export interface RoyalMarketsResponse {
  itemId: string;
  sellOrders: RoyalMarketEntry[];
  buyOrders: RoyalMarketEntry[];
}

// --- Crafting Bonus ---

export interface CraftingBonusEntry {
  category: string;
  bonusPercentage: number;
}

export interface CraftingBonusResponse {
  fixedBonuses: CraftingBonusEntry[];
  dailyBonuses: CraftingBonusEntry[];
}

// --- Crafting Settings (tassa vendita: premium 4%, non premium 8%) ---

export interface CraftingSettingsResponse {
  premium: boolean;
  marketTaxPercent: number;
}

// --- Rate Limit ---

export interface RateLimitStatus {
  callsMade: number;
  maxCalls: number;
  callsRemaining: number;
  windowStart: string;
  windowResetAt: string;
}
