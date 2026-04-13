import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

console.log('✅ categories routes loaded');

// ========== PUBLIC ROUTES ==========

// Get all active categories
router.get('/', async (req, res) => {
  try {
    let result;
    try {
      result = await pool.query(
        `SELECT id, name, description, icon, icon_type, image_url, color, hover_effect,
                display_order, is_active, created_at, updated_at
         FROM categories WHERE is_active = true ORDER BY display_order ASC`
      );
    } catch (e: any) {
      // Fallback if image_url column doesn't exist yet
      result = await pool.query(
        `SELECT id, name, description, icon, icon_type, color, hover_effect,
                display_order, is_active, created_at, updated_at
         FROM categories WHERE is_active = true ORDER BY display_order ASC`
      );
      return res.json(result.rows.map((c: any) => ({ ...c, image_url: null })));
    }
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all categories for admin (including inactive)
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY display_order ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new category
router.post('/admin/categories', requireAuth, async (req, res) => {
  try {
    const { name, description, icon, icon_type, color, hover_effect, display_order, gender, is_active } = req.body;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO categories (name, description, icon, icon_type, color, hover_effect,
        display_order, gender, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        name,
        description,
        icon || '🎁',
        icon_type || 'emoji',
        color || 'from-premium-gold/20 to-premium-cream',
        hover_effect || 'scale',
        display_order || 0,
        gender || null,
        is_active !== undefined ? is_active : true,
        now,
        now,
      ]
    );

    res.json({ success: true, category: result.rows[0] });
  } catch (err: any) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update category
router.put('/admin/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE categories SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, category: result.rows[0] });
  } catch (err: any) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete category
router.delete('/admin/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM product_categories WHERE category_id = $1',
      [id]
    );
    const count = parseInt(countResult.rows[0].count);

    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete category that is assigned to products',
        productCount: count,
      });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle category status
router.patch('/admin/categories/:id/toggle', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(
      `UPDATE categories SET is_active = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [is_active, new Date().toISOString(), id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, category: result.rows[0] });
  } catch (err: any) {
    console.error('Error toggling category status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get category statistics
router.get('/admin/stats', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.is_active,
              COUNT(pc.product_id) AS product_count
       FROM categories c
       LEFT JOIN product_categories pc ON pc.category_id = c.id
       GROUP BY c.id, c.name, c.is_active`
    );

    const categories = result.rows;
    const stats = {
      total_categories: categories.length,
      active_categories: categories.filter((c) => c.is_active).length,
      inactive_categories: categories.filter((c) => !c.is_active).length,
      categories_with_products: categories.filter((c) => parseInt(c.product_count) > 0).length,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        product_count: parseInt(c.product_count),
      })),
    };

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
