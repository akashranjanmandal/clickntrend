import { CONFIG } from '../config';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&h=400&fit=crop';
  if (path.startsWith('http')) return path;
  if (path.startsWith('data:')) return path;
  return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/GiftShop/${path}`;
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