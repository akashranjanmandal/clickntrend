import { CONFIG } from '../config';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Types for image optimization options
interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number | 'auto';
  format?: 'auto' | 'webp' | 'jpg' | 'png';
}

/**
 * Get image URL with support for Cloudinary, Supabase, and fallback images
 */
export const getImageUrl = (path: string | undefined | null): string => {
  // If no path provided, return fallback image
  if (!path) {
    return 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&h=400&fit=crop';
  }

  // If it's already a full URL (http, https), use it directly
  if (path.startsWith('http')) {
    return path;
  }

  // If it's a data URL, use it directly
  if (path.startsWith('data:')) {
    return path;
  }

  // Check if it's a Cloudinary URL (stored as path)
  if (path.includes('cloudinary') || path.includes('res.cloudinary.com')) {
    // Ensure it has https protocol
    if (!path.startsWith('http')) {
      return `https://${path}`;
    }
    return path;
  }

  // For backward compatibility with existing Supabase paths
  // Check if it's a Supabase storage path
  if (path.includes('supabase.co') || path.includes('storage')) {
    if (!path.startsWith('http')) {
      return `https://${path}`;
    }
    return path;
  }

  // If it's a relative path (product-xxx.jpg, logo/xxx.png, etc.)
  // Try Cloudinary first (if configured), then fallback to Supabase
  if (CONFIG.CLOUDINARY_BASE_URL) {
    // Assuming images are stored in Cloudinary with folder structure
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${CONFIG.CLOUDINARY_BASE_URL}/giftshop/${cleanPath}`;
  }

  // Fallback to Supabase storage
  return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/giftshop/${path}`;
};

/**
 * Get optimized Cloudinary URL with transformations
 */
export const getOptimizedImageUrl = (
  url: string | undefined | null,
  options?: ImageOptions
): string => {
  const imageUrl = getImageUrl(url);
  
  // If not a Cloudinary URL, return as is
  if (!imageUrl.includes('cloudinary') && !imageUrl.includes('res.cloudinary.com')) {
    return imageUrl;
  }

  const { width, height, quality, format = 'auto' } = options || {};
  
  // Build Cloudinary transformations
  const transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (width || height) transformations.push('c_fill');
  
  // Handle quality - can be number or 'auto'
  if (quality === 'auto') {
    transformations.push('q_auto');
  } else if (typeof quality === 'number' && quality > 0 && quality <= 100) {
    transformations.push(`q_${quality}`);
  }
  
  // Handle format
  if (format === 'auto') {
    transformations.push('f_auto');
  } else if (format) {
    transformations.push(`f_${format}`);
  }
  
  if (transformations.length === 0) {
    return imageUrl;
  }

  // Insert transformations into Cloudinary URL
  // Format: https://res.cloudinary.com/cloud-name/image/upload/v123456/...
  return imageUrl.replace('/upload/', `/upload/${transformations.join(',')}/`);
};

/**
 * Get image as WebP format for better performance
 */
export const getWebPImageUrl = (url: string | undefined | null, width?: number): string => {
  return getOptimizedImageUrl(url, {
    width,
    format: 'webp',
    quality: 'auto'
  });
};

/**
 * Get thumbnail version of image
 */
export const getThumbnailUrl = (url: string | undefined | null): string => {
  return getOptimizedImageUrl(url, {
    width: 150,
    height: 150,
    format: 'auto',
    quality: 'auto'
  });
};

/**
 * Get responsive image srcSet for different screen sizes
 */
export const getSrcSet = (url: string | undefined | null, sizes: number[] = [400, 800, 1200]): string => {
  const baseUrl = getImageUrl(url);
  
  // If not a Cloudinary URL, return empty string
  if (!baseUrl.includes('cloudinary') && !baseUrl.includes('res.cloudinary.com')) {
    return '';
  }

  return sizes
    .map(size => `${getOptimizedImageUrl(url, { width: size, quality: 'auto' })} ${size}w`)
    .join(', ');
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