import axios from 'axios';
import type { AppInfo } from '../types';

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

export default api;
