import express from 'express';
import { supabasePublic } from '../utils/supabase';

const router = express.Router();

// Get all combos
router.get('/', async (req, res) => {
  try {
    const { data: combos, error } = await supabasePublic
      .from('combos')
      .select(`
        *,
        combo_products (
          product:products (*)
        )
      `)
      .eq('is_active', true);

    if (error) throw error;
    res.json(combos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create custom combo
router.post('/custom', async (req, res) => {
  try {
    const { name, description, products, total_price, special_requests } = req.body;
    
    const { data: customCombo, error: comboError } = await supabasePublic
      .from('custom_combos')
      .insert({
        name,
        description,
        total_price,
        special_requests,
        status: 'pending'
      })
      .select()
      .single();

    if (comboError) throw comboError;

    // Add products to custom combo
    const comboProducts = products.map((product: any) => ({
      custom_combo_id: customCombo.id,
      product_id: product.id,
      quantity: product.quantity
    }));

    const { error: productsError } = await supabasePublic
      .from('custom_combo_products')
      .insert(comboProducts);

    if (productsError) throw productsError;

    res.json(customCombo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;