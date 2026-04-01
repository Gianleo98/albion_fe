import axios from 'axios';
import { getApiToken } from './apiToken';
import type {
  AppInfo,
  CraftingBonusResponse,
  CraftingProfitResponse,
  CraftingSettingsResponse,
  FocusProfitResponse,
  MaterialPriceResponse,
  PageResponse,
  RateLimitStatus,
  RoyalMarketsResponse,
  SavedCraftingItemResponse,
  SavedFocusItemResponse,
  SavedFlipItemResponse,
  SavedRoyalFlipItemResponse,
  SortOption,
  FlipProfitResponse,
  RoyalContinentFlipResponse,
  SavedItemTrackingPayload,
  EnchantingProfitResponse,
  EnchantmentMaterialStripResponse,
  SavedEnchantingItemResponse,
  EnchantingSavedKey,
  RefiningFocusPlanResponse,
  RefiningMountCode,
  RefiningOpportunityResponse,
} from '../types';

const PRIMARY_BASE_URL = 'http://janraion.ddns.net:1997';
const FALLBACK_BASE_URL = 'http://192.168.1.69:1997';

const api = axios.create({
  baseURL: PRIMARY_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  config.headers['X-API-Token'] = getApiToken();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isNetworkError = !error.response;
    const stillOnPrimary = api.defaults.baseURL === PRIMARY_BASE_URL;
    const notYetRetried = !originalRequest._retriedWithFallback;

    if (isNetworkError && stillOnPrimary && notYetRetried) {
      originalRequest._retriedWithFallback = true;
      api.defaults.baseURL = FALLBACK_BASE_URL;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// --- Info ---

export const getAppInfo = async (): Promise<AppInfo> => {
  const { data } = await api.get<AppInfo>('/api/info');
  return data;
};

// --- Materials ---

export const getMaterialPrices = async (): Promise<MaterialPriceResponse[]> => {
  const { data } = await api.get<MaterialPriceResponse[]>('/api/materials');
  return data;
};

export const getRefiningOpportunities = async (
  lymhurstAnchor: boolean,
  mount: RefiningMountCode
): Promise<RefiningOpportunityResponse[]> => {
  const { data } = await api.get<RefiningOpportunityResponse[]>('/api/refining/opportunities', {
    params: { lymhurstAnchor, mount },
  });
  return data;
};

export const getRefiningFocusPlan = async (
  lymhurstAnchor: boolean,
  mount: RefiningMountCode
): Promise<RefiningFocusPlanResponse> => {
  const { data } = await api.get<RefiningFocusPlanResponse>('/api/refining/focus-plan', {
    params: { lymhurstAnchor, mount },
  });
  return data;
};

// --- Scheduler ---

export const triggerPriceUpdate = async (): Promise<{ message: string; itemsUpdated: number }> => {
  const { data } = await api.post<{ message: string; itemsUpdated: number }>('/api/scheduler/update-prices');
  return data;
};

export const triggerBlackMarketUpdate = async (): Promise<{ message: string; itemsUpdated: number }> => {
  const { data } = await api.post<{ message: string; itemsUpdated: number }>('/api/scheduler/update-black-market');
  return data;
};

export const triggerCraftingProfitUpdate = async (): Promise<{ message: string; itemsUpdated: number }> => {
  const { data } = await api.post<{ message: string; itemsUpdated: number }>('/api/scheduler/update-crafting-profit');
  return data;
};

/** Lymhurst, Bridgewatch, Martlock, Fort Sterling, Thetford, Brecilien, Caerleon — un batch API per tutte le città. */
export const triggerRoyalContinentUpdate = async (): Promise<{
  message: string;
  priceRowsWritten: number;
  focusItemsUpdated: number;
}> => {
  const { data } = await api.post<{
    message: string;
    priceRowsWritten: number;
    focusItemsUpdated: number;
  }>('/api/scheduler/update-royal-continent', null, { timeout: 600_000 });
  return data;
};

export const triggerFocusProfitUpdate = async (): Promise<{ message: string; itemsUpdated: number }> => {
  const { data } = await api.post<{ message: string; itemsUpdated: number }>('/api/scheduler/update-focus-profit');
  return data;
};

// --- Crafting Profit ---

export const getCraftingProfits = async (
  page: number = 0,
  size: number = 20,
  sortBy: string = 'PROFIT',
  sortDirection: 'ASC' | 'DESC' = 'DESC',
  nameSearch?: string,
  materialsUnderAvg?: boolean
): Promise<PageResponse<CraftingProfitResponse>> => {
  const params: Record<string, unknown> = { page, size, sortBy, sortDirection };
  if (nameSearch != null && nameSearch.trim() !== '') params.nameSearch = nameSearch.trim();
  if (materialsUnderAvg === true) params.materialsUnderAvg = true;
  const { data } = await api.get<PageResponse<CraftingProfitResponse>>('/api/crafting-profit', { params });
  return data;
};

export const getCraftingProfitSortOptions = async (): Promise<SortOption[]> => {
  const { data } = await api.get<SortOption[]>('/api/enums/crafting-profit-sort-options');
  return data;
};

// --- Saved Crafting Items ---

export const getSavedCraftingItemIds = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/api/saved-crafting-items/ids');
  return data;
};

export const saveCraftingItem = async (itemId: string): Promise<void> => {
  await api.post('/api/saved-crafting-items', { itemId });
};

export const deleteSavedCraftingItem = async (itemId: string): Promise<void> => {
  await api.delete(`/api/saved-crafting-items/${encodeURIComponent(itemId)}`);
};

export const getSavedCraftingItemsWithCurrent = async (): Promise<SavedCraftingItemResponse[]> => {
  const { data } = await api.get<SavedCraftingItemResponse[]>('/api/saved-crafting-items');
  return data;
};

export const getSavedCraftingItemDetail = async (itemId: string): Promise<SavedCraftingItemResponse | null> => {
  try {
    const { data } = await api.get<SavedCraftingItemResponse>(`/api/saved-crafting-items/${encodeURIComponent(itemId)}`);
    return data;
  } catch {
    return null;
  }
};

export const patchSavedCraftingTracking = async (
  itemId: string,
  payload: SavedItemTrackingPayload
): Promise<SavedCraftingItemResponse> => {
  const { data } = await api.patch<SavedCraftingItemResponse>(
    `/api/saved-crafting-items/${encodeURIComponent(itemId)}/tracking`,
    payload
  );
  return data;
};

// --- Focus Profit ---

export const getFocusProfits = async (
  page: number = 0,
  size: number = 20,
  sortBy: string = 'PROFIT_SELL',
  sortDirection: 'ASC' | 'DESC' = 'DESC',
  nameSearch?: string,
  materialsUnderAvg?: boolean,
  withFocus: boolean = true,
  consumablesFoodPotion?: boolean
): Promise<PageResponse<FocusProfitResponse>> => {
  const params: Record<string, unknown> = { page, size, sortBy, sortDirection, withFocus };
  if (nameSearch != null && nameSearch.trim() !== '') params.nameSearch = nameSearch.trim();
  if (materialsUnderAvg === true) params.materialsUnderAvg = true;
  if (consumablesFoodPotion === true) params.consumablesFoodPotion = true;
  const { data } = await api.get<PageResponse<FocusProfitResponse>>('/api/focus-profit', { params });
  return data;
};

export const getFocusProfitSortOptions = async (): Promise<SortOption[]> => {
  const { data } = await api.get<SortOption[]>('/api/enums/focus-profit-sort-options');
  return data;
};

export const getFlipProfits = async (
  page: number = 0,
  size: number = 20,
  sortBy: string = 'PROFIT',
  sortDirection: 'ASC' | 'DESC' = 'DESC',
  nameSearch?: string,
  materialsUnderAvg?: boolean
): Promise<PageResponse<FlipProfitResponse>> => {
  const params: Record<string, unknown> = { page, size, sortBy, sortDirection };
  if (nameSearch != null && nameSearch.trim() !== '') params.nameSearch = nameSearch.trim();
  if (materialsUnderAvg === true) params.materialsUnderAvg = true;
  const { data } = await api.get<PageResponse<FlipProfitResponse>>('/api/flip', { params });
  return data;
};

export const getFlipProfitSortOptions = async (): Promise<SortOption[]> => {
  const { data } = await api.get<SortOption[]>('/api/enums/flip-profit-sort-options');
  return data;
};

export const getRoyalFlipSortOptions = async (): Promise<SortOption[]> => {
  const { data } = await api.get<SortOption[]>('/api/enums/royal-flip-sort-options');
  return data;
};

/** royalPath: BO = listino → buy order; SO = listino → sell listino. Backend: 6 mercati, senza Caerleon. */
export const getRoyalContinentFlipProfits = async (
  page: number = 0,
  size: number = 20,
  sortBy: string = 'PROFIT',
  sortDirection: 'ASC' | 'DESC' = 'DESC',
  nameSearch?: string,
  royalPath: 'BO' | 'SO' = 'BO',
  lymhurstLocalHomeItems?: boolean
): Promise<PageResponse<RoyalContinentFlipResponse>> => {
  const params: Record<string, unknown> = { page, size, sortBy, sortDirection, royalPath };
  if (nameSearch != null && nameSearch.trim() !== '') params.nameSearch = nameSearch.trim();
  if (lymhurstLocalHomeItems) params.lymhurstLocalHomeItems = true;
  const { data } = await api.get<PageResponse<RoyalContinentFlipResponse>>('/api/flip/royal-continent', { params });
  return data;
};

export const recomputeRoyalContinentFlip = async (): Promise<{ message: string; itemsStored: number }> => {
  const { data } = await api.post<{ message: string; itemsStored: number }>('/api/flip/royal-continent/recompute');
  return data;
};

// --- Saved Flip Items ---

export const getSavedFlipItemIds = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/api/saved-flip-items/ids');
  return data;
};

export const saveFlipItem = async (itemId: string): Promise<void> => {
  await api.post('/api/saved-flip-items', { itemId });
};

export const deleteSavedFlipItem = async (itemId: string): Promise<void> => {
  await api.delete(`/api/saved-flip-items/${encodeURIComponent(itemId)}`);
};

export const getSavedFlipItemsWithCurrent = async (): Promise<SavedFlipItemResponse[]> => {
  const { data } = await api.get<SavedFlipItemResponse[]>('/api/saved-flip-items');
  return data;
};

export const getSavedRoyalFlipItemIds = async (royalPath: 'BO' | 'SO'): Promise<string[]> => {
  const { data } = await api.get<string[]>('/api/saved-royal-flip-items/ids', {
    params: { royalPath },
  });
  return data;
};

export const saveRoyalFlipItem = async (itemId: string, royalPath: 'BO' | 'SO'): Promise<void> => {
  await api.post('/api/saved-royal-flip-items', { itemId, royalPath });
};

export const deleteSavedRoyalFlipItem = async (itemId: string, royalPath: 'BO' | 'SO'): Promise<void> => {
  await api.delete(`/api/saved-royal-flip-items/${encodeURIComponent(itemId)}`, {
    params: { royalPath },
  });
};

export const getSavedRoyalFlipItemsWithCurrent = async (
  royalPath: 'BO' | 'SO'
): Promise<SavedRoyalFlipItemResponse[]> => {
  const { data } = await api.get<SavedRoyalFlipItemResponse[]>('/api/saved-royal-flip-items', {
    params: { royalPath },
  });
  return data;
};

export const getFocusRoyalMarkets = async (itemId: string): Promise<RoyalMarketsResponse> => {
  const { data } = await api.get<RoyalMarketsResponse>('/api/focus-profit/royal-markets', {
    params: { itemId },
  });
  return data;
};

// --- Saved Focus Items ---

export const getSavedFocusItemIds = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/api/saved-focus-items/ids');
  return data;
};

export const saveFocusItem = async (itemId: string, withFocus: boolean = true): Promise<void> => {
  await api.post('/api/saved-focus-items', { itemId, withFocus });
};

export const deleteSavedFocusItem = async (itemId: string): Promise<void> => {
  await api.delete(`/api/saved-focus-items/${encodeURIComponent(itemId)}`);
};

export const getSavedFocusItemsWithCurrent = async (): Promise<SavedFocusItemResponse[]> => {
  const { data } = await api.get<SavedFocusItemResponse[]>('/api/saved-focus-items');
  return data;
};

export const getSavedFocusItemDetail = async (itemId: string): Promise<SavedFocusItemResponse | null> => {
  try {
    const { data } = await api.get<SavedFocusItemResponse>(`/api/saved-focus-items/${encodeURIComponent(itemId)}`);
    return data;
  } catch {
    return null;
  }
};

export const patchSavedFocusTracking = async (
  itemId: string,
  payload: SavedItemTrackingPayload
): Promise<SavedFocusItemResponse> => {
  const { data } = await api.patch<SavedFocusItemResponse>(
    `/api/saved-focus-items/${encodeURIComponent(itemId)}/tracking`,
    payload
  );
  return data;
};

// --- Enchanting ---

export const getEnchantingProfits = async (
  page: number = 0,
  size: number = 20,
  sortBy: string = 'BEST_PROFIT',
  sortDirection: 'ASC' | 'DESC' = 'DESC',
  nameSearch?: string,
  pathView: 1 | 2 | 3 = 3
): Promise<PageResponse<EnchantingProfitResponse>> => {
  const params: Record<string, unknown> = { page, size, sortBy, sortDirection, pathView };
  if (nameSearch != null && nameSearch.trim() !== '') params.nameSearch = nameSearch.trim();
  const { data } = await api.get<PageResponse<EnchantingProfitResponse>>('/api/enchanting-profit', { params });
  return data;
};

export const getEnchantingProfitByItemId = async (itemId: string): Promise<EnchantingProfitResponse | null> => {
  try {
    const { data } = await api.get<EnchantingProfitResponse>(`/api/enchanting-profit/${encodeURIComponent(itemId)}`);
    return data;
  } catch {
    return null;
  }
};

export const getEnchantingProfitSortOptions = async (): Promise<SortOption[]> => {
  const { data } = await api.get<SortOption[]>('/api/enums/enchanting-profit-sort-options');
  return data;
};

export const getEnchantmentMaterialsStrip = async (): Promise<EnchantmentMaterialStripResponse[]> => {
  const { data } = await api.get<EnchantmentMaterialStripResponse[]>(
    '/api/enchanting-profit/enchantment-materials-strip',
  );
  return data;
};

export const enchantingSavedCompositeKey = (itemId: string, finalEnchant: number): string =>
  `${itemId}\0${finalEnchant}`;

export const getSavedEnchantingKeys = async (): Promise<EnchantingSavedKey[]> => {
  const { data } = await api.get<EnchantingSavedKey[]>('/api/saved-enchanting-items/keys');
  return data;
};

export const saveEnchantingItem = async (itemId: string, finalEnchant: 1 | 2 | 3): Promise<void> => {
  await api.post('/api/saved-enchanting-items', { itemId, finalEnchant });
};

export const deleteSavedEnchantingItem = async (itemId: string, finalEnchant: number): Promise<void> => {
  await api.delete('/api/saved-enchanting-items', {
    params: { itemId, finalEnchant },
  });
};

export const getSavedEnchantingItemsWithCurrent = async (): Promise<SavedEnchantingItemResponse[]> => {
  const { data } = await api.get<SavedEnchantingItemResponse[]>('/api/saved-enchanting-items');
  return data;
};

export const getSavedEnchantingItemDetail = async (
  itemId: string,
  finalEnchant: number
): Promise<SavedEnchantingItemResponse | null> => {
  try {
    const { data } = await api.get<SavedEnchantingItemResponse>('/api/saved-enchanting-items/detail', {
      params: { itemId, finalEnchant },
    });
    return data;
  } catch {
    return null;
  }
};

export const patchSavedEnchantingTracking = async (
  itemId: string,
  finalEnchant: number,
  payload: SavedItemTrackingPayload
): Promise<SavedEnchantingItemResponse> => {
  const { data } = await api.patch<SavedEnchantingItemResponse>(
    '/api/saved-enchanting-items/tracking',
    payload,
    { params: { itemId, finalEnchant } }
  );
  return data;
};

// --- Crafting Bonus ---

export const getCraftingBonuses = async (): Promise<CraftingBonusResponse> => {
  const { data } = await api.get<CraftingBonusResponse>('/api/crafting-bonus');
  return data;
};

export const getCraftingBonusCategories = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/api/crafting-bonus/categories');
  return data;
};

export const setDailyBonuses = async (categories: string[]): Promise<CraftingBonusResponse> => {
  const { data } = await api.put<CraftingBonusResponse>('/api/crafting-bonus/daily', { categories });
  return data;
};

// --- Crafting Settings (premium = tassa 4%, altrimenti 8%) ---

export const getCraftingSettings = async (): Promise<CraftingSettingsResponse> => {
  const { data } = await api.get<CraftingSettingsResponse>('/api/crafting-settings');
  return data;
};

export const setCraftingSettings = async (premium: boolean): Promise<CraftingSettingsResponse> => {
  const { data } = await api.put<CraftingSettingsResponse>('/api/crafting-settings', { premium });
  return data;
};

// --- Rate Limit ---

export const getRateLimitStatus = async (): Promise<RateLimitStatus> => {
  const { data } = await api.get<RateLimitStatus>('/api/scheduler/rate-limit');
  return data;
};

export default api;
