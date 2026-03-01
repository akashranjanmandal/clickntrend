import { useCallback } from 'react';
import { apiFetch } from '../config';

export const useApi = () => {
  const token = localStorage.getItem('admin_token');

  const fetchWithAuth = useCallback(async <T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    if (!token) {
      window.location.href = '/admin';
      throw new Error('No admin token found');
    }

    // Use type assertion instead of generic parameter
    return apiFetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    }) as Promise<T>;
  }, [token]);

  return { fetchWithAuth };
};