import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all genders (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, display_name, display_order, icon FROM genders ORDER BY display_order ASC'
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching genders:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM genders ORDER BY display_order ASC');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin', requireAuth, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const body = { ...req.body, created_at: now, updated_at: now };
    const keys = Object.keys(body);
    const values = Object.values(body);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await pool.query(
      `INSERT INTO genders (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE genders SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get gender name first
    const genderResult = await pool.query('SELECT name FROM genders WHERE id = $1', [id]);
    if (genderResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const genderName = genderResult.rows[0].name;
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE gender = $1',
      [genderName]
    );
    const count = parseInt(countResult.rows[0].count);

    if (count > 0) {
      return res.status(400).json({ error: 'Cannot delete gender that is in use by products' });
    }

    await pool.query('DELETE FROM genders WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
