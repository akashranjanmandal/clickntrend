// For authenticated admin calls
export const apiFetch = async (
  path: string,
  options: RequestInit = {}
) => {
  const BASE_URL =
    import.meta.env.MODE === 'development'
      ? ''
      : import.meta.env.VITE_API_URL;

  const token = localStorage.getItem('admin_token');
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API request failed');
  }

  return response.json();
};

// NEW: For public/customer API calls (no authentication)
export const publicFetch = async (
  path: string,
  options: RequestInit = {}
) => {
  const BASE_URL =
    import.meta.env.MODE === 'development'
      ? ''
      : import.meta.env.VITE_API_URL;

  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API request failed');
  }

  return response.json();
};