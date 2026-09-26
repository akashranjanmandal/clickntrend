export const CONFIG = {
  API_URL: (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, ''),
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SHiG5vdUkVlHJP',
} as const;

// Re-export unified API functions so all existing imports from 'config' still work
export { apiFetch, publicFetch, uploadFetch, buildUrl } from './utils/api';
