import express, { Request, Response } from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PRODUCT COLOR VARIANTS ROUTES ==========

// Get all colors for a product (admin)
router.get('/products/:productId/colors', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      'SELECT * FROM product_colors WHERE product_id = $1 ORDER BY display_order ASC',
      [productId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching product colors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new color variant
router.post('/products/:productId/colors', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const {
      color_name, color_code, image_url, additional_images,
      stock_quantity, price_modifier, is_active, display_order,
    } = req.body;

    if (!color_name) return res.status(400).json({ error: 'Color name is required' });
    if (!image_url) return res.status(400).json({ error: 'Color image is required' });

    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO product_colors
         (product_id, color_name, color_code, image_url, additional_images,
          stock_quantity, price_modifier, is_active, display_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        productId, color_name, color_code, image_url,
        additional_images || [],
        stock_quantity || 0, price_modifier || 0,
        is_active !== undefined ? is_active : true,
        display_order || 0, now, now,
      ]
    );

    console.log(`✅ Color variant created for product ${productId}:`, result.rows[0]);
    res.json({ success: true, color: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating product color:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a color variant
router.put('/products/colors/:colorId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { colorId } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE product_colors SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, colorId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Color not found' });
    console.log(`✅ Color variant updated:`, result.rows[0]);
    res.json({ success: true, color: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating product color:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a color variant
router.delete('/products/colors/:colorId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { colorId } = req.params;
    await pool.query('DELETE FROM product_colors WHERE id = $1', [colorId]);
    console.log(`✅ Color variant deleted:`, colorId);
    res.json({ success: true, message: 'Color variant deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product color:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all colors for a product
router.delete('/products/:productId/colors', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    await pool.query('DELETE FROM product_colors WHERE product_id = $1', [productId]);
    console.log(`✅ All colors deleted for product:`, productId);
    res.json({ success: true, message: 'All colors deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product colors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update colors (for reordering)
router.put('/products/:productId/colors/bulk', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { colors } = req.body;

    if (!colors || !Array.isArray(colors)) {
      return res.status(400).json({ error: 'Colors array is required' });
    }

    const now = new Date().toISOString();
    const results = [];

    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const result = await pool.query(
        `UPDATE product_colors
         SET display_order = $1, updated_at = $2
         WHERE id = $3 AND product_id = $4
         RETURNING *`,
        [i, now, color.id, productId]
      );
      if (result.rows.length > 0) results.push(result.rows[0]);
    }

    console.log(`✅ Colors reordered for product:`, productId);
    res.json({ success: true, colors: results });
  } catch (error: any) {
    console.error('Error bulk updating colors:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
