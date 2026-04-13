import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

console.log('✅ admin popups routes loaded');

// GET all popups (admin)
router.get('/', requireAuth, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM popup_config ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE popup
router.post('/', requireAuth, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const body = { ...req.body, created_at: now, updated_at: now };
    const keys = Object.keys(body);
    const values = Object.values(body);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await pool.query(
      `INSERT INTO popup_config (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE popup
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE popup_config SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE popup (and its stats)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM popup_display_stats WHERE popup_id = $1', [id]);
    await pool.query('DELETE FROM popup_config WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get popup stats
router.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM popup_display_stats WHERE popup_id = $1 ORDER BY viewed_at DESC',
      [id]
    );

    const data = result.rows;
    const totalViews = data.length;
    const totalClicks = data.filter((d: any) => d.clicked_at).length;
    const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    res.json({
      totalViews,
      totalClicks,
      conversionRate: conversionRate.toFixed(1),
      stats: data,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
