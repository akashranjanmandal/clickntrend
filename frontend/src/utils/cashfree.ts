import { apiFetch } from './api';

/**
 * Cashfree checkout helpers. The order details are kept in the browser between paying and
 * saving the order, so a UPI app / bank page that redirects back to
 * /order-confirmation?cf_order_id=… can still finish the order.
 */
declare global {
  interface Window { Cashfree?: (opts: { mode: 'sandbox' | 'production' }) => any }
}

const PENDING_KEY = 'gftd_pending_payment';

export interface PendingPayment { order_id: string; order_data: any; created_at: number }

export function savePendingPayment(p: PendingPayment) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* storage full/blocked */ }
}

export function readPendingPayment(orderId: string): PendingPayment | null {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    return p && p.order_id === orderId ? p : null;
  } catch { return null; }
}

export function clearPendingPayment() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

export function loadCashfree(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Cashfree) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve(!!window.Cashfree);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Asks the backend to confirm the payment with Cashfree and save the order (safe to call twice) */
export function verifyCashfreePayment(orderId: string, orderData: any) {
  return apiFetch<{ success: boolean; order?: { id: string; custom_order_id: string }; error?: string }>(
    '/api/payment/cashfree/verify',
    { method: 'POST', body: JSON.stringify({ order_id: orderId, order_data: orderData }) }
  );
}
