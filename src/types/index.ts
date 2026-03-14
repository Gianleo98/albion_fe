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
  buyPriceMax: number;
  buyPriceMaxDate: string | null;
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
  location: string;
  updatedAt: string;
}

// --- Enums ---

export interface SortOption {
  code: string;
  displayName: string;
  isDefault: boolean;
}

// --- Rate Limit ---

export interface RateLimitStatus {
  callsMade: number;
  maxCalls: number;
  callsRemaining: number;
  windowStart: string;
  windowResetAt: string;
}
