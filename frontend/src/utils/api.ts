/**
 * Unified API utility — works correctly in both local dev and production.
 *
 * LOCAL:  VITE_API_URL is NOT set (or '').
 *         Vite proxies /api/* → http://localhost:5000/api/*
 *         So we just call /api/... directly (no base prefix needed).
 *
 * PRODUCTION: nginx on gftd.in proxies /api/ → http://127.0.0.1:5000/
 *             VITE_API_URL should be '' (empty string) in the .env.production
 *             So we still call /api/... directly. Nginx handles it.
 *
 * NEVER set VITE_API_URL to something like "https://gftd.in/api" — that
 * creates double /api/api prefixes. Leave it empty.
 */

/** Error with the server's status, code (e.g. PRICE_CHANGED) and full JSON body */
export class ApiError extends Error {
  constructor(message: string, public status: number, public data: any = null) { super(message); }
  get code(): string | undefined { return this.data?.code; }
}

/** Reads a failed response into an ApiError (JSON message when available) */
async function toApiError(res: Response, prefix = 'API error'): Promise<ApiError> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const data = await res.json().catch(() => null);
    return new ApiError(data?.message || data?.error || `${prefix} ${res.status}`, res.status, data);
  }
  const text = await res.text().catch(() => '');
  console.error('Non-JSON error response:', text.substring(0, 300));
  return new ApiError(`${prefix} ${res.status}`, res.status);
}

const getBaseUrl = (): string => {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  // Safety: if someone accidentally set it to end with /api, strip it to avoid doubling
  return raw.endsWith('/api') ? raw.slice(0, -4) : raw;
};

/**
 * Build the full URL for an API path.
 * Always pass paths starting with /api/  e.g. '/api/admin/products'
 */
export const buildUrl = (path: string): string => {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

/** Admin fetch — attaches Authorization header automatically */
export const apiFetch = async <T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = buildUrl(path);
  const token = localStorage.getItem('admin_token');
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  console.log(`🌐 apiFetch [${import.meta.env.MODE}]:`, url);

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) throw await toApiError(res);

  return res.json();
};

/** Public fetch — no auth header */
export const publicFetch = async <T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = buildUrl(path);
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) throw await toApiError(res);

  return res.json();
};

/** Upload helper — sends FormData with auth */
export const uploadFetch = async <T = any>(
  path: string,
  formData: FormData
): Promise<T> => {
  const url = buildUrl(path);
  const token = localStorage.getItem('admin_token');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) throw await toApiError(res, 'Upload error');

  return res.json();
};
