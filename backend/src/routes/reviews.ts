import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Public route - Get approved reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const { data, error } = await supabase
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

// Public route - Submit a review
router.post('/', async (req, res) => {
  try {
    const reviewData = req.body;
    
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ...reviewData,
        is_approved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, products(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/approve', requireAuth, async (req, res) => {
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
    res.json(data);
  } catch (error: any) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;