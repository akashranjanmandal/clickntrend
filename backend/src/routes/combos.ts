import express from 'express';
import { supabase } from '../utils/supabase';

const router = express.Router();

// Get all combos (public)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_products (
          quantity,
          product:products (*)
        )
      `)
      .eq('is_active', true);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create custom combo (public - no auth required)
router.post('/custom', async (req, res) => {
  try {
    const { name, description, products, total_price, special_requests } = req.body;

    console.log('Creating custom combo:', { name, products: products?.length });

    // Validate input
    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'At least one product is required' });
    }

    // Create custom combo
    const { data: customCombo, error: comboError } = await supabase
      .from('custom_combos')
      .insert({
        name: name || 'Custom Combo',
        description: description || '',
        total_price,
        special_requests,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (comboError) {
      console.error('Error creating custom combo:', comboError);
      throw comboError;
    }

    // Add products to custom combo
    const comboProducts = products.map((product: any) => ({
      custom_combo_id: customCombo.id,
      product_id: product.id,
      quantity: product.quantity || 1
    }));

    const { error: productsError } = await supabase
      .from('custom_combo_products')
      .insert(comboProducts);

    if (productsError) {
      console.error('Error adding products to custom combo:', productsError);
      throw productsError;
    }

    res.json({ 
      success: true, 
      message: 'Custom combo created successfully',
      combo: customCombo 
    });
  } catch (error: any) {
    console.error('Error creating custom combo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;