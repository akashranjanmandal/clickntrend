import express, { Request, Response } from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Helper: fetch a full product by id (with categories, colors, sizes)
async function getFullProduct(id: string) {
  const result = await pool.query(
    `SELECT p.*,
            COALESCE(
              jsonb_agg(DISTINCT jsonb_build_object('category', to_jsonb(cat.*)))
              FILTER (WHERE cat.id IS NOT NULL), '[]'::jsonb
            ) AS product_categories,
            COALESCE(
              jsonb_agg(DISTINCT to_jsonb(pc.*))
              FILTER (WHERE pc.id IS NOT NULL), '[]'::jsonb
            ) AS product_colors,
            COALESCE(
              jsonb_agg(DISTINCT to_jsonb(ps.*))
              FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb
            ) AS product_sizes
     FROM products p
     LEFT JOIN product_categories pcat ON pcat.product_id = p.id
     LEFT JOIN categories cat ON cat.id = pcat.category_id
     LEFT JOIN product_colors pc ON pc.product_id = p.id
     LEFT JOIN product_sizes ps ON ps.product_id = p.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return transformProduct(result.rows[0]);
}

function transformProduct(p: any) {
  return {
    ...p,
    price: parseFloat(p.price) || 0,
    original_price: p.original_price != null ? parseFloat(p.original_price) : undefined,
    discount_percentage: p.discount_percentage != null ? parseFloat(p.discount_percentage) : undefined,
    customization_price: p.customization_price != null ? parseFloat(p.customization_price) : undefined,
    categories: (p.product_categories || []).map((pc: any) => pc.category),
    colors: (p.product_colors || [])
      .filter((c: any) => c.is_active)
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((c: any) => ({ ...c, price_modifier: parseFloat(c.price_modifier) || 0 })),
    sizes: (p.product_sizes || [])
      .filter((s: any) => s.is_active)
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((s: any) => ({ ...s, price_modifier: parseFloat(s.price_modifier) || 0 })),
  };
}

// ========== PUBLIC ROUTES ==========

// Get all active products with categories, colors, sizes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
              COALESCE(
                jsonb_agg(DISTINCT jsonb_build_object('category', to_jsonb(cat.*)))
                FILTER (WHERE cat.id IS NOT NULL), '[]'::jsonb
              ) AS product_categories,
              COALESCE(
                jsonb_agg(DISTINCT to_jsonb(pc.*))
                FILTER (WHERE pc.id IS NOT NULL), '[]'::jsonb
              ) AS product_colors,
              COALESCE(
                jsonb_agg(DISTINCT to_jsonb(ps.*))
                FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb
              ) AS product_sizes
       FROM products p
       LEFT JOIN product_categories pcat ON pcat.product_id = p.id
       LEFT JOIN categories cat ON cat.id = pcat.category_id
       LEFT JOIN product_colors pc ON pc.product_id = p.id
       LEFT JOIN product_sizes ps ON ps.product_id = p.id
       WHERE p.is_active = true
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows.map(transformProduct));
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search products — MUST be before /:id
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) return res.json([]);

    const term = q.trim().toLowerCase();

    const result = await pool.query(
      `SELECT p.*,
              COALESCE(
                jsonb_agg(DISTINCT jsonb_build_object('category', to_jsonb(cat.*)))
                FILTER (WHERE cat.id IS NOT NULL), '[]'::jsonb
              ) AS product_categories,
              COALESCE(jsonb_agg(DISTINCT to_jsonb(pc.*)) FILTER (WHERE pc.id IS NOT NULL), '[]'::jsonb) AS product_colors,
              COALESCE(jsonb_agg(DISTINCT to_jsonb(ps.*)) FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb) AS product_sizes
       FROM products p
       LEFT JOIN product_categories pcat ON pcat.product_id = p.id
       LEFT JOIN categories cat ON cat.id = pcat.category_id
       LEFT JOIN product_colors pc ON pc.product_id = p.id
       LEFT JOIN product_sizes ps ON ps.product_id = p.id
       WHERE p.is_active = true
         AND (
           LOWER(p.name) LIKE $1
           OR LOWER(p.description) LIKE $1
           OR LOWER(p.gender) LIKE $1
           OR EXISTS (
             SELECT 1 FROM product_categories pc2
             JOIN categories c2 ON c2.id = pc2.category_id
             WHERE pc2.product_id = p.id AND LOWER(c2.name) LIKE $1
           )
         )
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [`%${term}%`]
    );

    res.json(result.rows.map((p: any) => ({
      ...transformProduct(p),
      category: p.product_categories?.[0]?.category?.name || p.category || '',
    })));
  } catch (error: any) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single product by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const product = await getFullProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error: any) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all products (admin, includes inactive)
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
              COALESCE(
                jsonb_agg(DISTINCT jsonb_build_object('category', to_jsonb(cat.*)))
                FILTER (WHERE cat.id IS NOT NULL), '[]'::jsonb
              ) AS product_categories,
              COALESCE(jsonb_agg(DISTINCT to_jsonb(pc.*)) FILTER (WHERE pc.id IS NOT NULL), '[]'::jsonb) AS product_colors,
              COALESCE(jsonb_agg(DISTINCT to_jsonb(ps.*)) FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb) AS product_sizes
       FROM products p
       LEFT JOIN product_categories pcat ON pcat.product_id = p.id
       LEFT JOIN categories cat ON cat.id = pcat.category_id
       LEFT JOIN product_colors pc ON pc.product_id = p.id
       LEFT JOIN product_sizes ps ON ps.product_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows.map(transformProduct));
  } catch (error: any) {
    console.error('Error fetching all products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get products by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Get category name first
    const catResult = await pool.query('SELECT name FROM categories WHERE id = $1', [categoryId]);
    if (catResult.rows.length === 0) return res.json([]);
    const catName = catResult.rows[0].name;

    const result = await pool.query(
      `SELECT p.*,
              COALESCE(
                jsonb_agg(DISTINCT jsonb_build_object('category', to_jsonb(cat.*)))
                FILTER (WHERE cat.id IS NOT NULL), '[]'::jsonb
              ) AS product_categories,
              COALESCE(jsonb_agg(DISTINCT to_jsonb(pc.*)) FILTER (WHERE pc.id IS NOT NULL), '[]'::jsonb) AS product_colors,
              COALESCE(jsonb_agg(DISTINCT to_jsonb(ps.*)) FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb) AS product_sizes
       FROM products p
       JOIN product_categories pcat2 ON pcat2.product_id = p.id AND pcat2.category_id = $1
       LEFT JOIN product_categories pcat ON pcat.product_id = p.id
       LEFT JOIN categories cat ON cat.id = pcat.category_id
       LEFT JOIN product_colors pc ON pc.product_id = p.id
       LEFT JOIN product_sizes ps ON ps.product_id = p.id
       WHERE p.is_active = true
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [categoryId]
    );
    res.json(result.rows.map(transformProduct));
  } catch (error: any) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create product (admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name, description, price, original_price, image_url, additional_images,
      gender, is_active, category_ids, social_proof_enabled, social_proof_text,
      social_proof_initial_count, social_proof_end_count,
    } = req.body;

    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });

    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO products
         (name, description, price, original_price, image_url, additional_images,
          gender, is_active, social_proof_enabled, social_proof_text,
          social_proof_initial_count, social_proof_end_count, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        name, description, price, original_price || null,
        image_url || '', JSON.stringify(additional_images || []),
        gender || null, is_active !== undefined ? is_active : true,
        social_proof_enabled || false,
        social_proof_text || '🔺 {count} people are viewing this right now',
        social_proof_initial_count || 5, social_proof_end_count || 15,
        now, now,
      ]
    );

    const product = result.rows[0];

    // Assign categories
    if (category_ids?.length > 0) {
      for (const catId of category_ids) {
        await pool.query(
          'INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [product.id, catId]
        );
      }
    }

    const fullProduct = await getFullProduct(product.id);
    res.json({ success: true, product: fullProduct });
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product (admin)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_ids, ...fields } = req.body;
    const updates = { ...fields, updated_at: new Date().toISOString() };

    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    await pool.query(
      `UPDATE products SET ${setClause} WHERE id = $${keys.length + 1}`,
      [...values, id]
    );

    // Re-assign categories if provided
    if (category_ids !== undefined) {
      await pool.query('DELETE FROM product_categories WHERE product_id = $1', [id]);
      for (const catId of category_ids) {
        await pool.query(
          'INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [id, catId]
        );
      }
    }

    const fullProduct = await getFullProduct(id);
    res.json({ success: true, product: fullProduct });
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle product active status (admin)
router.patch('/:id/toggle', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.query(
      'UPDATE products SET is_active = $1, updated_at = $2 WHERE id = $3',
      [is_active, new Date().toISOString(), id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM product_categories WHERE product_id = $1', [id]);
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get products by gender (public)
router.get('/gender/:gender', async (req, res) => {
  try {
    const { gender } = req.params;
    const result = await pool.query(
      `SELECT p.*,
              COALESCE(
                jsonb_agg(DISTINCT jsonb_build_object('category', to_jsonb(cat.*)))
                FILTER (WHERE cat.id IS NOT NULL), '[]'::jsonb
              ) AS product_categories,
              COALESCE(jsonb_agg(DISTINCT to_jsonb(pc.*)) FILTER (WHERE pc.id IS NOT NULL), '[]'::jsonb) AS product_colors,
              COALESCE(jsonb_agg(DISTINCT to_jsonb(ps.*)) FILTER (WHERE ps.id IS NOT NULL), '[]'::jsonb) AS product_sizes
       FROM products p
       LEFT JOIN product_categories pcat ON pcat.product_id = p.id
       LEFT JOIN categories cat ON cat.id = pcat.category_id
       LEFT JOIN product_colors pc ON pc.product_id = p.id
       LEFT JOIN product_sizes ps ON ps.product_id = p.id
       WHERE p.is_active = true AND LOWER(p.gender) = LOWER($1)
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [gender]
    );
    res.json(result.rows.map(transformProduct));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update product images (admin)
router.patch('/:id/images', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, additional_images } = req.body;

    await pool.query(
      `UPDATE products SET image_url = $1, additional_images = $2, updated_at = $3 WHERE id = $4`,
      [image_url, JSON.stringify(additional_images || []), new Date().toISOString(), id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
