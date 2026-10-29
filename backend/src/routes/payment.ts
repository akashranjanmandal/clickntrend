import { requireAuth } from '../middleware/auth';
import express from 'express';
import crypto from 'crypto';
import config from '../config';
import { pool } from '../utils/db';
import {
  sendOrderConfirmationEmail,
  sendAdminNotification,
} from '../services/gmailService';
import {
  createOrder as cfCreateOrder, getOrder as cfGetOrder, getOrderPayments as cfGetOrderPayments,
  createRefund as cfCreateRefund, isValidWebhookSignature, cashfreeMode, CashfreeError,
} from '../utils/cashfree';

const router = express.Router();

/*
 * Online payments run on Cashfree. No schema change: the gateway ids are stored in the
 * existing orders.razorpay_order_id / razorpay_payment_id columns. Cashfree order ids start
 * with "GFTD_"; older Razorpay ones start with "order_".
 */
const CASHFREE_PREFIX = 'GFTD_';
const isCashfreeOrder = (gatewayOrderId?: string | null) => !!gatewayOrderId && gatewayOrderId.startsWith(CASHFREE_PREFIX);

// Generate custom order ID
async function generateCustomOrderId(): Promise<string> {
  try {
    const result = await pool.query(
      'SELECT custom_order_id FROM orders ORDER BY created_at DESC LIMIT 1'
    );
    let nextNumber = 100;
    if (result.rows[0]?.custom_order_id) {
      const match = result.rows[0].custom_order_id.match(/GFTD#(\d+)/);
      if (match) nextNumber = parseInt(match[1]) + 1;
    }
    return `GFTD#${nextNumber}`;
  } catch (error) {
    console.error('Error generating custom order ID:', error);
    return `GFTD#${Date.now()}`;
  }
}

/** Customer details checks shared by create + verify */
function customerProblem(order_data: any): string | null {
  if (!order_data?.name || !order_data?.email || !order_data?.phone) return 'Missing customer information';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order_data.email)) return 'Invalid email format';
  if (!/^\d{10}$/.test(String(order_data.phone).replace(/\D/g, ''))) return 'Invalid phone number. Please enter 10 digits';
  return null;
}

const amountOf = (order_data: any) => Math.round((Number(order_data?.total_amount) || 0) * 100) / 100;

/**
 * Saves a paid online order exactly once per gateway order id. A transaction-level advisory
 * lock serialises the checkout callback and the return-page callback for the same payment.
 */
async function savePaidOrder(order_data: any, gateway: { orderId: string; paymentId: string | null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [gateway.orderId]);

    const existing = await client.query('SELECT * FROM orders WHERE razorpay_order_id = $1 LIMIT 1', [gateway.orderId]);
    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return { order: existing.rows[0], created: false };
    }

    const custom_order_id = await generateCustomOrderId();
    const now = new Date().toISOString();
    const result = await client.query(
      `INSERT INTO orders
         (custom_order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature,
          items, subtotal, shipping_charge, coupon_code, coupon_discount, total_amount,
          customer_name, customer_email, customer_phone, customer_alt_phone, special_requests,
          shipping_address, shipping_city, shipping_state, shipping_pincode,
          shipping_country, payment_method, status, payment_status, paid_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       RETURNING *`,
      [
        custom_order_id,
        gateway.orderId,
        gateway.paymentId,
        null,
        JSON.stringify(order_data.items || []),
        order_data.subtotal || 0,
        order_data.shipping_charge || 0,
        order_data.coupon_code || null,
        order_data.coupon_discount || 0,
        amountOf(order_data),
        (order_data.name || '').trim(),
        (order_data.email || '').trim().toLowerCase(),
        (order_data.phone || '').replace(/\D/g, ''),
        (order_data.alt_phone || '').replace(/\D/g, '') || null,
        (order_data.special_requests || '').trim(),
        (order_data.address || '').trim(),
        (order_data.city || '').trim(),
        (order_data.state || '').trim(),
        (order_data.pincode || '').trim(),
        'India',
        'online',
        'paid',
        'paid',
        now,
        now,
        now,
      ]
    );
    const order = result.rows[0];

    // Track coupon usage
    if (order_data.coupon_code && order_data.coupon_discount > 0) {
      const couponResult = await client.query('SELECT id FROM coupons WHERE code = $1', [String(order_data.coupon_code).toUpperCase()]);
      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0];
        await client.query(
          `INSERT INTO coupon_usage (coupon_id, order_id, customer_email, discount_amount, used_at) VALUES ($1,$2,$3,$4,$5)`,
          [coupon.id, order.id, order_data.email, order_data.coupon_discount, now]
        );
        await client.query(`UPDATE coupons SET used_count = used_count + 1, updated_at = $1 WHERE id = $2`, [now, coupon.id]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Order saved:', order.custom_order_id);

    // Emails don't block the response
    Promise.allSettled([
      sendOrderConfirmationEmail(order).then((r: any) =>
        r.success ? console.log('✅ Customer email sent:', order.custom_order_id) : console.error('❌ Customer email failed:', r.error)),
      sendAdminNotification(order).then((r: any) =>
        r.success ? console.log('✅ Admin notification sent:', order.custom_order_id) : console.error('❌ Admin notification failed:', r.error)),
    ]);

    return { order, created: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const orderSummary = (order: any) => ({
  id: order.id,
  custom_order_id: order.custom_order_id,
  tracking_id: order.custom_order_id,
  payment_id: order.razorpay_payment_id,
  amount: order.total_amount,
  customer_name: order.customer_name,
  customer_email: order.customer_email,
  created_at: order.created_at,
});

// ── Cashfree ─────────────────────────────────────────────────────────────────

// Step 1: create a Cashfree order; the browser opens Cashfree checkout with payment_session_id
router.post('/cashfree/create-order', async (req, res) => {
  try {
    const { order_data } = req.body;
    const problem = customerProblem(order_data);
    if (problem) return res.status(400).json({ success: false, error: problem });

    const amount = amountOf(order_data);
    if (amount < 1) return res.status(400).json({ success: false, error: 'Invalid order amount' });

    const phone = String(order_data.phone).replace(/\D/g, '');
    const orderId = `${CASHFREE_PREFIX}${crypto.randomUUID().replace(/-/g, '')}`;
    // Cashfree (production) only accepts https return/notify URLs, so both are skipped when the
    // site runs on http (local development); the checkout popup still completes the order.
    const isHttps = config.clientUrl.startsWith('https://');
    const notifyUrl = isHttps ? `${config.clientUrl}/api/payment/cashfree/webhook` : undefined;

    const cfOrder = await cfCreateOrder({
      order_id: orderId,
      order_amount: amount,
      customer: { id: `cust_${phone}`, name: String(order_data.name).trim().slice(0, 100), email: String(order_data.email).trim().toLowerCase(), phone },
      // If a UPI app / bank page redirects instead of returning to the popup, the
      // confirmation page finishes the order ({order_id} is filled in by Cashfree)
      return_url: isHttps ? `${config.clientUrl}/order-confirmation?cf_order_id={order_id}` : undefined,
      notify_url: notifyUrl,
      note: `GFTD order — ${(order_data.items || []).length} item(s)`,
    });

    res.json({ success: true, order_id: cfOrder.order_id, payment_session_id: cfOrder.payment_session_id, mode: cashfreeMode });
  } catch (error: any) {
    console.error('Cashfree create-order error:', error instanceof CashfreeError ? error.body : error);
    res.status(502).json({ success: false, error: 'Could not start the payment. Please try again.', details: error.message });
  }
});

// Step 2: after checkout, confirm with Cashfree that the order is PAID (for the same amount), then save it
router.post('/cashfree/verify', async (req, res) => {
  try {
    const { order_id, order_data } = req.body;
    if (!isCashfreeOrder(order_id)) return res.status(400).json({ success: false, error: 'Invalid payment reference' });

    // Already saved (popup + return page both call this) → return the same order
    const existing = await pool.query('SELECT * FROM orders WHERE razorpay_order_id = $1 LIMIT 1', [order_id]);
    if (existing.rows.length > 0) return res.json({ success: true, order: orderSummary(existing.rows[0]) });

    const problem = customerProblem(order_data);
    if (problem) return res.status(400).json({ success: false, error: problem });

    const cfOrder = await cfGetOrder(order_id);
    if (cfOrder.order_status !== 'PAID') {
      return res.status(402).json({ success: false, status: cfOrder.order_status, error: 'Payment not completed' });
    }
    // The order must be exactly what was paid for
    if (Math.abs(Number(cfOrder.order_amount) - amountOf(order_data)) > 0.01) {
      console.error(`❌ Amount mismatch for ${order_id}: paid ${cfOrder.order_amount}, order says ${amountOf(order_data)}`);
      return res.status(400).json({ success: false, error: 'Payment amount does not match the order. Please contact support.' });
    }

    const payments = await cfGetOrderPayments(order_id).catch(() => []);
    const paid = payments.find(p => p.payment_status === 'SUCCESS');

    const { order } = await savePaidOrder(order_data, { orderId: order_id, paymentId: paid ? String(paid.cf_payment_id) : null });
    res.json({ success: true, message: 'Payment verified successfully', order: orderSummary(order) });
  } catch (error: any) {
    console.error('❌ Cashfree verify error:', error instanceof CashfreeError ? error.body : error);
    res.status(500).json({ success: false, error: 'Payment verification failed', details: error.message });
  }
});

// Cashfree server-to-server notification (sent to the notify_url given at order creation).
// Orders are saved by /cashfree/verify (it has the cart); this logs payments whose order
// never got saved — e.g. the customer closed the browser right after paying.
router.post('/cashfree/webhook', async (req: any, res) => {
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  const timestamp = req.headers['x-webhook-timestamp'] as string | undefined;
  if (!isValidWebhookSignature(req.rawBody || '', timestamp, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  try {
    const event = req.body;
    const orderId: string | undefined = event?.data?.order?.order_id;
    if (event?.type === 'PAYMENT_SUCCESS_WEBHOOK' && orderId) {
      const saved = await pool.query('SELECT custom_order_id FROM orders WHERE razorpay_order_id = $1 LIMIT 1', [orderId]);
      if (saved.rows.length === 0) {
        const c = event?.data?.customer_details || {};
        console.error(`⚠️ Cashfree payment ${orderId} (₹${event?.data?.payment?.payment_amount}) has no saved order yet — ` +
          `customer ${c.customer_name || ''} ${c.customer_phone || ''} ${c.customer_email || ''}. Check Cashfree dashboard.`);
      }
    }
    res.json({ received: true });
  } catch (error: any) {
    console.error('Cashfree webhook error:', error);
    res.json({ received: true }); // acknowledge so Cashfree doesn't retry forever
  }
});

// ── Lookups & refunds ─────────────────────────────────────────────────────────

// Get payment details by gateway order ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(
      `SELECT razorpay_order_id, razorpay_payment_id, payment_method, status, total_amount, custom_order_id
       FROM orders WHERE razorpay_order_id = $1`,
      [orderId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refund (admin). :paymentId is the order's payment id — Cashfree or (older orders) Razorpay.
router.post('/refund/:paymentId', requireAuth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, notes } = req.body;

    const orderResult = await pool.query('SELECT * FROM orders WHERE razorpay_payment_id = $1', [paymentId]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderResult.rows[0];
    const refundAmount = amount ? Number(amount) : Number(order.total_amount);

    let refund: any;
    if (isCashfreeOrder(order.razorpay_order_id)) {
      refund = await cfCreateRefund(order.razorpay_order_id, {
        refund_amount: refundAmount,
        refund_id: `RF_${order.id.replace(/-/g, '').slice(0, 20)}_${Date.now()}`,
        refund_note: (notes || 'Customer requested refund').slice(0, 100),
      });
    } else {
      // Orders paid before the switch to Cashfree
      if (!config.razorpayKeyId || !config.razorpayKeySecret) {
        return res.status(400).json({ success: false, error: 'This order was paid with Razorpay; add the Razorpay keys to refund it, or refund from the Razorpay dashboard.' });
      }
      const Razorpay = (await import('razorpay')).default;
      const razorpay = new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });
      refund = await razorpay.payments.refund(paymentId, {
        amount: Math.round(refundAmount * 100),
        notes: { order_id: order.id, custom_order_id: order.custom_order_id, reason: notes || 'Customer requested refund' },
      });
    }

    await pool.query(
      `UPDATE orders
       SET status = 'refunded', payment_status = 'refunded', refund_data = $1, refunded_at = $2, updated_at = $3
       WHERE id = $4`,
      [JSON.stringify(refund), new Date().toISOString(), new Date().toISOString(), order.id]
    );

    console.log('✅ Refund processed for order:', order.custom_order_id);
    res.json({ success: true, message: 'Refund processed successfully', refund });
  } catch (error: any) {
    console.error('Refund error:', error instanceof CashfreeError ? error.body : error);
    res.status(500).json({ success: false, error: 'Failed to process refund', details: error.message });
  }
});

export default router;
