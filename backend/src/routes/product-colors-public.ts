import express, { Request, Response } from 'express';
import { pool } from '../utils/db';

const router = express.Router();

// ========== PUBLIC PRODUCT COLOR VARIANTS ROUTES ==========

// Get all active colors for a product (public)
router.get('/products/:productId/colors', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT * FROM product_colors
       WHERE product_id = $1 AND is_active = true
       ORDER BY display_order ASC`,
      [productId]
    );
    res.json(result.rows.map((r: any) => ({ ...r, price_modifier: parseFloat(r.price_modifier) || 0 })));
  } catch (error: any) {
    console.error('Error fetching product colors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single active color by ID (public)
router.get('/colors/:colorId', async (req: Request, res: Response) => {
  try {
    const { colorId } = req.params;
    const result = await pool.query(
      'SELECT * FROM product_colors WHERE id = $1 AND is_active = true',
      [colorId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Color not found' });
    const r = result.rows[0];
    res.json({ ...r, price_modifier: parseFloat(r.price_modifier) || 0 });
  } catch (error: any) {
    console.error('Error fetching color:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
