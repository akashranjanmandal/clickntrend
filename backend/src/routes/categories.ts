import express from 'express';
import { supabase } from '../utils/supabase';

const router = express.Router();

console.log('✅ categories routes loaded');

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

export default router;