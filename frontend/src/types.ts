export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  image_url: string;
  additional_images?: string[];  
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  // New customization fields
  is_customizable?: boolean;
  customization_price?: number;
  customization_types?: string[];
  max_customization_characters?: number;
}

export interface CustomizationData {
  text?: string;
  image_url?: string;
  image_path?: string;
  preview_url?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  type: 'product' | 'combo' | 'custom';
  category?: string;
  customization?: CustomizationData;
}

export interface ComboProduct {
  product: Product;
  quantity: number;
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  discount_percentage?: number;
  discount_price?: number;
  image_url?: string;
  is_active: boolean;
  combo_products?: ComboProduct[];
  products?: ComboProduct[];
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
  product?: { name: string };
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

export interface Order {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  items: CartItem[];
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  special_requests?: string;
  status: string;
  tracking_number?: string;
  admin_notes?: string;
  paid_at?: string;
  created_at: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  shipping_country?: string;
  shipping_method?: string;
  shipping_cost?: number;
  estimated_delivery?: string;
  payment_method?: string;
  coupon_code?: string;
  coupon_discount?: number;
  shipping_charge?: number;
  cod_charge?: number;
  subtotal?: number;
  grand_total?: number;
  customization_data?: any;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit: number;
  used_count: number;
  per_user_limit: number;
  start_date?: string;
  end_date?: string;
  applicable_categories?: string[];
  is_active: boolean;
  created_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  order_id: string;
  customer_email: string;
  discount_amount: number;
  used_at: string;
}