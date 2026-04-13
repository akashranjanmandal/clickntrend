import express, { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '../config';
import { pool } from '../utils/db';
import {
  sendOrderConfirmationEmail,
  sendAdminNotification,
} from '../services/gmailService';

const router = express.Router();

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

const razorpay = new Razorpay({
  key_id: config.razorpayKeyId,
  key_secret: config.razorpayKeySecret,
});

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const options = {
      amount: Math.round(amount),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error: any) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Verify payment and save order
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_data } = req.body;

    console.log('=== PAYMENT VERIFICATION START ===');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }
    if (!order_data?.name || !order_data?.email || !order_data?.phone) {
      return res.status(400).json({ success: false, error: 'Missing customer information' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(order_data.email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(order_data.phone.replace(/\D/g, ''))) {
      return res.status(400).json({ success: false, error: 'Invalid phone number. Please enter 10 digits' });
    }

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.log('❌ Invalid payment signature');
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    console.log('✅ Payment signature verified');

    const custom_order_id = await generateCustomOrderId();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO orders
         (custom_order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature,
          items, subtotal, shipping_charge, coupon_code, coupon_discount, total_amount,
          customer_name, customer_email, customer_phone, special_requests,
          shipping_address, shipping_city, shipping_state, shipping_pincode,
          shipping_country, payment_method, status, paid_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [
        custom_order_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        JSON.stringify(order_data.items || []),
        order_data.subtotal || 0,
        order_data.shipping_charge || 0,
        order_data.coupon_code || null,
        order_data.coupon_discount || 0,
        order_data.total_amount || 0,
        (order_data.name || '').trim(),
        (order_data.email || '').trim().toLowerCase(),
        (order_data.phone || '').replace(/\D/g, ''),
        (order_data.special_requests || '').trim(),
        (order_data.address || '').trim(),
        (order_data.city || '').trim(),
        (order_data.state || '').trim(),
        (order_data.pincode || '').trim(),
        'India',
        'online',
        'paid',
        now,
        now,
        now,
      ]
    );

    const order = result.rows[0];
    console.log('✅ Order saved:', order.custom_order_id);

    // Track coupon usage
    if (order_data.coupon_code && order_data.coupon_discount > 0) {
      try {
        const couponResult = await pool.query(
          'SELECT id FROM coupons WHERE code = $1',
          [order_data.coupon_code.toUpperCase()]
        );
        if (couponResult.rows.length > 0) {
          const coupon = couponResult.rows[0];
          await pool.query(
            `INSERT INTO coupon_usage (coupon_id, order_id, customer_email, discount_amount, used_at)
             VALUES ($1,$2,$3,$4,$5)`,
            [coupon.id, order.id, order_data.email, order_data.coupon_discount, now]
          );
          // ✅ Replaces supabase.rpc('increment', { x: 1 }) — plain SQL
          await pool.query(
            `UPDATE coupons SET used_count = used_count + 1, updated_at = $1 WHERE id = $2`,
            [now, coupon.id]
          );
          console.log('✅ Coupon usage tracked for order:', order.id);
        }
      } catch (couponError) {
        console.error('⚠️ Error tracking coupon:', couponError);
      }
    }

    // Send emails async — don't block response
    Promise.allSettled([
      sendOrderConfirmationEmail(order).then((r: any) =>
        r.success
          ? console.log('✅ Customer email sent:', order.custom_order_id)
          : console.error('❌ Customer email failed:', r.error)
      ),
      sendAdminNotification(order).then((r: any) =>
        r.success
          ? console.log('✅ Admin notification sent:', order.custom_order_id)
          : console.error('❌ Admin notification failed:', r.error)
      ),
    ]);

    console.log('=== PAYMENT VERIFICATION END ===');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order: {
        id: order.id,
        custom_order_id: order.custom_order_id,
        tracking_id: order.custom_order_id,
        payment_id: razorpay_payment_id,
        amount: order.total_amount,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        created_at: order.created_at,
      },
    });
  } catch (error: any) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      details: error.message,
    });
  }
});

// Get payment details by Razorpay order ID
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

// Refund payment (admin only)
router.post('/refund/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, notes } = req.body;

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE razorpay_payment_id = $1',
      [paymentId]
    );
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderResult.rows[0];

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined,
      notes: {
        order_id: order.id,
        custom_order_id: order.custom_order_id,
        reason: notes || 'Customer requested refund',
      },
    });

    await pool.query(
      `UPDATE orders
       SET status = 'refunded', refund_data = $1, refunded_at = $2, updated_at = $3
       WHERE id = $4`,
      [JSON.stringify(refund), new Date().toISOString(), new Date().toISOString(), order.id]
    );

    console.log('✅ Refund processed for order:', order.custom_order_id);
    res.json({ success: true, message: 'Refund processed successfully', refund });
  } catch (error: any) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, error: 'Failed to process refund', details: error.message });
  }
});

export default router;
