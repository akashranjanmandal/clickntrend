import crypto from 'crypto';
import config from '../config';

/**
 * Minimal Cashfree Payment Gateway client (PG API version 2023-08-01).
 * Docs: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create
 */
const API_VERSION = '2023-08-01';
const BASE_URL = config.cashfreeEnv === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

export class CashfreeError extends Error {
  constructor(message: string, public status: number, public body: any) { super(message); }
}

async function call<T = any>(path: string, init: { method?: string; body?: any; idempotencyKey?: string } = {}): Promise<T> {
  if (!config.cashfreeAppId || !config.cashfreeSecretKey) {
    throw new CashfreeError('Cashfree is not configured (CASHFREE_APP_ID / CASHFREE_SECRET_KEY missing)', 500, null);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method || 'GET',
    headers: {
      'x-client-id': config.cashfreeAppId,
      'x-client-secret': config.cashfreeSecretKey,
      'x-api-version': API_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.idempotencyKey ? { 'x-idempotency-key': init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new CashfreeError(body?.message || `Cashfree request failed (${res.status})`, res.status, body);
  return body as T;
}

export interface CashfreeOrder {
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED';
  payment_session_id: string;
  customer_details?: { customer_name?: string; customer_email?: string; customer_phone?: string };
}

export const createOrder = (order: {
  order_id: string;
  order_amount: number;
  customer: { id: string; name: string; email: string; phone: string };
  return_url?: string;
  notify_url?: string;
  note?: string;
}) => call<CashfreeOrder>('/orders', {
  method: 'POST',
  body: {
    order_id: order.order_id,
    order_amount: order.order_amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: order.customer.id,
      customer_name: order.customer.name,
      customer_email: order.customer.email,
      customer_phone: order.customer.phone,
    },
    order_meta: {
      ...(order.return_url ? { return_url: order.return_url } : {}),
      ...(order.notify_url ? { notify_url: order.notify_url } : {}),
    },
    ...(order.note ? { order_note: order.note.slice(0, 200) } : {}),
  },
});

export const getOrder = (orderId: string) => call<CashfreeOrder>(`/orders/${encodeURIComponent(orderId)}`);

export const getOrderPayments = (orderId: string) =>
  call<Array<{ cf_payment_id: string | number; payment_status: string; payment_amount: number; payment_group?: string }>>(
    `/orders/${encodeURIComponent(orderId)}/payments`
  );

export const createRefund = (orderId: string, refund: { refund_amount: number; refund_id: string; refund_note?: string }) =>
  call(`/orders/${encodeURIComponent(orderId)}/refunds`, { method: 'POST', body: refund, idempotencyKey: refund.refund_id });

/** Webhooks are signed: base64(HMAC-SHA256(timestamp + rawBody, secret key)) */
export function isValidWebhookSignature(rawBody: string, timestamp: string | undefined, signature: string | undefined) {
  if (!rawBody || !timestamp || !signature) return false;
  const expected = crypto.createHmac('sha256', config.cashfreeSecretKey).update(timestamp + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const cashfreeMode = config.cashfreeEnv;
