import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get all active combos for public view
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_products (
          quantity,
          product:products (*)
        ),
        combo_categories (
          category:categories (*)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform to include categories array
    const transformedData = data?.map(combo => ({
      ...combo,
      categories: combo.combo_categories?.map((cc: any) => cc.category) || []
    }));
    
    res.json(transformedData);
  } catch (error: any) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single combo by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_products (
          quantity,
          product:products (*)
        ),
        combo_categories (
          category:categories (*)
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Combo not found' });
      }
      throw error;
    }
    
    // Transform to include categories array
    const transformedCombo = {
      ...data,
      categories: data.combo_categories?.map((cc: any) => cc.category) || []
    };
    
    res.json(transformedCombo);
  } catch (error: any) {
    console.error('Error fetching combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get combos by category (public)
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const { data, error } = await supabase
      .from('combo_categories')
      .select(`
        combo_id,
        combo:combos (
          *,
          combo_products (
            quantity,
            product:products (*)
          ),
          combo_categories (
            category:categories (*)
          )
        )
      `)
      .eq('category_id', categoryId)
      .eq('combo.is_active', true);

    if (error) throw error;
    
    // Extract and transform combos
    const combos = data
      .map((item: any) => item.combo)
      .filter(Boolean)
      .map((combo: any) => ({
        ...combo,
        categories: combo.combo_categories?.map((cc: any) => cc.category) || []
      }));
    
    res.json(combos);
  } catch (error: any) {
    console.error('Error fetching combos by category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create custom combo (public - no auth required)
router.post('/custom', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      products, 
      subtotal,
      discount_percentage,
      discount_amount,
      total_price, 
      special_requests,
      item_count 
    } = req.body;

    console.log('Creating custom combo:', { 
      name, 
      products: products?.length,
      items: item_count,
      discount: `${discount_percentage}%`
    });

    // Validate input
    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'At least one product is required' });
    }

    // Create custom combo with discount info
    const { data: customCombo, error: comboError } = await supabase
      .from('custom_combos')
      .insert({
        name: name || 'Custom Combo',
        description: description || '',
        subtotal,
        discount_percentage,
        discount_amount,
        total_price,
        item_count,
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

// ========== ADMIN ROUTES ==========

// Get all combos (admin) with categories
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_products (
          quantity,
          product:products (*)
        ),
        combo_categories (
          category:categories (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform to include categories array
    const transformedData = data?.map(combo => ({
      ...combo,
      categories: combo.combo_categories?.map((cc: any) => cc.category) || []
    }));
    
    res.json(transformedData);
  } catch (error: any) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single combo by ID for admin
router.get('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_products (
          quantity,
          product:products (*)
        ),
        combo_categories (
          category:categories (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Combo not found' });
      }
      throw error;
    }
    
    // Transform to include categories array
    const transformedCombo = {
      ...data,
      categories: data.combo_categories?.map((cc: any) => cc.category) || []
    };
    
    res.json(transformedCombo);
  } catch (error: any) {
    console.error('Error fetching combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create combo (admin) - WITHOUT category field
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, discount_percentage, discount_price, image_url, is_active } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Combo name is required' });
    }

    const { data, error } = await supabase
      .from('combos')
      .insert({
        name,
        description: description || '',
        discount_percentage: discount_percentage || null,
        discount_price: discount_price || null,
        image_url: image_url || '',
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating combo:', error);
      throw error;
    }

    console.log('Combo created:', data);
    res.json({ success: true, combo: data });
  } catch (error: any) {
    console.error('Error creating combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update combo (admin) - WITHOUT category field
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, discount_percentage, discount_price, image_url, is_active } = req.body;
    
    const { data, error } = await supabase
      .from('combos')
      .update({
        name,
        description,
        discount_percentage: discount_percentage || null,
        discount_price: discount_price || null,
        image_url,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating combo:', error);
      throw error;
    }

    console.log('Combo updated:', data);
    res.json({ success: true, combo: data });
  } catch (error: any) {
    console.error('Error updating combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete combo (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete related records
    await supabase.from('combo_products').delete().eq('combo_id', id);
    await supabase.from('combo_categories').delete().eq('combo_id', id);
    
    // Then delete the combo
    const { error } = await supabase
      .from('combos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Combo deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add products to combo (admin)
router.post('/:id/products', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    if (products.length === 0) {
      return res.status(400).json({ error: 'At least one product is required' });
    }

    const comboProducts = products.map((p: any) => ({
      combo_id: id,
      product_id: p.product_id,
      quantity: p.quantity || 1
    }));

    const { data, error } = await supabase
      .from('combo_products')
      .insert(comboProducts)
      .select();

    if (error) {
      console.error('Error adding products to combo:', error);
      throw error;
    }

    console.log(`Added ${data.length} products to combo ${id}`);
    res.json({ success: true, products: data });
  } catch (error: any) {
    console.error('Error adding products to combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all products from combo (admin)
router.delete('/:id/products', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('combo_products')
      .delete()
      .eq('combo_id', id);

    if (error) {
      console.error('Error deleting products from combo:', error);
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting products from combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add categories to combo (admin)
router.post('/:id/categories', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { categories } = req.body;
    
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }

    if (categories.length === 0) {
      return res.status(400).json({ error: 'At least one category is required' });
    }

    const comboCategories = categories.map((c: any) => ({
      combo_id: id,
      category_id: c.category_id
    }));

    const { data, error } = await supabase
      .from('combo_categories')
      .insert(comboCategories)
      .select(`
        *,
        category:categories (*)
      `);

    if (error) {
      console.error('Error adding categories to combo:', error);
      throw error;
    }

    console.log(`Added ${data.length} categories to combo ${id}`);
    res.json({ success: true, categories: data });
  } catch (error: any) {
    console.error('Error adding categories to combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all categories from combo (admin)
router.delete('/:id/categories', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('combo_categories')
      .delete()
      .eq('combo_id', id);

    if (error) {
      console.error('Error deleting categories from combo:', error);
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting categories from combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update specific product quantity in combo (admin)
router.put('/:id/products/:productId', requireAuth, async (req, res) => {
  try {
    const { id, productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    const { data, error } = await supabase
      .from('combo_products')
      .update({ quantity })
      .eq('combo_id', id)
      .eq('product_id', productId)
      .select()
      .single();

    if (error) {
      console.error('Error updating product quantity:', error);
      throw error;
    }

    res.json({ success: true, product: data });
  } catch (error: any) {
    console.error('Error updating product quantity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove specific product from combo (admin)
router.delete('/:id/products/:productId', requireAuth, async (req, res) => {
  try {
    const { id, productId } = req.params;

    const { error } = await supabase
      .from('combo_products')
      .delete()
      .eq('combo_id', id)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing product from combo:', error);
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing product from combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get combo statistics (admin)
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('combos')
      .select('id, name, is_active, combo_products');

    if (error) throw error;

    const stats = {
      total_combos: data.length,
      active_combos: data.filter(c => c.is_active).length,
      inactive_combos: data.filter(c => !c.is_active).length,
      avg_products_per_combo: data.reduce((acc, combo) => 
        acc + (combo.combo_products?.length || 0), 0) / (data.length || 1)
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching combo stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk add products to combo (admin)
router.post('/:id/products/bulk', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    // Start a transaction by using Promise.all
    const results = await Promise.all(
      products.map(async (product) => {
        const { data, error } = await supabase
          .from('combo_products')
          .upsert({
            combo_id: id,
            product_id: product.product_id,
            quantity: product.quantity || 1
          }, { onConflict: 'combo_id,product_id' })
          .select()
          .single();

        if (error) throw error;
        return data;
      })
    );

    res.json({ success: true, products: results });
  } catch (error: any) {
    console.error('Error bulk adding products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available products for combo (admin)
router.get('/available-products', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_categories(category:categories(*))')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    
    // Transform to include categories
    const transformedData = data.map(product => ({
      ...product,
      categories: product.product_categories?.map((pc: any) => pc.category) || []
    }));
    
    res.json(transformedData);
  } catch (error: any) {
    console.error('Error fetching available products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all categories for combo filtering (admin)
router.get('/categories/all', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Duplicate combo (admin)
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get original combo with its products
    const { data: originalCombo, error: fetchError } = await supabase
      .from('combos')
      .select(`
        *,
        combo_products (
          product_id,
          quantity
        ),
        combo_categories (
          category_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Create new combo based on original
    const { data: newCombo, error: createError } = await supabase
      .from('combos')
      .insert({
        name: `${originalCombo.name} (Copy)`,
        description: originalCombo.description,
        discount_percentage: originalCombo.discount_percentage,
        discount_price: originalCombo.discount_price,
        image_url: originalCombo.image_url,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;

    // Copy products
    if (originalCombo.combo_products?.length > 0) {
      const productsToCopy = originalCombo.combo_products.map((p: any) => ({
        combo_id: newCombo.id,
        product_id: p.product_id,
        quantity: p.quantity
      }));

      await supabase.from('combo_products').insert(productsToCopy);
    }

    // Copy categories
    if (originalCombo.combo_categories?.length > 0) {
      const categoriesToCopy = originalCombo.combo_categories.map((c: any) => ({
        combo_id: newCombo.id,
        category_id: c.category_id
      }));

      await supabase.from('combo_categories').insert(categoriesToCopy);
    }

    res.json({ success: true, combo: newCombo });
  } catch (error: any) {
    console.error('Error duplicating combo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;