import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import { buildUpdate, buildInsert, POPUP_FIELDS } from '../utils/sqlUpdate';

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
    // Only real popup_config columns from the client; server-set values always win
    const insert = buildInsert(req.body, POPUP_FIELDS, { created_at: now, updated_at: now });
    if (!insert) return res.status(400).json({ error: 'No fields provided' });

    const result = await pool.query(
      `INSERT INTO popup_config (${insert.columns}) VALUES (${insert.placeholders}) RETURNING *`,
      insert.values
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
    // Only real popup_config columns are written; unknown keys are ignored
    const update = buildUpdate(req.body, POPUP_FIELDS, { extra: ['updated_at = NOW()'] });
    if (!update) return res.status(400).json({ error: 'Nothing to update' });

    const result = await pool.query(
      `UPDATE popup_config SET ${update.setClause} WHERE id = $${update.values.length + 1} RETURNING *`,
      [...update.values, id]
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
