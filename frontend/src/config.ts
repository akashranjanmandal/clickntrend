export const CONFIG = {
  API_URL: (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, ''),
} as const;

// Re-export unified API functions so all existing imports from 'config' still work
export { apiFetch, publicFetch, uploadFetch, buildUrl } from './utils/api';
