export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  image_url: string;
  additional_images?: string[];
  categories?: Category[];
  category?: string; 
  subcategory?: string;
  gender: 'men' | 'women' | 'unisex';
  stock_quantity: number;
  sku: string;
  is_customizable: boolean;
  customization_price?: number;
  max_customization_characters?: number;
  max_customization_images?: number;
  max_customization_lines?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  social_proof_enabled: boolean;
  social_proof_text: string;
  social_proof_initial_count: number;
  social_proof_end_count: number;
}

export interface CustomizationData {
  text_lines?: string[];      
  image_urls?: string[];       
  image_paths?: string[];
  preview_urls?: string[];
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  discount_percentage?: number;
  discount_price?: number;
  image_url?: string;
  categories?: Category[]; 
  category?: string; 
  is_active: boolean;
  combo_products?: ComboProduct[];
  products?: ComboProduct[];
  created_at: string;
}

export interface ComboProduct {
  product: Product;
  quantity: number;
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
  description?: string;
  icon?: string;
  icon_type?: 'emoji' | 'lucide';
  color?: string;
  hover_effect?: string;
  display_order: number;
  is_active: boolean;
  gender?: 'men' | 'women' | 'unisex';
  created_at?: string;
  updated_at?: string;
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
  content_alignment?: 'left' | 'center' | 'right';
  is_active: boolean;
  display_order: number;
  created_at: string;
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
  customization?: CustomizationData;
  description?: string;
}

// Extended interface for combo items
export interface ComboCartItem extends CartItem {
  combo_id: string;
  combo_name?: string;
  is_combo_item?: boolean;
}


export interface Order {
  id: string;
  custom_order_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  items: any[];
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  shipping_country?: string;
  status: string;
  tracking_number?: string;
  admin_notes?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
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

export interface PopupConfig {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  discount_text: string;
  discount_value: string;
  timer_enabled: boolean;
  timer_hours: number;
  timer_minutes: number;
  timer_seconds: number;
  offer_text: string;
  cta_text: string;
  cta_link?: string;
  cash_on_delivery_text: string;
  prepaid_discount_text: string;
  is_active: boolean;
  display_frequency: 'once_per_session' | 'always' | 'once_per_day';
  start_date?: string;
  end_date?: string;
}

export interface Gender {
  id: string;
  name: 'men' | 'women' | 'unisex';
  display_name: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}