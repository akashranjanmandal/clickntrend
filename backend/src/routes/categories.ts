import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

console.log('✅ categories routes loaded');

// ========== PUBLIC ROUTES ==========

// Get all active categories
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all categories for admin (including inactive)
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new category
router.post('/admin/categories', requireAuth, async (req, res) => {
  try {
    const { name, description, icon, icon_type, color, hover_effect, display_order, gender, is_active } = req.body;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        description,
        icon: icon || '🎁',
        icon_type: icon_type || 'emoji',
        color: color || 'from-premium-gold/20 to-premium-cream',
        hover_effect: hover_effect || 'scale',
        display_order: display_order || 0,
        gender: gender || null,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, category: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update category
router.put('/admin/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, category: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete category
router.delete('/admin/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category is used in any products
    const { count, error: countError } = await supabase
      .from('product_categories')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (countError) {
      console.error('Error checking category usage:', countError);
      return res.status(500).json({ error: countError.message });
    }

    if (count && count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is assigned to products',
        productCount: count
      });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle category status
router.patch('/admin/categories/:id/toggle', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('categories')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling category status:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, category: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get category statistics
router.get('/admin/stats', requireAuth, async (req, res) => {
  try {
    // Get all categories with product counts
    const { data, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        is_active,
        product_categories (
          product_id
        )
      `);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const stats = {
      total_categories: data.length,
      active_categories: data.filter(c => c.is_active).length,
      inactive_categories: data.filter(c => !c.is_active).length,
      categories_with_products: data.filter(c => c.product_categories?.length > 0).length,
      categories: data.map(c => ({
        id: c.id,
        name: c.name,
        product_count: c.product_categories?.length || 0
      }))
    };

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;