export const apiFetch = async (
  path: string,
  options: RequestInit = {}
) => {
  const BASE_URL =
    import.meta.env.MODE === 'development'
      ? ''
      : import.meta.env.VITE_API_URL;

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API request failed');
  }

  return response.json();
};