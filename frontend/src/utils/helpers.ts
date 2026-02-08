import { CONFIG } from '../config';
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return '/placeholder.jpg';
  if (path.startsWith('http')) return path;
  return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/giftshop/${path}`;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};