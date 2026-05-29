import express, { Request, Response } from 'express';
import multer from 'multer';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import { r2 } from '../utils/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

function transformOrder(o: any) {
  return {
    ...o,
    total_amount: parseFloat(o.total_amount) || 0,
    subtotal: o.subtotal != null ? parseFloat(o.subtotal) || 0 : o.subtotal,
    grand_total: o.grand_total != null ? parseFloat(o.grand_total) || 0 : o.grand_total,
    coupon_discount: o.coupon_discount != null ? parseFloat(o.coupon_discount) || 0 : o.coupon_discount,
    shipping_charge: o.shipping_charge != null ? parseFloat(o.shipping_charge) || 0 : o.shipping_charge,
    cod_charge: o.cod_charge != null ? parseFloat(o.cod_charge) || 0 : o.cod_charge,
  };
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
});

// ========== IMAGE UPLOAD ==========

router.post('/upload-image', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: `products/${fileName}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/products/${fileName}`;
    res.json({ success: true, image_url: publicUrl, file_name: fileName, message: 'Image uploaded successfully' });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// ========== PRODUCTS ==========

router.get('/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string || '').trim();
    const params: any[] = [limit, offset];
    const searchClause = search ? `AND (p.name ILIKE $3 OR p.sku ILIKE $3)` : '';
    if (search) params.push(`%${search}%`);

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT p.id, p.name, p.price, p.original_price, p.discount_percentage,
                p.image_url, p.stock_quantity, p.sku, p.is_customizable,
                p.is_active, p.has_colors, p.has_sizes, p.gender, p.category,
                p.social_proof_enabled, p.created_at, p.updated_at,
                COALESCE(
                  jsonb_agg(DISTINCT jsonb_build_object('category', to_jsonb(cat.*)))
                  FILTER (WHERE cat.id IS NOT NULL), '[]'::jsonb
                ) AS product_categories
         FROM products p
         LEFT JOIN product_categories pcat ON pcat.product_id = p.id
         LEFT JOIN categories cat ON cat.id = pcat.category_id
         WHERE 1=1 ${searchClause}
         GROUP BY p.id
         ORDER BY p.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM products p WHERE 1=1 ${searchClause}`,
        search ? [`%${search}%`] : []
      ),
    ]);

    const transformedData = dataResult.rows.map((product: any) => ({
      ...product,
      price: parseFloat(product.price) || 0,
      categories: (product.product_categories || []).map((pc: any) => pc.category),
      colors: [],
      sizes: [],
    }));

    res.json({ data: transformedData, total: parseInt(countResult.rows[0].count) });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      name, description, price, original_price,
      discount_percentage, image_url, stock_quantity,
      gender, sku, is_customizable, customization_price,
      max_customization_characters, max_customization_images,
      max_customization_lines, additional_images,
      social_proof_enabled, social_proof_text,
      social_proof_initial_count, social_proof_end_count,
      is_active, has_colors, has_sizes,
    } = req.body;

    console.log('Creating product:', { name, price, has_colors, has_sizes });

    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO products
         (name, description, price, original_price, discount_percentage, image_url,
          stock_quantity, gender, sku, is_customizable, customization_price,
          max_customization_characters, max_customization_images, max_customization_lines,
          additional_images, social_proof_enabled, social_proof_text,
          social_proof_initial_count, social_proof_end_count,
          is_active, has_colors, has_sizes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [
        name, description,
        parseFloat(price),
        original_price ? parseFloat(original_price) : null,
        discount_percentage ? parseInt(discount_percentage) : null,
        image_url,
        parseInt(stock_quantity) || 0,
        gender || 'unisex',
        sku,
        is_customizable || false,
        customization_price ? parseFloat(customization_price) : 0,
        max_customization_characters ? parseInt(max_customization_characters) : 50,
        max_customization_images ? parseInt(max_customization_images) : 10,
        max_customization_lines ? parseInt(max_customization_lines) : 0,
        additional_images || [],
        social_proof_enabled !== false,
        social_proof_text || '🔺{count} People are Purchasing Right Now',
        social_proof_initial_count ? parseInt(social_proof_initial_count) : 5,
        social_proof_end_count ? parseInt(social_proof_end_count) : 15,
        is_active !== undefined ? is_active : true,
        has_colors || false,
        has_sizes || false,
        now, now,
      ]
    );

    const product = result.rows[0];
    console.log('Product created:', product.id);
    res.json({ success: true, product });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/products/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, categories, subcategory, ...cleanUpdates } = req.body;

    if (cleanUpdates.max_customization_lines) {
      cleanUpdates.max_customization_lines = parseInt(cleanUpdates.max_customization_lines);
    }

    const updates = { ...cleanUpdates, updated_at: new Date().toISOString() };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE products SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product: result.rows[0] });
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Run both dependency checks in parallel
    const [orderCheck, comboCheck] = await Promise.all([
      client.query('SELECT id FROM order_items WHERE product_id = $1 LIMIT 1', [id]),
      client.query('SELECT COUNT(*) FROM combo_products WHERE product_id = $1', [id]),
    ]);

    if (orderCheck.rows.length > 0) {
      client.release();
      return res.status(400).json({
        error: 'Cannot delete product that has existing orders. Consider deactivating it instead.',
      });
    }
    if (parseInt(comboCheck.rows[0].count) > 0) {
      client.release();
      return res.status(400).json({
        error: 'Cannot delete product that is part of a combo. Remove it from combos first.',
      });
    }

    // Delete all child records in parallel inside a transaction, then remove the product
    await client.query('BEGIN');
    await Promise.all([
      client.query('DELETE FROM reviews WHERE product_id = $1', [id]),
      client.query('DELETE FROM social_proof_stats WHERE product_id = $1', [id]),
      client.query('DELETE FROM product_categories WHERE product_id = $1', [id]),
      client.query('DELETE FROM product_colors WHERE product_id = $1', [id]),
      client.query('DELETE FROM product_sizes WHERE product_id = $1', [id]),
    ]);
    await client.query('DELETE FROM products WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete product error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ========== PRODUCT COLORS ==========

router.get('/products/:id/colors', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM product_colors WHERE product_id = $1 ORDER BY display_order ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products/:id/colors', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { color_name, color_code, image_url, additional_images, stock_quantity, price_modifier, is_active, display_order } = req.body;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO product_colors
         (product_id, color_name, color_code, image_url, additional_images,
          stock_quantity, price_modifier, is_active, display_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, color_name, color_code, image_url, additional_images || [],
       stock_quantity || 10, price_modifier || 0,
       is_active !== undefined ? is_active : true, display_order || 0, now, now]
    );
    res.json({ success: true, color: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id/colors', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM product_colors WHERE product_id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PRODUCT SIZES ==========

router.get('/products/:id/sizes', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM product_sizes WHERE product_id = $1 ORDER BY display_order ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products/:id/sizes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { size_name, size_code, stock_quantity, price_modifier, is_active, display_order } = req.body;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO product_sizes
         (product_id, size_name, size_code, stock_quantity, price_modifier,
          is_active, display_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, size_name, size_code, stock_quantity || 10, price_modifier || 0,
       is_active !== undefined ? is_active : true, display_order || 0, now, now]
    );
    res.json({ success: true, size: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id/sizes', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM product_sizes WHERE product_id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PRODUCT CATEGORIES ==========

router.delete('/products/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM product_categories WHERE product_id = $1', [req.params.id]);
    res.json({ success: true, message: 'All categories removed from product' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'No categories provided' });
    }

    const results = [];
    for (const c of categories) {
      const result = await pool.query(
        `INSERT INTO product_categories (product_id, category_id)
         VALUES ($1,$2) ON CONFLICT DO NOTHING
         RETURNING *, (SELECT to_jsonb(cat.*) FROM categories cat WHERE cat.id = $2) AS category`,
        [id, c.category_id]
      );
      if (result.rows.length > 0) results.push(result.rows[0]);
    }
    res.json({ success: true, categories: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT cat.* FROM product_categories pc
       JOIN categories cat ON cat.id = pc.category_id
       WHERE pc.product_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CATEGORIES ==========

router.get('/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    let result;
    try {
      result = await pool.query(
        `SELECT id, name, description, icon, icon_type, image_url, color, hover_effect,
                display_order, is_active, created_at, updated_at
         FROM categories ORDER BY display_order ASC`
      );
    } catch (e) {
      result = await pool.query(
        `SELECT id, name, description, icon, icon_type, color, hover_effect,
                display_order, is_active, created_at, updated_at
         FROM categories ORDER BY display_order ASC`
      );
      return res.json(result.rows.map((c: any) => ({ ...c, image_url: null })));
    }
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, icon, icon_type, image_url, color, hover_effect, display_order, is_active } = req.body;
    const resolvedImageUrl = icon_type === 'image' ? (image_url || icon) : (image_url || null);
    const finalIcon = icon_type === 'image' ? 'image' : (icon || 'Gift');
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO categories
         (name, description, icon, icon_type, image_url, color, hover_effect,
          display_order, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, description, finalIcon, icon_type || 'lucide', resolvedImageUrl,
       color || 'from-pink-100 to-pink-50', hover_effect || 'scale',
       display_order || 0, is_active !== undefined ? is_active : true, now, now]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/categories/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const updates = { ...req.body };
    if (updates.icon_type === 'image') {
      updates.image_url = updates.image_url || updates.icon;
      updates.icon = 'image';
    }
    const finalUpdates = { ...updates, updated_at: new Date().toISOString() };
    const keys = Object.keys(finalUpdates);
    const values = Object.values(finalUpdates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE categories SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/categories/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ORDERS ==========

router.get('/orders', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string || '').trim();
    const status = (req.query.status as string || '').trim();
    
    const conditions: string[] = [];
    const params: any[] = [limit, offset];
    let paramIdx = 3;

    if (search) {
      conditions.push(`(customer_name ILIKE $${paramIdx} OR customer_email ILIKE $${paramIdx} OR customer_phone ILIKE $${paramIdx} OR custom_order_id ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (status && status !== 'all') {
      conditions.push(`status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const filterParams = params.slice(2);

    const [dataResult, countResult] = await Promise.all([
      pool.query(`SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, params),
      pool.query(`SELECT COUNT(*) FROM orders ${whereClause}`, filterParams),
    ]);

    res.json({ data: dataResult.rows.map(transformOrder), total: parseInt(countResult.rows[0].count) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(transformOrder(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/orders/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE orders SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== COMBOS ==========

router.get('/combos', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT c.id, c.name, c.description, c.discount_percentage, c.discount_price,
                c.image_url, c.is_active, c.created_at, c.updated_at,
                COALESCE(
                  jsonb_agg(DISTINCT jsonb_build_object('quantity', cp.quantity,
                    'product', jsonb_build_object('id', p.id, 'name', p.name, 'price', p.price,
                      'image_url', p.image_url, 'is_customizable', p.is_customizable,
                      'has_colors', p.has_colors, 'has_sizes', p.has_sizes)))
                  FILTER (WHERE cp.product_id IS NOT NULL), '[]'::jsonb
                ) AS combo_products
         FROM combos c
         LEFT JOIN combo_products cp ON cp.combo_id = c.id
         LEFT JOIN products p ON p.id = cp.product_id
         GROUP BY c.id
         ORDER BY c.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM combos`),
    ]);

    const data = dataResult.rows.map((combo: any) => ({
      ...combo,
      categories: [],
    }));
    res.json({ data, total: parseInt(countResult.rows[0].count) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/combos', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, discount_percentage, discount_price, image_url, is_active } = req.body;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO combos
         (name, description, discount_percentage, discount_price, image_url, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, description,
       discount_percentage ? parseInt(discount_percentage) : null,
       discount_price ? parseFloat(discount_price) : null,
       image_url, is_active !== undefined ? is_active : true, now, now]
    );
    res.json({ success: true, combo: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/combos/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, discount_percentage, discount_price, image_url, is_active } = req.body;

    const result = await pool.query(
      `UPDATE combos
       SET name=$1, description=$2, discount_percentage=$3, discount_price=$4,
           image_url=$5, is_active=$6, updated_at=$7
       WHERE id=$8 RETURNING *`,
      [name, description,
       discount_percentage ? parseInt(discount_percentage) : null,
       discount_price ? parseFloat(discount_price) : null,
       image_url, is_active, new Date().toISOString(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Combo not found' });
    res.json({ success: true, combo: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/combos/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM combo_products WHERE combo_id = $1', [id]);
    await pool.query('DELETE FROM combo_categories WHERE combo_id = $1', [id]);
    await pool.query('DELETE FROM combos WHERE id = $1', [id]);
    res.json({ success: true, message: 'Combo deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== COMBO PRODUCTS ==========

router.get('/combos/:comboId/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT cp.product_id, cp.quantity, to_jsonb(p.*) AS product
       FROM combo_products cp
       JOIN products p ON p.id = cp.product_id
       WHERE cp.combo_id = $1`,
      [req.params.comboId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/combos/:comboId/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { comboId } = req.params;
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products provided' });
    }

    const results = [];
    for (const p of products) {
      const r = await pool.query(
        'INSERT INTO combo_products (combo_id, product_id, quantity) VALUES ($1,$2,$3) RETURNING *',
        [comboId, p.product_id, p.quantity || 1]
      );
      results.push(r.rows[0]);
    }
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/combos/:comboId/products', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM combo_products WHERE combo_id = $1', [req.params.comboId]);
    res.json({ success: true, message: 'All products removed from combo' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== COMBO CATEGORIES ==========

router.delete('/combos/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM combo_categories WHERE combo_id = $1', [req.params.id]);
    res.json({ success: true, message: 'All categories removed from combo' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/combos/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'No categories provided' });
    }

    const results = [];
    for (const c of categories) {
      const r = await pool.query(
        `INSERT INTO combo_categories (combo_id, category_id) VALUES ($1,$2)
         RETURNING *, (SELECT to_jsonb(cat.*) FROM categories cat WHERE cat.id = $2) AS category`,
        [id, c.category_id]
      );
      results.push(r.rows[0]);
    }
    res.json({ success: true, categories: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/combos/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT cat.* FROM combo_categories cc
       JOIN categories cat ON cat.id = cc.category_id
       WHERE cc.combo_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== EXTRA COMBO ENDPOINTS ==========

router.put('/combos/:id/products/:productId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, productId } = req.params;
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'Valid quantity is required' });

    const result = await pool.query(
      `UPDATE combo_products SET quantity=$1
       WHERE combo_id=$2 AND product_id=$3 RETURNING *`,
      [quantity, id, productId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found in combo' });
    res.json({ success: true, product: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/combos/:id/products/:productId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, productId } = req.params;
    await pool.query(
      'DELETE FROM combo_products WHERE combo_id=$1 AND product_id=$2',
      [id, productId]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/available-products', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
              COALESCE(
                jsonb_agg(DISTINCT jsonb_build_object('category', to_jsonb(cat.*)))
                FILTER (WHERE cat.id IS NOT NULL), '[]'::jsonb
              ) AS product_categories
       FROM products p
       LEFT JOIN product_categories pcat ON pcat.product_id = p.id
       LEFT JOIN categories cat ON cat.id = pcat.category_id
       WHERE p.is_active = true
       GROUP BY p.id ORDER BY p.name`
    );
    const data = result.rows.map((p: any) => ({
      ...p,
      categories: (p.product_categories || []).map((pc: any) => pc.category),
    }));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/combos/:id/duplicate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const originalResult = await pool.query('SELECT * FROM combos WHERE id = $1', [id]);
    if (originalResult.rows.length === 0) return res.status(404).json({ error: 'Combo not found' });
    const original = originalResult.rows[0];

    const now = new Date().toISOString();
    const newComboResult = await pool.query(
      `INSERT INTO combos
         (name, description, discount_percentage, discount_price, image_url, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [`${original.name} (Copy)`, original.description,
       original.discount_percentage, original.discount_price,
       original.image_url, false, now, now]
    );
    const newCombo = newComboResult.rows[0];

    const products = await pool.query('SELECT product_id, quantity FROM combo_products WHERE combo_id=$1', [id]);
    for (const p of products.rows) {
      await pool.query(
        'INSERT INTO combo_products (combo_id, product_id, quantity) VALUES ($1,$2,$3)',
        [newCombo.id, p.product_id, p.quantity]
      );
    }

    const cats = await pool.query('SELECT category_id FROM combo_categories WHERE combo_id=$1', [id]);
    for (const c of cats.rows) {
      await pool.query(
        'INSERT INTO combo_categories (combo_id, category_id) VALUES ($1,$2)',
        [newCombo.id, c.category_id]
      );
    }

    res.json({ success: true, combo: newCombo });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/test', (_req: Request, res: Response) => {
  res.json({ message: 'Admin API is working!' });
});

export default router;
