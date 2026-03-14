import express, { Request, Response } from "express";
import multer from 'multer';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import { r2 } from '../utils/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// ========== IMAGE UPLOAD ========== //

// Upload product/combo image
router.post('/upload-image', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `product-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExtension}`;

    console.log('Uploading to R2:', fileName);

    // ✅ Upload to R2
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: `products/${fileName}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    // ✅ Public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/products/${fileName}`;

    res.json({
      success: true,
      image_url: publicUrl,
      file_name: fileName,
      message: 'Image uploaded successfully'
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload image'
    });
  }
});

// ========== PRODUCTS ========== //

// Get all products for admin with categories
router.get('/products', requireAuth, async (req: Request, res: Response) => {
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

// Create new product - WITHOUT subcategory field
router.post('/products', requireAuth, async (req: Request, res: Response) => {
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
// Update product - WITHOUT category field
router.put('/products/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove category fields if they exist (to avoid errors)
    const { category, categories, subcategory, ...cleanUpdates } = updates;
    
    // Parse number fields if they exist
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

// Delete product
router.delete('/products/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check if product is used in any orders
    const { data: orderItems, error: checkError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (checkError) throw checkError;

    // If product is used in orders, don't allow deletion
    if (orderItems && orderItems.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product that has existing orders. Consider deactivating it instead.' 
      });
    }

    // Check if product is used in any combos
    const { data: comboProducts, error: comboCheckError } = await supabase
      .from('combo_products')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (comboCheckError) throw comboCheckError;

    if (comboProducts && comboProducts.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product that is part of a combo. Remove it from combos first.' 
      });
    }

    // If no dependencies, proceed with deletion
    // First delete related product categories
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

// ========== PRODUCT CATEGORIES ROUTES ==========

// Delete all categories from a product
router.delete('/products/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', id);

    if (error) {
      console.error('Error deleting product categories:', error);
      throw error;
    }

    res.json({ success: true, message: 'All categories removed from product' });
  } catch (error: any) {
    console.error('Error deleting product categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add categories to a product
router.post('/products/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'No categories provided' });
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

    res.json({ success: true, categories: data });
  } catch (error: any) {
    console.error('Error adding categories to product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get categories for a specific product
router.get('/products/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('product_categories')
      .select(`
        category_id,
        category:categories (*)
      `)
      .eq('product_id', id);

    if (error) throw error;
    
    const categories = data.map((item: any) => item.category);
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== CATEGORIES ========== //

// Get all categories for admin
router.get('/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({ 
        ...req.body, 
        created_at: new Date(), 
        updated_at: new Date() 
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/categories/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ 
        ...req.body, 
        updated_at: new Date() 
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/categories/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ORDERS ========== //

// Get all orders for admin
router.get('/orders', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/orders/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/orders/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('orders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, order: data });
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== COMBOS ========== //

// Get all combos for admin with categories
router.get('/combos', requireAuth, async (req: Request, res: Response) => {
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

// Create new combo - WITHOUT category field
router.post('/combos', requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      name, description, discount_percentage, discount_price,
      image_url, is_active 
    } = req.body;

    console.log('Creating combo:', { name });

    // Create combo
    const { data: combo, error: comboError } = await supabase
      .from('combos')
      .insert({
        name,
        description,
        discount_percentage: discount_percentage ? parseInt(discount_percentage) : null,
        discount_price: discount_price ? parseFloat(discount_price) : null,
        image_url,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (comboError) {
      console.error('Error creating combo:', comboError);
      throw comboError;
    }

    console.log('Combo created:', combo.id);
    res.json({ success: true, combo });
  } catch (error: any) {
    console.error('Create combo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update combo - WITHOUT category field
router.put('/combos/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, description, discount_percentage, discount_price,
      image_url, is_active 
    } = req.body;

    console.log('Updating combo:', { id, name });

    // Update the combo
    const { data: combo, error: comboError } = await supabase
      .from('combos')
      .update({
        name,
        description,
        discount_percentage: discount_percentage ? parseInt(discount_percentage) : null,
        discount_price: discount_price ? parseFloat(discount_price) : null,
        image_url,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (comboError) {
      console.error('Error updating combo:', comboError);
      throw comboError;
    }

    console.log('Combo updated:', id);
    res.json({ success: true, combo });
  } catch (error: any) {
    console.error('Update combo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete combo
router.delete('/combos/:id', requireAuth, async (req: Request, res: Response) => {
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

// ========== COMBO PRODUCTS ROUTES ==========

// Get products for a specific combo
router.get('/combos/:comboId/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { comboId } = req.params;
    
    const { data, error } = await supabase
      .from('combo_products')
      .select(`
        product_id,
        quantity,
        product:products (*)
      `)
      .eq('combo_id', comboId);

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching combo products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add products to a combo
router.post('/combos/:comboId/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { comboId } = req.params;
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products provided' });
    }

    const comboProducts = products.map((p: any) => ({
      combo_id: comboId,
      product_id: p.product_id,
      quantity: p.quantity || 1
    }));

    const { data, error } = await supabase
      .from('combo_products')
      .insert(comboProducts)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error adding combo products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all products from a combo
router.delete('/combos/:comboId/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { comboId } = req.params;

    const { error } = await supabase
      .from('combo_products')
      .delete()
      .eq('combo_id', comboId);

    if (error) throw error;
    res.json({ success: true, message: 'All products removed from combo' });
  } catch (error: any) {
    console.error('Error deleting combo products:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== COMBO CATEGORIES ROUTES ==========

// Delete all categories from a combo
router.delete('/combos/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('combo_categories')
      .delete()
      .eq('combo_id', id);

    if (error) {
      console.error('Error deleting combo categories:', error);
      throw error;
    }

    res.json({ success: true, message: 'All categories removed from combo' });
  } catch (error: any) {
    console.error('Error deleting combo categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add categories to a combo
router.post('/combos/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'No categories provided' });
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

    res.json({ success: true, categories: data });
  } catch (error: any) {
    console.error('Error adding categories to combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get categories for a specific combo
router.get('/combos/:id/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('combo_categories')
      .select(`
        category_id,
        category:categories (*)
      `)
      .eq('combo_id', id);

    if (error) throw error;
    
    const categories = data.map((item: any) => item.category);
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching combo categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update specific product quantity in combo (admin)
router.put('/combos/:id/products/:productId', requireAuth, async (req: Request, res: Response) => {
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
router.delete('/combos/:id/products/:productId', requireAuth, async (req: Request, res: Response) => {
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
router.get('/stats/summary', requireAuth, async (req: Request, res: Response) => {
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
router.post('/combos/:id/products/bulk', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array is required' });
    }

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
router.get('/available-products', requireAuth, async (req: Request, res: Response) => {
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
router.get('/categories/all', requireAuth, async (req: Request, res: Response) => {
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
router.post('/combos/:id/duplicate', requireAuth, async (req: Request, res: Response) => {
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

// ========== TEST ENDPOINT ========== //
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Admin API is working!' });
});

export default router;