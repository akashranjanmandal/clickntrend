import express, { Request, Response } from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import {
  sendOrderConfirmationEmail,
  sendAdminNotification,
  sendOrderStatusUpdateEmail,
} from '../services/gmailService';

const router = express.Router();

function transformOrder(o: any) {
  return {
    ...o,
    total_amount: parseFloat(o.total_amount) || 0,
    subtotal: o.subtotal != null ? parseFloat(o.subtotal) || 0 : o.subtotal,
    grand_total: o.grand_total != null ? parseFloat(o.grand_total) || 0 : o.grand_total,
    coupon_discount: o.coupon_discount != null ? parseFloat(o.coupon_discount) || 0 : o.coupon_discount,
    shipping_charge: o.shipping_charge != null ? parseFloat(o.shipping_charge) || 0 : o.shipping_charge,
    cod_charge: o.cod_charge != null ? parseFloat(o.cod_charge) || 0 : o.cod_charge,
  };
}

// Generate custom order ID
async function generateCustomOrderId(): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT custom_order_id FROM orders ORDER BY created_at DESC LIMIT 1`
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

// Track order by custom order ID and phone (public)
router.get('/track', async (req: Request, res: Response) => {
  try {
    const { orderId, phone } = req.query;
    if (!orderId || !phone) {
      return res.status(400).json({ error: 'Order ID and phone number are required' });
    }

    const result = await pool.query(
      'SELECT * FROM orders WHERE custom_order_id = $1 AND customer_phone = $2',
      [orderId, phone]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error tracking order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders (admin)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows.map(transformOrder));
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID (admin)
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(transformOrder(result.rows[0]));
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders by phone (public)
router.get('/customer/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const result = await pool.query(
      'SELECT * FROM orders WHERE customer_phone = $1 ORDER BY created_at DESC',
      [phone]
    );
    res.json(result.rows.map(transformOrder));
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status (admin)
router.patch('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [status, new Date().toISOString(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = result.rows[0];

    // Send status update email async
    sendOrderStatusUpdateEmail(order).catch((err: any) =>
      console.error('Error sending status update email:', err)
    );

    res.json({ success: true, order });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create COD order (public)
router.post('/cod', async (req: Request, res: Response) => {
  try {
    const { order_data } = req.body;

    if (!order_data?.name || !order_data?.email || !order_data?.phone) {
      return res.status(400).json({ error: 'Missing customer information' });
    }

    const custom_order_id = await generateCustomOrderId();
    const now = new Date().toISOString();

    const orderRecord = {
      custom_order_id,
      items: JSON.stringify(order_data.items || []),
      subtotal: order_data.subtotal || 0,
      shipping_charge: order_data.shipping_charge || 0,
      coupon_code: order_data.coupon_code || null,
      coupon_discount: order_data.coupon_discount || 0,
      total_amount: order_data.total_amount || 0,
      customer_name: (order_data.name || '').trim(),
      customer_email: (order_data.email || '').trim().toLowerCase(),
      customer_phone: (order_data.phone || '').replace(/\D/g, ''),
      special_requests: (order_data.special_requests || '').trim(),
      shipping_address: (order_data.address || '').trim(),
      shipping_city: (order_data.city || '').trim(),
      shipping_state: (order_data.state || '').trim(),
      shipping_pincode: (order_data.pincode || '').trim(),
      shipping_country: 'India',
      payment_method: 'cod',
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    const result = await pool.query(
      `INSERT INTO orders
         (custom_order_id, items, subtotal, shipping_charge, coupon_code, coupon_discount,
          total_amount, customer_name, customer_email, customer_phone, special_requests,
          shipping_address, shipping_city, shipping_state, shipping_pincode,
          shipping_country, payment_method, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      Object.values(orderRecord)
    );

    const order = result.rows[0];

    // Track coupon usage if applicable
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
          // ✅ Replaces supabase.rpc('increment')
          await pool.query(
            `UPDATE coupons SET used_count = used_count + 1, updated_at = $1 WHERE id = $2`,
            [now, coupon.id]
          );
        }
      } catch (couponError) {
        console.error('⚠️ Error tracking coupon:', couponError);
      }
    }

    // Send emails async
    Promise.allSettled([
      sendOrderConfirmationEmail(order),
      sendAdminNotification(order),
    ]);

    res.json({
      success: true,
      order: {
        id: order.id,
        custom_order_id: order.custom_order_id,
        tracking_id: order.custom_order_id,
      },
    });
  } catch (error: any) {
    console.error('Error creating COD order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order statistics (admin)
router.get('/admin/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(total_amount) AS total_revenue,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_orders,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
         COUNT(*) FILTER (WHERE status = 'shipped') AS shipped_orders,
         COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders
       FROM orders`
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
