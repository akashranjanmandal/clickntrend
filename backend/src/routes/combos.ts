import express from 'express';
import { supabase } from '../utils/supabase';

const router = express.Router();

// Get all combos (existing)
router.get('/', async (req, res) => {
  try {
    const { data: combos, error } = await supabase
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
    res.json(combos);
  } catch (error: any) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FIX: Add the missing POST /custom endpoint
router.post('/custom', async (req, res) => {
  console.log('🔥 POST /custom endpoint hit!');
  console.log('Request body:', req.body);
  
  try {
    const { name, description, products, total_price, special_requests } = req.body;

    // Validate required fields
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log('❌ No products provided');
      return res.status(400).json({ 
        error: 'At least one product is required',
        received: products 
      });
    }

    console.log('✅ Products validated:', products.length);

    // Insert into custom_combos table
    const { data: customCombo, error: comboError } = await supabase
      .from('custom_combos')
      .insert({
        name: name || 'Custom Combo',
        description: description || '',
        total_price: total_price,
        special_requests: special_requests || '',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (comboError) {
      console.error('❌ Database error creating custom combo:', comboError);
      throw comboError;
    }

    console.log('✅ Custom combo created with ID:', customCombo.id);

    // Add products to custom_combo_products junction table
    if (products && products.length > 0) {
      const comboProducts = products.map((product: any) => ({
        custom_combo_id: customCombo.id,
        product_id: product.id,
        quantity: product.quantity || 1
      }));

      console.log('Adding products to combo:', comboProducts);

      const { error: productsError } = await supabase
        .from('custom_combo_products')
        .insert(comboProducts);

      if (productsError) {
        console.error('❌ Error adding products to combo:', productsError);
        throw productsError;
      }
    }

    console.log('✅ Products added to combo successfully');

    res.status(201).json({ 
      success: true, 
      message: 'Custom combo created successfully',
      combo: customCombo 
    });

  } catch (error: any) {
    console.error('❌ Error in /custom endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to create custom combo',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get a specific custom combo by ID
router.get('/custom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: combo, error } = await supabase
      .from('custom_combos')
      .select(`
        *,
        custom_combo_products (
          quantity,
          product:products (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(combo);
  } catch (error: any) {
    console.error('Error fetching custom combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update custom combo status (admin only)
router.put('/custom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const { data, error } = await supabase
      .from('custom_combos')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, combo: data });
  } catch (error: any) {
    console.error('Error updating custom combo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;