import express, { Request, Response } from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import { evaluateCoupon } from '../utils/coupons';
import { buildUpdate, buildInsert, COUPON_FIELDS } from '../utils/sqlUpdate';

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
    // Only real coupons columns from the client; server-set values always win
    const insert = buildInsert(req.body, COUPON_FIELDS, { used_count: 0, created_at: now, updated_at: now });
    if (!insert) return res.status(400).json({ error: 'No fields provided' });

    const result = await pool.query(
      `INSERT INTO coupons (${insert.columns}) VALUES (${insert.placeholders}) RETURNING *`,
      insert.values
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
    // Only real coupons columns are written; unknown keys are ignored
    const update = buildUpdate(req.body, COUPON_FIELDS, { extra: ['updated_at = NOW()'] });
    if (!update) return res.status(400).json({ error: 'Nothing to update' });

    const result = await pool.query(
      `UPDATE coupons SET ${update.setClause} WHERE id = $${update.values.length + 1} RETURNING *`,
      [...update.values, id]
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
    const result = await evaluateCoupon({ code, subtotal, email, categories: Array.isArray(categories) ? categories : [], hasOnlyComboItems });
    if (!result.valid) return res.status(result.status).json({ valid: false, message: result.message });
    const { id: _id, ...coupon } = result.coupon!; // internal id is not needed by the shop
    res.json({ valid: true, coupon: { id: result.coupon!.id, ...coupon } });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ valid: false, message: 'Error validating coupon' });
  }
});

// Usage history for one coupon (admin)
router.get('/:id/usage', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, coupon_id, order_id, customer_email, discount_amount, used_at
       FROM coupon_usage WHERE coupon_id = $1 ORDER BY used_at DESC`,
      [req.params.id]
    );
    res.json(result.rows.map((u: any) => ({ ...u, discount_amount: Number(u.discount_amount) || 0 })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Track coupon usage (internal - called after successful order)
router.post('/track-usage', requireAuth, async (req, res) => {
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
