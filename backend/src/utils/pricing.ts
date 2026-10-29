import { pool } from './db';
import { getPaymentSettings } from './paymentSettings';
import { evaluateCoupon } from './coupons';

/**
 * Server-side order pricing — the browser's prices are never trusted.
 *
 * Unit price rules (agreed with the shop):
 *   product            = price + colour extra + size extra + personalisation fee (only if personalised)
 *   ready-made combo   = combo price (discount_price, else sum of its products)
 *   custom combo       = sum of its products by the product rule, minus the quantity discount
 * Then: shipping (free from ₹499, else ₹79) + COD fee (settings) − coupon (server-validated).
 */
export const SHIPPING = { freeAbove: 499, charge: 79 };
/** Custom combo quantity discounts (also shown in the builder) — 10+ items keep 30% */
export const CUSTOM_COMBO_TIERS = [
  { minItems: 10, discount: 30 }, { minItems: 6, discount: 25 }, { minItems: 5, discount: 15 }, { minItems: 3, discount: 10 },
];

export class PricingError extends Error {
  constructor(message: string, public status = 400, public extra: Record<string, any> = {}) { super(message); }
}

const UUID_IN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const round2 = (n: number) => Math.round(n * 100) / 100;
const uuidIn = (v: any) => (typeof v === 'string' ? v.match(UUID_IN)?.[0]?.toLowerCase() : undefined);
const qtyOf = (v: any, max = 50) => {
  const q = Number(v);
  if (!Number.isInteger(q) || q < 1 || q > max) throw new PricingError('Invalid quantity in cart.');
  return q;
};
const isPersonalised = (c: any) =>
  !!c && ((Array.isArray(c.text_lines) && c.text_lines.some((t: any) => String(t).trim())) ||
          (Array.isArray(c.image_urls) && c.image_urls.length > 0));

export interface PricedOrder {
  items: any[];
  subtotal: number;
  shipping_charge: number;
  cod_charge: number;
  coupon_code: string | null;
  coupon_discount: number;
  total_amount: number;
}

export async function priceOrder(orderData: any, method: 'online' | 'cod'): Promise<PricedOrder> {
  const items: any[] = Array.isArray(orderData?.items) ? orderData.items : [];
  if (items.length === 0) throw new PricingError('Your cart is empty.');
  if (items.length > 50) throw new PricingError('Too many items in one order.');

  // Collect everything referenced, then load it in a few queries
  const productIds = new Set<string>(), colorIds = new Set<string>(), sizeIds = new Set<string>(), comboIds = new Set<string>();
  const noteVariant = (o: any) => {
    const c = uuidIn(o.color_id); if (c) colorIds.add(c);
    const s = uuidIn(o.size_id); if (s) sizeIds.add(s);
  };
  for (const item of items) {
    if (Array.isArray(item.combo_products)) {
      const comboId = uuidIn(String(item.id || '').replace(/^combo-/, ''));
      if (comboId) comboIds.add(comboId);
      for (const cp of item.combo_products) { const p = uuidIn(cp.id); if (p) productIds.add(p); noteVariant(cp); }
    } else {
      const p = uuidIn(item.product_id) || uuidIn(item.id); if (p) productIds.add(p); noteVariant(item);
    }
  }

  const [products, colors, sizes, combos, categories] = await Promise.all([
    pool.query('SELECT id, name, price, customization_price, is_active, is_customizable FROM products WHERE id = ANY($1::uuid[])', [[...productIds]]),
    pool.query('SELECT id, product_id, price_modifier, is_active FROM product_colors WHERE id = ANY($1::uuid[])', [[...colorIds]]),
    pool.query('SELECT id, product_id, price_modifier, is_active FROM product_sizes WHERE id = ANY($1::uuid[])', [[...sizeIds]]),
    pool.query(
      `SELECT c.id, c.is_active, c.discount_price, COALESCE(SUM(p.price * cp.quantity), 0) AS mrp
       FROM combos c LEFT JOIN combo_products cp ON cp.combo_id = c.id LEFT JOIN products p ON p.id = cp.product_id
       WHERE c.id = ANY($1::uuid[]) GROUP BY c.id`, [[...comboIds]]),
    pool.query(
      `SELECT pc.product_id, c.name FROM product_categories pc JOIN categories c ON c.id = pc.category_id
       WHERE pc.product_id = ANY($1::uuid[])`, [[...productIds]]),
  ]);
  const productById = new Map(products.rows.map((r: any) => [r.id, r]));
  const colorById = new Map(colors.rows.map((r: any) => [r.id, r]));
  const sizeById = new Map(sizes.rows.map((r: any) => [r.id, r]));
  const comboById = new Map(combos.rows.map((r: any) => [r.id, r]));

  const unitPrice = (ref: any): number => {
    const productId = uuidIn(ref.product_id) || uuidIn(ref.id);
    const product: any = productId && productById.get(productId);
    if (!product || !product.is_active) throw new PricingError(`"${ref.name || 'An item'}" is no longer available. Please remove it from your cart.`, 409, { code: 'ITEM_UNAVAILABLE' });
    let price = Number(product.price) || 0;
    for (const [id, map] of [[uuidIn(ref.color_id), colorById], [uuidIn(ref.size_id), sizeById]] as const) {
      if (!id) continue;
      const v: any = map.get(id);
      if (!v || v.product_id !== product.id || v.is_active === false) {
        throw new PricingError(`A selected option for "${product.name}" is no longer available.`, 409, { code: 'ITEM_UNAVAILABLE' });
      }
      price += Number(v.price_modifier) || 0;
    }
    if (isPersonalised(ref.customization)) price += Number(product.customization_price) || 0;
    return round2(price);
  };

  let subtotal = 0;
  let nonComboSubtotal = 0;
  const pricedItems = items.map(item => {
    const quantity = qtyOf(item.quantity);
    let unit: number;
    let comboProducts: any[] | undefined;

    if (Array.isArray(item.combo_products)) {
      const comboId = uuidIn(String(item.id || '').replace(/^combo-/, ''));
      const combo: any = comboId && comboById.get(comboId);
      if (combo) {
        // ready-made combo: its own fixed price
        if (!combo.is_active) throw new PricingError(`"${item.name || 'A combo'}" is no longer available.`, 409, { code: 'ITEM_UNAVAILABLE' });
        unit = round2(combo.discount_price != null ? Number(combo.discount_price) : Number(combo.mrp));
        comboProducts = item.combo_products;
      } else {
        // custom combo: each piece by the product rule, then the quantity discount
        if (item.combo_products.length === 0 || item.combo_products.length > 30) throw new PricingError('Invalid combo in cart.');
        let comboSubtotal = 0, count = 0;
        comboProducts = item.combo_products.map((cp: any) => {
          const q = qtyOf(cp.quantity, 20);
          const p = unitPrice(cp);
          comboSubtotal += p * q;
          count += q;
          return { ...cp, quantity: q, price: p };
        });
        const tier = CUSTOM_COMBO_TIERS.find(t => count >= t.minItems);
        unit = round2(comboSubtotal * (1 - (tier?.discount || 0) / 100));
      }
    } else {
      unit = unitPrice(item);
      nonComboSubtotal += unit * quantity;
    }
    subtotal += unit * quantity;
    return { ...item, quantity, price: unit, ...(comboProducts ? { combo_products: comboProducts } : {}) };
  });
  subtotal = round2(subtotal);

  // Coupon — validated again here with the server's own numbers
  let coupon_code: string | null = null;
  let coupon_discount = 0;
  if (orderData.coupon_code) {
    const cartCategories = [...new Set(categories.rows.map((r: any) => r.name))];
    const result = await evaluateCoupon({
      code: orderData.coupon_code,
      subtotal: round2(nonComboSubtotal),
      email: orderData.email,
      categories: cartCategories,
      hasOnlyComboItems: pricedItems.every(i => Array.isArray(i.combo_products)),
    });
    if (!result.valid) throw new PricingError(`Coupon not applied: ${result.message}`, 409, { code: 'COUPON_INVALID' });
    coupon_code = result.coupon!.code;
    coupon_discount = result.coupon!.discount_amount;
  }

  const shipping_charge = subtotal >= SHIPPING.freeAbove ? 0 : SHIPPING.charge;
  const cod_charge = method === 'cod' ? (await getPaymentSettings()).cod_charge : 0;
  const total_amount = Math.max(round2(subtotal + shipping_charge + cod_charge - coupon_discount), 0);

  return { items: pricedItems, subtotal, shipping_charge, cod_charge, coupon_code, coupon_discount, total_amount };
}

/**
 * The customer must pay what they saw. If the cart's total differs from the server's
 * (a price changed while it sat in the cart), stop with the new prices so the cart can update.
 */
export function assertTotalsMatch(orderData: any, priced: PricedOrder) {
  const shown = Number(orderData?.total_amount);
  if (!Number.isFinite(shown) || Math.abs(shown - priced.total_amount) > 0.5) {
    throw new PricingError(
      `Prices have changed since you added these items. Your new total is ₹${priced.total_amount.toLocaleString('en-IN')}. Please review your cart and place the order again.`,
      409,
      { code: 'PRICE_CHANGED', total_amount: priced.total_amount, items: priced.items.map(i => ({ id: i.id, price: i.price })) }
    );
  }
}

/** Order fields with server-calculated money values */
export const withServerPrices = (orderData: any, priced: PricedOrder) => ({
  ...orderData,
  items: priced.items,
  subtotal: priced.subtotal,
  shipping_charge: priced.shipping_charge,
  cod_charge: priced.cod_charge,
  coupon_code: priced.coupon_code,
  coupon_discount: priced.coupon_discount,
  total_amount: priced.total_amount,
});
