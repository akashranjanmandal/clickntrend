import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all genders (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, display_name, display_order, icon FROM genders WHERE is_active = true ORDER BY display_order ASC'
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
    // Include how many products use each gender (deleting one in use is blocked)
    const result = await pool.query(
      `SELECT g.*, COUNT(p.id)::int AS product_count
       FROM genders g
       LEFT JOIN products p ON p.gender = g.name
       GROUP BY g.id
       ORDER BY g.display_order ASC, g.created_at ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Only these fields can be written. `name` is the value stored on products
// (products.gender), so it is set once on create and never changed afterwards.
const cleanGenderFields = (body: any) => {
  const fields: Record<string, any> = {};
  if (body.display_name !== undefined) fields.display_name = String(body.display_name).trim();
  if (body.icon !== undefined) fields.icon = String(body.icon).trim() || null;
  if (body.display_order !== undefined) fields.display_order = parseInt(body.display_order) || 0;
  if (body.is_active !== undefined) fields.is_active = Boolean(body.is_active);
  return fields;
};

router.post('/admin', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,29}$/.test(name)) {
      return res.status(400).json({ error: 'Key must be lowercase letters, numbers or dashes (e.g. "kids")' });
    }
    const fields = cleanGenderFields(req.body);
    if (!fields.display_name) return res.status(400).json({ error: 'Display name is required' });

    const result = await pool.query(
      `INSERT INTO genders (name, display_name, icon, display_order, is_active)
       VALUES ($1, $2, $3, COALESCE($4, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM genders)), COALESCE($5, true))
       RETURNING *`,
      [name, fields.display_name, fields.icon ?? null, fields.display_order ?? null, fields.is_active ?? null]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'A gender with this key already exists' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = cleanGenderFields(req.body);
    if (fields.display_name === '') return res.status(400).json({ error: 'Display name is required' });
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE genders SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      [...Object.values(fields), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
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
      return res.status(400).json({ error: `Cannot delete: ${count} product(s) use this gender. Change them first, or switch the gender off instead.` });
    }

    await pool.query('DELETE FROM genders WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
