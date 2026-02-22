import express from 'express';
import { supabase } from '../utils/supabase';

const router = express.Router();

console.log('✅ settings routes loaded');

router.get('/', async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? { value: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;