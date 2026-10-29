import { pool } from './db';

export interface CouponResult {
  valid: boolean;
  status: number;
  message?: string;
  coupon?: { id: string; code: string; discount_type: string; discount_value: number; discount_amount: number };
}

/**
 * The one set of coupon rules, used by POST /api/coupons/validate (to show the discount)
 * and by order pricing (to apply it). `subtotal` is the value of the non-combo items.
 */
export async function evaluateCoupon(input: {
  code: string; subtotal: number; email?: string; categories?: string[]; hasOnlyComboItems?: boolean;
}): Promise<CouponResult> {
  const code = String(input.code || '').trim().toUpperCase();
  if (!code) return { valid: false, status: 400, message: 'Coupon code is required' };
  if (input.hasOnlyComboItems) return { valid: false, status: 400, message: 'Coupons cannot be applied to combo orders' };

  const { rows } = await pool.query('SELECT * FROM coupons WHERE code = $1 AND is_active = true', [code]);
  if (rows.length === 0) return { valid: false, status: 404, message: 'Invalid coupon code' };

  // Postgres returns numeric columns as text — convert before doing any maths
  const raw = rows[0];
  const num = (v: any) => (v === null || v === undefined ? null : Number(v));
  const coupon = { ...raw, discount_value: Number(raw.discount_value), min_order_amount: num(raw.min_order_amount), max_discount_amount: num(raw.max_discount_amount) };
  const subtotal = Number(input.subtotal) || 0;

  if (coupon.end_date && new Date(coupon.end_date) < new Date()) return { valid: false, status: 400, message: 'Coupon has expired' };
  if (coupon.start_date && new Date(coupon.start_date) > new Date()) return { valid: false, status: 400, message: 'Coupon is not active yet' };
  if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
    return { valid: false, status: 400, message: `Minimum order amount should be ₹${coupon.min_order_amount}` };
  }
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return { valid: false, status: 400, message: 'Coupon usage limit exceeded' };

  if (input.email && coupon.per_user_limit) {
    const usage = await pool.query('SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = $1 AND customer_email = $2',
      [coupon.id, String(input.email).trim().toLowerCase()]);
    const count = parseInt(usage.rows[0].count);
    if (count >= coupon.per_user_limit) return { valid: false, status: 400, message: `You have already used this coupon ${count} times` };
  }

  const categories = input.categories || [];
  if (coupon.applicable_categories?.length > 0 && categories.length > 0
      && !categories.some(c => coupon.applicable_categories.includes(c))) {
    return { valid: false, status: 400, message: 'Coupon not applicable for items in your cart' };
  }

  let discount = coupon.discount_type === 'percentage' ? (subtotal * coupon.discount_value) / 100 : coupon.discount_value;
  if (coupon.discount_type === 'percentage' && coupon.max_discount_amount) discount = Math.min(discount, coupon.max_discount_amount);
  discount = Math.min(Math.round(discount * 100) / 100, subtotal); // never more than the items it applies to

  return {
    valid: true, status: 200,
    coupon: { id: coupon.id, code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value, discount_amount: discount },
  };
}
