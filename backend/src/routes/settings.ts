import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Public route - Get setting by key
router.get('/', async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) throw error;
    res.json(data || { value: null });
  } catch (error: any) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('key');

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const { data, error } = await supabase
      .from('site_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;