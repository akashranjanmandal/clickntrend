import express, { Request, Response } from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PUBLIC SIZE ROUTES ==========

// Get all active sizes for a product (public)
router.get('/products/:productId/sizes', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT * FROM product_sizes
       WHERE product_id = $1 AND is_active = true
       ORDER BY display_order ASC`,
      [productId]
    );
    res.json(result.rows.map((r: any) => ({ ...r, price_modifier: parseFloat(r.price_modifier) || 0 })));
  } catch (error: any) {
    console.error('Error fetching product sizes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN SIZE ROUTES ==========

// Get all sizes for a product (admin - includes inactive)
router.get('/products/:productId/sizes/all', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      'SELECT * FROM product_sizes WHERE product_id = $1 ORDER BY display_order ASC',
      [productId]
    );
    res.json(result.rows.map((r: any) => ({ ...r, price_modifier: parseFloat(r.price_modifier) || 0 })));
  } catch (error: any) {
    console.error('Error fetching product sizes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new size variant
router.post('/products/:productId/sizes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { size_name, size_code, stock_quantity, price_modifier, is_active, display_order } = req.body;

    if (!size_name) return res.status(400).json({ error: 'Size name is required' });

    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO product_sizes
         (product_id, size_name, size_code, stock_quantity, price_modifier,
          is_active, display_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        productId, size_name, size_code,
        stock_quantity || 0, price_modifier || 0,
        is_active !== undefined ? is_active : true,
        display_order || 0, now, now,
      ]
    );

    console.log(`✅ Size variant created for product ${productId}:`, result.rows[0]);
    res.json({ success: true, size: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating product size:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a size variant
router.put('/sizes/:sizeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sizeId } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE product_sizes SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, sizeId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Size not found' });
    console.log(`✅ Size variant updated:`, result.rows[0]);
    res.json({ success: true, size: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating product size:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a size variant
router.delete('/sizes/:sizeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sizeId } = req.params;
    await pool.query('DELETE FROM product_sizes WHERE id = $1', [sizeId]);
    console.log(`✅ Size variant deleted:`, sizeId);
    res.json({ success: true, message: 'Size variant deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product size:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all sizes for a product
router.delete('/products/:productId/sizes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    await pool.query('DELETE FROM product_sizes WHERE product_id = $1', [productId]);
    console.log(`✅ All sizes deleted for product:`, productId);
    res.json({ success: true, message: 'All sizes deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product sizes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
