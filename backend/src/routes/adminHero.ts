import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

console.log('✅ admin hero routes loaded');

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hero_content ORDER BY display_order ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Admin hero fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Only these columns can be written (column names are never taken from the request)
const HERO_FIELDS = [
  'title', 'subtitle', 'eyebrow', 'media_type', 'media_url', 'video_poster_url',
  'autoplay', 'loop', 'muted', 'cta_text', 'cta_link', 'secondary_cta_text', 'secondary_cta_link',
  'highlights', 'content_alignment', 'is_active', 'display_order',
] as const;

const pickHeroFields = (body: any) => {
  const fields: Record<string, any> = {};
  for (const key of HERO_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === 'highlights') {
      fields.highlights = (Array.isArray(body.highlights) ? body.highlights : [])
        .map((h: any) => String(h).trim()).filter(Boolean).slice(0, 6);
    } else {
      fields[key] = body[key];
    }
  }
  return fields;
};

router.post('/', requireAuth, async (req, res) => {
  try {
    const fields = pickHeroFields(req.body);
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No hero fields provided' });
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await pool.query(
      `INSERT INTO hero_content (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      Object.values(fields)
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = pickHeroFields(req.body);
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No hero fields provided' });
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE hero_content SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      [...Object.values(fields), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM hero_content WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
