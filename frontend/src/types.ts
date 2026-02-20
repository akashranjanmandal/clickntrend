export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_name: string;
  user_email?: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  icon_type?: 'emoji' | 'lucide';
  color: string;
  hover_effect?: string;
  display_order: number;
  is_active: boolean;
}

export interface HeroContent {
  id: string;
  title: string;
  subtitle: string;
  media_type: 'image' | 'video';
  media_url: string;
  video_poster_url?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  cta_text?: string;
  cta_link?: string;
  is_active: boolean;
  display_order: number;
}

export interface Stat {
  label: string;
  value: string;
  icon: string;
}

export interface SiteSettings {
  hero_sections: HeroContent[];
  featured_categories: string[];
  stats: Stat[];
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  type: 'product' | 'combo' | 'custom';
  category?: string;
}