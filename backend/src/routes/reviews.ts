import express from 'express';
import { supabase, supabasePublic } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const { data, error } = await supabasePublic
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit a review
router.post('/', async (req, res) => {
  try {
    const { product_id, user_name, user_email, rating, comment } = req.body;

    if (!product_id || !user_name || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        product_id,
        user_name,
        user_email,
        rating,
        comment,
        is_approved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Review submitted successfully and awaiting approval',
      review: data
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all reviews (with optional filters)
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const { status, product_id } = req.query;
    
    let query = supabase
      .from('reviews')
      .select(`
        *,
        products (
          name,
          image_url
        )
      `)
      .order('created_at', { ascending: false });

    if (status === 'approved') {
      query = query.eq('is_approved', true);
    } else if (status === 'pending') {
      query = query.eq('is_approved', false);
    }

    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Transform the data to handle the products array
    const transformedData = data?.map(review => ({
      ...review,
      products: review.products?.[0] || null // Take the first product from the array
    })) || [];

    res.json(transformedData);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve/reject review
router.put('/admin/:id/approve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;

    const { data, error } = await supabase
      .from('reviews')
      .update({
        is_approved,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: `Review ${is_approved ? 'approved' : 'rejected'} successfully`,
      review: data
    });
  } catch (error: any) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete review
router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get review statistics
router.get('/admin/stats', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        product_id, 
        rating, 
        is_approved, 
        products (
          name
        )
      `);

    if (error) throw error;

    const totalReviews = data.length;
    const approvedReviews = data.filter(r => r.is_approved).length;
    const pendingReviews = data.filter(r => !r.is_approved).length;
    const averageRating = data
      .filter(r => r.is_approved)
      .reduce((sum, r) => sum + r.rating, 0) / (approvedReviews || 1);

    // Group by product
    const productStats = data.reduce((acc: any, review) => {
      // Handle products as array and get the first one
      const productName = review.products?.[0]?.name || 'Unknown';
      
      if (!acc[productName]) {
        acc[productName] = {
          total: 0,
          approved: 0,
          avgRating: 0,
          sumRating: 0
        };
      }
      acc[productName].total++;
      if (review.is_approved) {
        acc[productName].approved++;
        acc[productName].sumRating += review.rating;
      }
      return acc;
    }, {});

    Object.keys(productStats).forEach(key => {
      const stat = productStats[key];
      stat.avgRating = stat.approved > 0 ? (stat.sumRating / stat.approved).toFixed(1) : 0;
    });

    res.json({
      totalReviews,
      approvedReviews,
      pendingReviews,
      averageRating: averageRating.toFixed(1),
      productStats
    });
  } catch (error: any) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;