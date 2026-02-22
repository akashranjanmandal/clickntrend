import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET /api/categories - Public route for active categories
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/categories/all - Admin route for all categories
router.get('/all', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching all categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/categories - Admin route to create category
router.post('/', requireAuth, async (req, res) => {
  try {
    const categoryData = req.body;
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...categoryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/categories/:id - Admin route to update category
router.put('/:id', requireAuth, async (req, res) => {
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

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/categories/:id - Admin route to delete category
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if any products use this category
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .single();

    if (category) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category', category.name);

      if (count && count > 0) {
        return res.status(400).json({ 
          error: `Cannot delete category: ${count} products use this category` 
        });
      }
    }
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;