export const CONFIG = {
  API_URL: (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, ''),
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://dcvqnewqhvrqwbmvcbjr.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdnFuZXdxaHZycXdibXZjYmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mzk5NjMsImV4cCI6MjA4NjExNTk2M30.fUkUENDo93QQhg8pjVeb_p8Qyn5c6tPJq2nuyWzN9Vc',
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SHiG5vdUkVlHJP',
} as const;

// Re-export unified API functions so all existing imports from 'config' still work
export { apiFetch, publicFetch, uploadFetch, buildUrl } from './utils/api';
