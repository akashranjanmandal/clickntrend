import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET /api/hero - Public route for active hero sections
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hero_content')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching hero content:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hero/all - Admin route for all hero sections
router.get('/all', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hero_content')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching all hero content:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/hero - Admin route to create hero section
router.post('/', requireAuth, async (req, res) => {
  try {
    const heroData = req.body;
    
    const { data, error } = await supabase
      .from('hero_content')
      .insert({
        ...heroData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating hero content:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/hero/:id - Admin route to update hero section
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('hero_content')
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
    console.error('Error updating hero content:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/hero/:id - Admin route to delete hero section
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('hero_content')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting hero content:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;