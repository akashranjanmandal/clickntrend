import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import { isUuid, cleanText, isEmail } from '../utils/validate';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get approved reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT * FROM reviews
       WHERE product_id = $1 AND is_approved = true
       ORDER BY created_at DESC`,
      [productId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit a review
router.post('/', async (req, res) => {
  try {
    const { product_id, user_email } = req.body;
    const user_name = cleanText(req.body.user_name, 80);
    const comment = cleanText(req.body.comment, 2000);
    const rating = Number(req.body.rating);

    if (!isUuid(product_id) || !user_name || !comment) {
      return res.status(400).json({ error: 'Please add your name and a review (up to 2000 characters).' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (user_email && !isEmail(user_email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    const product = await pool.query('SELECT 1 FROM products WHERE id = $1 AND is_active = true', [product_id]);
    if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO reviews
         (product_id, user_name, user_email, rating, comment, is_approved, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [product_id, user_name, user_email || null, rating, comment, false, now, now]
    );

    res.json({
      success: true,
      message: 'Review submitted successfully and is pending approval',
      review: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all reviews (admin)
router.get('/admin', requireAuth, async (req, res) => {
  try {
    // Include the product's name and image for the admin list
    const result = await pool.query(
      `SELECT r.*,
              CASE WHEN p.id IS NULL THEN NULL
                   ELSE jsonb_build_object('name', p.name, 'image_url', p.image_url) END AS products
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Review counts for the admin stats cards
router.get('/admin/stats', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_approved)::int AS approved,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average
       FROM reviews`
    );
    const { total, approved, average } = result.rows[0];
    res.json({
      totalReviews: total,
      approvedReviews: approved,
      pendingReviews: total - approved,
      averageRating: parseFloat(average),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve / reject a review
router.patch('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;
    if (typeof is_approved !== 'boolean') {
      return res.status(400).json({ error: 'is_approved must be true or false' });
    }

    const result = await pool.query(
      `UPDATE reviews SET is_approved = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [is_approved, new Date().toISOString(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    res.json({ success: true, review: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a review
router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
