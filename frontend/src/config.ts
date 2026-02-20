export const CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://dcvqnewqhvrqwbmvcbjr.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdnFuZXdxaHZycXdibXZjYmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mzk5NjMsImV4cCI6MjA4NjExNTk2M30.fUkUENDo93QQhg8pjVeb_p8Qyn5c6tPJq2nuyWzN9Vc',
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SHiG5vdUkVlHJP',
  USE_SUPABASE_DIRECTLY: true
} as const;

export const apiFetch = async <T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const BASE_URL = import.meta.env.MODE === 'development' 
    ? ''  // In development, use proxy
    : CONFIG.API_URL; // In production, use full URL

  const url = `${BASE_URL}${path}`;
  
  console.log(`🌐 API Request [${import.meta.env.MODE}]: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      // Try to get error message from response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
      } else {
        // If not JSON, it might be HTML (like your index.html)
        const text = await response.text();
        if (text.includes('<!doctype html>')) {
          throw new Error(`API endpoint not found: ${path}. Make sure backend is running at ${CONFIG.API_URL}`);
        }
        throw new Error(text || `HTTP error ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ API Fetch Error [${url}]:`, error);
    throw error;
  }
};