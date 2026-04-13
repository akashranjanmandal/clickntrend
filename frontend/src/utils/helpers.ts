import { CONFIG } from '../config';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// R2 public URL — same as in backend .env
const R2_PUBLIC_URL = 'https://pub-752ba93a5e064cf8859fe2482df6930f.r2.dev';

const FALLBACK_IMAGE = '/logo.png';

// Broken external placeholder services to silently replace with our fallback
const BROKEN_PLACEHOLDER_HOSTS = [
  'via.placeholder.com',
  'placehold.co',
  'placeholder.com',
  'dummyimage.com',
  'unsplash.com',
];

export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return FALLBACK_IMAGE;
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http') || path.startsWith('https')) {
    try {
      const hostname = new URL(path).hostname;
      if (BROKEN_PLACEHOLDER_HOSTS.some(h => hostname.includes(h))) {
        return FALLBACK_IMAGE;
      }
    } catch {
      // invalid URL — fall through
    }
    return path;
  }
  // Bare filename (e.g. "birthday-cake.jpg") or relative path — use R2
  // Products uploaded via admin already have full https:// URLs
  // Seed data has bare filenames — try R2 products folder
  if (!path.includes('/')) {
    return `${R2_PUBLIC_URL}/products/${path}`;
  }
  // Has a path separator — try R2 root
  return `${R2_PUBLIC_URL}/${path}`;
};


/**
 * Get the best display image for a product.
 * If the product has color variants, returns the first active color's image.
 * Falls back to product.image_url.
 * Pass selectedColorImageUrl to override (e.g. when user picked a specific color).
 */
export const getProductImage = (
  product: { image_url?: string | null; has_colors?: boolean; colors?: Array<{ is_active?: boolean; image_url?: string }> | null },
  selectedColorImageUrl?: string | null
): string => {
  if (selectedColorImageUrl) return selectedColorImageUrl;
  if (product?.has_colors && product.colors && product.colors.length > 0) {
    const firstActive = product.colors.find(c => c.is_active !== false);
    if (firstActive?.image_url) return firstActive.image_url;
  }
  return product?.image_url || '';
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