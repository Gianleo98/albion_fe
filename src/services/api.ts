import axios from 'axios';
import type {
  AppInfo,
  BlackMarketPriceResponse,
  CraftingBonusResponse,
  CraftingProfitResponse,
  CraftingSettingsResponse,
  FocusProfitResponse,
  MaterialPriceResponse,
  PageResponse,
  RateLimitStatus,
  SortOption,
} from '../types';

const PRIMARY_BASE_URL = 'http://janraion.ddns.net:1997';
const FALLBACK_BASE_URL = 'http://192.168.1.69:1997';

const api = axios.create({
  baseURL: PRIMARY_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// --- Black Market ---

export const getBlackMarketPrices = async (
  page: number = 0,
  size: number = 20,
  sortBy: string = 'PRICE',
  sortDirection: 'ASC' | 'DESC' = 'DESC'
): Promise<PageResponse<BlackMarketPriceResponse>> => {
  const { data } = await api.get<PageResponse<BlackMarketPriceResponse>>('/api/black-market', {
    params: { page, size, sortBy, sortDirection },
  });
  return data;
};

// --- Enums ---

export const getBlackMarketSortOptions = async (): Promise<SortOption[]> => {
  const { data } = await api.get<SortOption[]>('/api/enums/black-market-sort-options');
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

export const triggerLymhurstMarketUpdate = async (): Promise<{ message: string; itemsUpdated: number }> => {
  const { data } = await api.post<{ message: string; itemsUpdated: number }>('/api/scheduler/update-lymhurst-market');
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
  sortDirection: 'ASC' | 'DESC' = 'DESC'
): Promise<PageResponse<CraftingProfitResponse>> => {
  const { data } = await api.get<PageResponse<CraftingProfitResponse>>('/api/crafting-profit', {
    params: { page, size, sortBy, sortDirection },
  });
  return data;
};

export const getCraftingProfitSortOptions = async (): Promise<SortOption[]> => {
  const { data } = await api.get<SortOption[]>('/api/enums/crafting-profit-sort-options');
  return data;
};

// --- Focus Profit ---

export const getFocusProfits = async (
  page: number = 0,
  size: number = 20,
  sortBy: string = 'PROFIT_SELL',
  sortDirection: 'ASC' | 'DESC' = 'DESC'
): Promise<PageResponse<FocusProfitResponse>> => {
  const { data } = await api.get<PageResponse<FocusProfitResponse>>('/api/focus-profit', {
    params: { page, size, sortBy, sortDirection },
  });
  return data;
};

export const getFocusProfitSortOptions = async (): Promise<SortOption[]> => {
  const { data } = await api.get<SortOption[]>('/api/enums/focus-profit-sort-options');
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
