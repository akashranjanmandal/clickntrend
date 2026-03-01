export const CONFIG = {
  // This will be https://api.gftd.in in production
  API_URL: import.meta.env.VITE_API_URL || '',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://dcvqnewqhvrqwbmvcbjr.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdnFuZXdxaHZycXdibXZjYmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mzk5NjMsImV4cCI6MjA4NjExNTk2M30.fUkUENDo93QQhg8pjVeb_p8Qyn5c6tPJq2nuyWzN9Vc',
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SHiG5vdUkVlHJP',
} as const;

// Global fetch function that works in all environments
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = process.env.REACT_APP_API_URL || '';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  // Don't set Content-Type header for FormData
  const headers = options.body instanceof FormData 
    ? { ...options.headers } // Let browser set content-type with boundary
    : { 'Content-Type': 'application/json', ...options.headers };

  console.log(`API Request: ${options.method || 'GET'} ${url}`, {
    hasBody: !!options.body,
    isFormData: options.body instanceof FormData,
    headers
  });

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      body: text.substring(0, 500) // Log first 500 chars
    });
    
    try {
      const error = JSON.parse(text);
      throw new Error(error.message || `API request failed with status ${response.status}`);
    } catch {
      throw new Error(`API request failed with status ${response.status}: ${text.substring(0, 100)}`);
    }
  }

  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
};