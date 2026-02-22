import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

console.log('✅ admin hero routes loaded');

// GET all hero_content (admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hero_content') // 🔁 make sure this table name is correct
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Admin hero fetch error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE hero
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hero_content')
      .insert(req.body)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE hero
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('hero_content')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE hero
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('hero_content')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;