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

export interface Combo {
  id: string;
  name: string;
  description: string;
  discount_percentage?: number;
  discount_price?: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  combo_products?: {
    quantity: number;
    product: Product;
  }[];
}
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  type: 'product' | 'combo' | 'custom';
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
  
  // Shipping address fields
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  shipping_country?: string;
  
  special_requests?: string;
  status: string;
  tracking_number?: string;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}