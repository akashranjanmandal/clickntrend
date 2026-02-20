export const CONFIG = {
  // This will be https://api.gftd.in in production
  API_URL: import.meta.env.VITE_API_URL || '',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://dcvqnewqhvrqwbmvcbjr.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdnFuZXdxaHZycXdibXZjYmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mzk5NjMsImV4cCI6MjA4NjExNTk2M30.fUkUENDo93QQhg8pjVeb_p8Qyn5c6tPJq2nuyWzN9Vc',
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SHiG5vdUkVlHJP',
} as const;

// Global fetch function that works in all environments
export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = CONFIG.API_URL;
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
  
  console.log(`🌐 API Request [${import.meta.env.MODE}]:`, url);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'API request failed');
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error(`API request failed with status ${response.status}`);
    }
  }

  return response.json();
};