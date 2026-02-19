import express, { Request, Response, NextFunction } from "express";
import { supabasePublic } from '../utils/supabase';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { data, error } = await supabasePublic
      .from('products')
      .select('*')
      .eq('category', category)
      .eq('is_active', true);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search products
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const { data, error } = await supabasePublic
      .from('products')
      .select('*')
      .ilike('name', `%${q}%`)
      .eq('is_active', true);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;