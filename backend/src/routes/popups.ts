import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

console.log('✅ admin popups routes loaded');

// GET all popups (admin)
router.get('/', requireAuth, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('popup_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE popup
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('popup_config')
      .insert({
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE popup
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('popup_config')
      .update({
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE popup
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await supabase
      .from('popup_display_stats')
      .delete()
      .eq('popup_id', id);

    const { error } = await supabase
      .from('popup_config')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;