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

// --- Black Market ---

export interface BlackMarketPriceResponse {
  itemId: string;
  category: string;
  tier: number;
  enchantment: number;
  sellPriceMin: number;
  sellPriceMinDate: string | null;
  buyPriceMax: number;
  buyPriceMaxDate: string | null;
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
  profitPercentage: number;
  returnRate: number;
  hasCityBonus: boolean;
  hasDailyBonus: boolean;
  updatedAt: string;
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
  updatedAt: string;
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
