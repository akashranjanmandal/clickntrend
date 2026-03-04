import express, { Request, Response } from "express";
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get all products with categories
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories (
          category:categories (*)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform to include categories array
    const transformedData = data?.map(product => ({
      ...product,
      categories: product.product_categories?.map((pc: any) => pc.category) || []
    }));
    
    res.json(transformedData);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get products by category (public) - using category name for backward compatibility
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // First get category ID from name
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', category)
      .single();

    if (categoryError) {
      // Fallback to old method if category not found
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('is_active', true);

      if (error) throw error;
      return res.json(data);
    }

    // Get products by category ID
    const { data, error } = await supabase
      .from('product_categories')
      .select(`
        product_id,
        product:products (
          *,
          product_categories (
            category:categories (*)
          )
        )
      `)
      .eq('category_id', categoryData.id)
      .eq('product.is_active', true);

    if (error) throw error;

    // Extract and transform products
    const products = data
      .map((item: any) => item.product)
      .filter(Boolean)
      .map((product: any) => ({
        ...product,
        categories: product.product_categories?.map((pc: any) => pc.category) || []
      }));

    res.json(products);
  } catch (error: any) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search products
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories (
          category:categories (*)
        )
      `)
      .ilike('name', `%${q}%`)
      .eq('is_active', true);

    if (error) throw error;
    
    // Transform to include categories array
    const transformedData = data?.map(product => ({
      ...product,
      categories: product.product_categories?.map((pc: any) => pc.category) || []
    }));
    
    res.json(transformedData);
  } catch (error: any) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all products for admin with categories
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories (
          category:categories (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform to include categories array
    const transformedData = data?.map(product => ({
      ...product,
      categories: product.product_categories?.map((pc: any) => pc.category) || []
    }));
    
    res.json(transformedData);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single product by ID for admin
router.get('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories (
          category:categories (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Product not found' });
      }
      throw error;
    }
    
    // Transform to include categories array
    const transformedProduct = {
      ...data,
      categories: data.product_categories?.map((pc: any) => pc.category) || []
    };
    
    res.json(transformedProduct);
  } catch (error: any) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new product (admin) - WITHOUT subcategory field
router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      name, description, price, original_price, 
      discount_percentage, image_url, stock_quantity,
      gender, sku, is_customizable, customization_price,
      max_customization_characters, max_customization_images,
      max_customization_lines, additional_images, // <-- This is where it comes from
      social_proof_enabled, social_proof_text,
      social_proof_initial_count, social_proof_end_count,
      is_active
    } = req.body;

    console.log('Creating product:', { name, price });

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        description,
        price: parseFloat(price),
        original_price: original_price ? parseFloat(original_price) : null,
        discount_percentage: discount_percentage ? parseInt(discount_percentage) : null,
        image_url,
        stock_quantity: parseInt(stock_quantity) || 0,
        gender: gender || 'unisex',
        sku,
        is_customizable: is_customizable || false,
        customization_price: customization_price ? parseFloat(customization_price) : 0,
        max_customization_characters: max_customization_characters ? parseInt(max_customization_characters) : 50,
        max_customization_images: max_customization_images ? parseInt(max_customization_images) : 10,
        max_customization_lines: max_customization_lines ? parseInt(max_customization_lines) : 0, // <-- ADD THIS LINE HERE
        additional_images: additional_images || [],
        // subcategory field REMOVED
        social_proof_enabled: social_proof_enabled !== false,
        social_proof_text: social_proof_text || '🔺{count} People are Purchasing Right Now',
        social_proof_initial_count: social_proof_initial_count ? parseInt(social_proof_initial_count) : 5,
        social_proof_end_count: social_proof_end_count ? parseInt(social_proof_end_count) : 15,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating product:', error);
      throw error;
    }

    console.log('Product created:', data.id);
    res.json({ success: true, product: data });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product (admin)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove subcategory if it exists in updates
    const { subcategory, ...cleanUpdates } = updates;
    
    // Parse number fields
    if (cleanUpdates.max_customization_lines) {
      cleanUpdates.max_customization_lines = parseInt(cleanUpdates.max_customization_lines);
    }
    
    const { data, error } = await supabase
      .from('products')
      .update({
        ...cleanUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating product:', error);
      throw error;
    }

    res.json({ success: true, product: data });
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Delete product (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related categories first
    await supabase.from('product_categories').delete().eq('product_id', id);
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add categories to product (admin)
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

    const productCategories = categories.map((c: any) => ({
      product_id: id,
      category_id: c.category_id
    }));

    const { data, error } = await supabase
      .from('product_categories')
      .insert(productCategories)
      .select(`
        *,
        category:categories (*)
      `);

    if (error) {
      console.error('Error adding categories to product:', error);
      throw error;
    }

    console.log(`Added ${data.length} categories to product ${id}`);
    res.json({ success: true, categories: data });
  } catch (error: any) {
    console.error('Error adding categories to product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all categories from product (admin)
router.delete('/:id/categories', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', id);

    if (error) {
      console.error('Error deleting categories from product:', error);
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting categories from product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all categories for product filtering (admin)
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

// Get product statistics (admin)
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, is_active, stock_quantity, price');

    if (error) throw error;

    const stats = {
      total_products: data.length,
      active_products: data.filter(p => p.is_active).length,
      inactive_products: data.filter(p => !p.is_active).length,
      total_stock: data.reduce((sum, p) => sum + (p.stock_quantity || 0), 0),
      average_price: data.reduce((sum, p) => sum + p.price, 0) / (data.length || 1)
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;