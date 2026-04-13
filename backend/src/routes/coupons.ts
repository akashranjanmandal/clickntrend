import express, { Request, Response } from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all coupons (admin only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active coupons for checkout (public)
router.get('/active', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      `SELECT code, description, discount_type, discount_value,
              min_order_amount, max_discount_amount
       FROM coupons
       WHERE is_active = true
         AND (start_date IS NULL OR start_date <= $1)
         AND (end_date   IS NULL OR end_date   >= $1)
       ORDER BY created_at DESC`,
      [now]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching active coupons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create coupon (admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const body = { ...req.body, used_count: 0, created_at: now, updated_at: now };
    const keys = Object.keys(body);
    const values = Object.values(body);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await pool.query(
      `INSERT INTO coupons (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update coupon (admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE coupons SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Coupon not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete coupon (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM coupon_usage WHERE coupon_id = $1', [id]);
    await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate coupon (public)
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal, email, categories, hasOnlyComboItems } = req.body;

    if (!code) return res.status(400).json({ valid: false, message: 'Coupon code is required' });
    if (hasOnlyComboItems) {
      return res.status(400).json({ valid: false, message: 'Coupons cannot be applied to combo orders' });
    }

    const now = new Date().toISOString();
    const couponResult = await pool.query(
      `SELECT * FROM coupons WHERE code = $1 AND is_active = true`,
      [code.toUpperCase()]
    );

    if (couponResult.rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Invalid coupon code' });
    }

    const coupon = couponResult.rows[0];

    if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
      return res.status(400).json({ valid: false, message: 'Coupon has expired' });
    }
    if (coupon.start_date && new Date(coupon.start_date) > new Date()) {
      return res.status(400).json({ valid: false, message: 'Coupon is not active yet' });
    }
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return res.status(400).json({ valid: false, message: `Minimum order amount should be ₹${coupon.min_order_amount}` });
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ valid: false, message: 'Coupon usage limit exceeded' });
    }

    if (email && coupon.per_user_limit) {
      const usageResult = await pool.query(
        'SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = $1 AND customer_email = $2',
        [coupon.id, email]
      );
      const count = parseInt(usageResult.rows[0].count);
      if (count >= coupon.per_user_limit) {
        return res.status(400).json({ valid: false, message: `You have already used this coupon ${count} times` });
      }
    }

    if (coupon.applicable_categories?.length > 0 && categories?.length > 0) {
      const hasApplicableCategory = categories.some((cat: string) =>
        coupon.applicable_categories.includes(cat)
      );
      if (!hasApplicableCategory) {
        return res.status(400).json({ valid: false, message: 'Coupon not applicable for items in your cart' });
      }
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: discountAmount,
      },
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ valid: false, message: 'Error validating coupon' });
  }
});

// Track coupon usage (internal - called after successful order)
router.post('/track-usage', async (req, res) => {
  try {
    const { coupon_id, order_id, customer_email, discount_amount } = req.body;

    await pool.query(
      `INSERT INTO coupon_usage (coupon_id, order_id, customer_email, discount_amount, used_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [coupon_id, order_id, customer_email, discount_amount, new Date().toISOString()]
    );

    // ✅ Replaces supabase.rpc('increment') — plain SQL increment
    await pool.query(
      `UPDATE coupons
       SET used_count = used_count + 1, updated_at = $1
       WHERE id = $2`,
      [new Date().toISOString(), coupon_id]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking coupon usage:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
