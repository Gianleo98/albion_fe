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

export type AvailabilityLevelCode = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface SavedItemTrackingPayload {
  listedForSale?: boolean;
  sellAvailability?: AvailabilityLevelCode;
  stockAvailability?: AvailabilityLevelCode;
}

// --- Saved Crafting (swipe save + prezzo al salvataggio) ---

export interface SavedCraftingItemResponse {
  itemId: string;
  tier: number;
  iconUrl: string | null;
  currentDataMissing?: boolean;
  listedForSale?: boolean;
  sellAvailability?: string;
  sellAvailabilityLabel?: string;
  stockAvailability?: string;
  stockAvailabilityLabel?: string;
  sellAvailabilityRank?: number;
  stockAvailabilityRank?: number;
  profitSortKey?: number;
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

// --- Flip Caerleon → Black Market ---

export interface FlipProfitResponse {
  itemId: string;
  category: string;
  tier: number;
  enchantment: number;
  caerleonSellPriceMin: number;
  blackMarketBuyPriceMax: number;
  revenueAfterTax: number;
  profit: number;
  profitPercentage: number;
  taxPercentApplied: number;
  iconUrl: string | null;
}

export interface SavedFlipItemResponse {
  itemId: string;
  tier: number;
  iconUrl: string | null;
  currentDataMissing: boolean;
  savedProfit: number;
  savedBmBuy: number;
  savedCaerleonSell: number;
  savedAt: string;
  currentProfit: number;
  currentBmBuy: number;
  currentCaerleonSell: number;
  profitDiff: number;
}

export interface SavedRoyalFlipItemResponse {
  itemId: string;
  path: 'BO' | 'SO' | string;
  tier: number;
  iconUrl: string | null;
  currentDataMissing: boolean;
  savedProfit: number;
  savedCost: number;
  savedDestinationPrice: number;
  savedRevenueNet: number;
  savedBuyCity: string | null;
  savedSellCity: string | null;
  savedAt: string;
  currentProfit: number;
  currentCost: number;
  currentDestinationPrice: number;
  currentRevenueNet: number;
  currentBuyCity: string | null;
  currentSellCity: string | null;
  profitDiff: number;
}

/** Flip tra 6 mercati royal (+ Brecilien), senza Caerleon (tabella pre-calcolata). */
export interface RoyalContinentFlipResponse {
  itemId: string;
  category: string;
  tier: number;
  enchantment: number;
  iconUrl: string | null;
  taxPercentApplied: number;
  boBuyCity: string | null;
  boSellCity: string | null;
  boCost: number;
  boDestBuyOrderMax: number;
  boRevenueNet: number;
  boProfit: number;
  boProfitPercentage: number;
  soBuyCity: string | null;
  soSellCity: string | null;
  soCost: number;
  soDestSellMin: number;
  soRevenueNet: number;
  soProfit: number;
  soProfitPercentage: number;
  computedAt: string;
  /** Presenti con filtro Lymhurst + materiali home: stima peso e profitto per viaggio mammouth */
  estimatedItemWeightKg?: number | null;
  mammothUnitsPerTrip?: number | null;
  mammothTripProfitSilver?: number | null;
  mammothMaxWeightKgApplied?: number | null;
}

// --- Refining (raw → città bonus, royal senza Caerleon) ---

export type RefiningMountCode = 'MAMMOTH' | 'WINTER_BEAR_T8' | 'GRIZZLY' | 'OX_T8';

export interface RefiningOpportunityResponse {
  resourceLine: string;
  resourceLineLabel: string;
  tier: number;
  rawItemId: string;
  lowerRefinedItemId: string;
  refinedItemId: string;
  refineBonusCity: string;
  buyRawCity: string;
  sellRefinedCity: string;
  batchProfitSilver: number;
  tripProfitSilver: number;
  mountCode: string;
  mountMaxWeightKg: number;
  estimatedRawKgPerBatch: number;
  fullBatchesPerTripApprox: number;
  taxPercentApplied: number;
  refinedIconUrl: string;
}

export interface RefiningFocusMaterialDto {
  itemId: string;
  iconUrl: string;
  quantity: number;
  buyCity: string;
  unitPriceSilver: number;
  lineTotalSilver: number;
  totalWeightKg: number;
}

export interface RefiningFocusPlanResponse {
  found: boolean;
  enchantmentLevel: number;
  resourceLine?: string;
  resourceLineLabel?: string;
  tier?: number;
  rawItemId?: string;
  lowerRefinedItemId?: string;
  outputRefinedItemId?: string;
  refineBonusCity?: string;
  buyRawCity?: string;
  sellRefinedCity?: string;
  returnRateWithoutFocusPercent?: number;
  returnRateWithFocusPercent?: number;
  listMaterialSilverPerBatch?: number;
  effectiveMaterialSilverPerBatch?: number;
  revenueSilverPerBatch?: number;
  profitSilverPerBatch?: number;
  fullBatchesPerTripApprox?: number;
  mountCode?: string;
  mountMaxWeightKg?: number;
  rawKgPerBatch?: number;
  batchesListedForShopping?: number;
  totalEffectiveMaterialSilverListed?: number;
  totalRevenueSilverListed?: number;
  profitSilverListed?: number;
  profitSilverFullTripsOnly?: number;
  transportNote?: string | null;
  taxPercentApplied?: number;
  materials?: RefiningFocusMaterialDto[];
  disclaimer?: string;
}

// --- Enchanting (verso .3, Lymhurst) ---

export interface RoyalCityEnchantBuyProfit {
  cityCode: string;
  cityLabelIt: string;
  buyPriceMax3: number;
  profitBuyOrder: number;
}

export interface EnchantingProfitResponse {
  itemId: string;
  baseItemId: string;
  tier: number;
  enchantMaterialQuantity: number;
  iconUrl: string;
  sellPrice0: number;
  /** Costo stimato craft base .0 (Lymhurst); confrontato con sellPrice0 nel percorso FROM_0. */
  craftCostBase0?: number | null;
  /** BUY | CRAFT | EQUAL | BUY_ONLY — quale fonte entra nel costo min base .0. */
  base0CostSource?: string;
  /** Parte base effettiva nel costo FROM_0 (dopo min mercato vs craft). */
  base0UsedInCost: number;
  sellPrice1: number;
  sellPrice2: number;
  sellPrice3: number;
  runeUnitPrice: number;
  soulUnitPrice: number;
  relicUnitPrice: number;
  profitFrom0: number | null;
  profitFrom1: number | null;
  profitFrom2: number | null;
  profitBuy3: number | null;
  costFrom0: number | null;
  costFrom1: number | null;
  costFrom2: number | null;
  costBuy3: number;
  enchantVersusBuySilver: number | null;
  bestPath: string;
  bestPathLabelIt: string;
  bestProfit: number;
  /** Classifica profitto vendendo .3 ai buy order (royal, no Caerleon), migliore per prima */
  royalBuyOrderRank?: RoyalCityEnchantBuyProfit[];
  bestProfitBuyOrder?: number | null;
  bestProfitBuyOrderCityIt?: string | null;
  /** Prodotto finale enchant .1 / .2: profitto sell order e buy order coerenti con quel target. */
  profitFinalEnchant1?: number | null;
  bestPathFinal1?: string | null;
  bestPathFinal1LabelIt?: string | null;
  costMinFinal1?: number | null;
  royalBuyOrderRankFinal1?: RoyalCityEnchantBuyProfit[];
  bestProfitBuyOrderFinal1?: number | null;
  bestProfitBuyOrderCityItFinal1?: string | null;
  profitFinalEnchant2?: number | null;
  bestPathFinal2?: string | null;
  bestPathFinal2LabelIt?: string | null;
  costMinFinal2?: number | null;
  royalBuyOrderRankFinal2?: RoyalCityEnchantBuyProfit[];
  bestProfitBuyOrderFinal2?: number | null;
  bestProfitBuyOrderCityItFinal2?: string | null;
}

export interface EnchantmentMaterialStripResponse {
  itemId: string;
  /** RUNE | SOUL | RELIC; se assente si deduce da itemId. */
  materialKind?: string;
  sellPriceMin: number;
  iconUrl: string;
  updatedAt: string;
}

/** Chiave salvataggio enchanting (stesso itemId API + tier finale .1/.2/.3). */
export interface EnchantingSavedKey {
  itemId: string;
  finalEnchant: 1 | 2 | 3;
}

export interface SavedEnchantingItemResponse {
  itemId: string;
  /** Prodotto finale tracciato al salvataggio. */
  finalEnchant: number;
  baseItemId: string;
  tier: number;
  iconUrl: string | null;
  currentDataMissing?: boolean;
  bestPath: string;
  bestPathLabelIt: string;
  bestProfit: number;
  listedForSale?: boolean;
  sellAvailability?: string;
  sellAvailabilityLabel?: string;
  stockAvailability?: string;
  stockAvailabilityLabel?: string;
  sellAvailabilityRank?: number;
  stockAvailabilityRank?: number;
  profitSortKey?: number;
  savedBestProfit: number;
  savedBestPath: string;
  savedAt: string;
  savedSellPrice3: number;
  currentBestProfit: number;
  currentSellPrice3: number;
  profitDiff: number;
}

// --- Focus Profit (crafting con focus, mercato Lymhurst) ---

export interface FocusConsumableIngredient {
  itemId: string;
  quantity: number;
  unitPrice: number;
  iconUrl: string | null;
  priceLevel?: 'below' | 'equal' | 'above';
}

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
  returnRateWithoutFocus?: number;
  effectiveCostWithoutFocus?: number;
  lymhurstSellPriceMin: number;
  lymhurstBuyPriceMax: number;
  profitSell: number;
  profitBuyOrder: number;
  /** % rendimento su costo con focus (vendita listino) */
  yieldPercentage?: number;
  /** % rendimento su costo con focus (buy order) */
  yieldBuyOrderPercentage?: number;
  profitSellWithoutFocus?: number;
  profitBuyOrderWithoutFocus?: number;
  yieldPercentageWithoutFocus?: number;
  yieldBuyOrderPercentageWithoutFocus?: number;
  returnRateWithFocus: number;
  hasCityBonus: boolean;
  hasDailyBonus: boolean;
  materialsUnderAvg?: boolean;
  /** Pasti/pozioni: elenco completo ingredienti (con icone e prezzo vs media 7gg). */
  consumableIngredients?: FocusConsumableIngredient[] | null;
  updatedAt: string;
}

// --- Saved Focus (swipe save + prezzo al salvataggio) ---

export interface SavedFocusItemResponse {
  itemId: string;
  tier: number;
  enchantment: number;
  iconUrl: string | null;
  currentDataMissing?: boolean;
  listedForSale?: boolean;
  sellAvailability?: string;
  sellAvailabilityLabel?: string;
  stockAvailability?: string;
  stockAvailabilityLabel?: string;
  sellAvailabilityRank?: number;
  stockAvailabilityRank?: number;
  profitSortKey?: number;
  bonusCategory: string | null;
  primaryResourceId: string | null;
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
  /** Prezzi unitari materiali al salvataggio; assenti su snapshot legacy */
  savedPrimaryResourcePrice?: number | null;
  savedSecondaryResourcePrice?: number | null;
  savedArtifactPrice?: number | null;
  savedHeartPrice?: number | null;
  savedCrestPrice?: number | null;
  savedTotalMaterialCost?: number | null;
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
  /** false = snapshot salvato in modalità senza focus; assente/legacy = con focus */
  savedWithFocus?: boolean;
  materialsUnderAvg?: boolean;
  consumableIngredients?: FocusConsumableIngredient[] | null;
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
  /** Città sempre confrontate, incluso Brecilien */
  marketsCompared?: string[];
  /** #1 in classifica listino vendita (sell max più alto) */
  bestSellListCity?: string | null;
  /** #1 in classifica buy order (buy max più alto) */
  bestBuyOrderCity?: string | null;
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
