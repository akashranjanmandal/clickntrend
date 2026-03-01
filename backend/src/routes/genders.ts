import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all active genders (public)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('genders')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching genders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin routes for gender management
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('genders')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('genders')
      .insert({
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('genders')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if any products use this gender
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('gender', (await supabase.from('genders').select('name').eq('id', id).single()).data?.name);

    if (count && count > 0) {
      return res.status(400).json({ error: 'Cannot delete gender that is in use by products' });
    }

    const { error } = await supabase
      .from('genders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;