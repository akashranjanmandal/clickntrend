export const CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://dcvqnewqhvrqwbmvcbjr.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdnFuZXdxaHZycXdibXZjYmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mzk5NjMsImV4cCI6MjA4NjExNTk2M30.fUkUENDo93QQhg8pjVeb_p8Qyn5c6tPJq2nuyWzN9Vc',
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SHiG5vdUkVlHJP',
  // Cloudinary configuration
  CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'do1aax5pa',
  CLOUDINARY_API_KEY: import.meta.env.VITE_CLOUDINARY_API_KEY || '857222383974713',
  CLOUDINARY_API_SECRET: import.meta.env.VITE_CLOUDINARY_API_SECRET || 'e6_RETMwCRfGuJILXs7kyxQotfc',
  CLOUDINARY_BASE_URL: import.meta.env.VITE_CLOUDINARY_BASE_URL || 'https://res.cloudinary.com/do1aax5pa/image/upload',
} as const;

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = CONFIG.API_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
  
  console.log(`🌐 API Request [${import.meta.env.MODE}]:`, url);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
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

    return await response.json();
  } catch (error) {
    console.error(`❌ API Fetch Error [${url}]:`, error);
    throw error;
  }
};