import express, { Request, Response } from "express";
import multer from 'multer';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
    console.log('Upload request received');
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    console.log('File received:', file.originalname, file.size, file.mimetype);

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    console.log('Uploading to Supabase:', fileName);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('giftshop')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    console.log('Upload successful, getting public URL');

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('giftshop')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    res.json({
      success: true,
      image_url: publicUrl,
      file_name: fileName,
      message: 'Image uploaded successfully'
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload image',
      details: error.toString()
    });
  }
});

// ========== PRODUCTS ========== //

// Get all products for admin
router.get('/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new product
router.post('/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      name, description, category, price, original_price, 
      discount_percentage, image_url, stock_quantity,
      is_customizable, customization_price, max_customization_characters,
      additional_images
    } = req.body;

    console.log('Creating product:', { name, category, price, image_url });

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        description,
        category,
        price: parseFloat(price),
        original_price: original_price ? parseFloat(original_price) : null,
        discount_percentage: discount_percentage ? parseInt(discount_percentage) : null,
        image_url,
        stock_quantity: parseInt(stock_quantity) || 0,
        is_customizable: is_customizable || false,
        customization_price: customization_price ? parseFloat(customization_price) : 0,
        max_customization_characters: max_customization_characters ? parseInt(max_customization_characters) : 50,
        additional_images: additional_images || [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log('Product created:', data.id);
    res.json({ success: true, product: data });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/products/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, product: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/products/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
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
    res.status(500).json({ error: error.message });
  }
});

// ========== COMBOS ========== //

// Get all combos for admin
router.get('/combos', requireAuth, async (req: Request, res: Response) => {
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
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new combo (without products)
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

// Update combo (without products)
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
        is_active: is_active !== undefined ? is_active : true,
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
    
    // First delete combo products (due to foreign key constraint)
    const { error: productsError } = await supabase
      .from('combo_products')
      .delete()
      .eq('combo_id', id);

    if (productsError) throw productsError;
    
    // Then delete the combo
    const { error } = await supabase
      .from('combos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Combo deleted successfully' });
  } catch (error: any) {
    console.error('Delete combo error:', error);
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

// Update combo products (replace all)
router.put('/combos/:comboId/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { comboId } = req.params;
    const { products } = req.body;

    // Start a transaction - delete all existing products first
    const { error: deleteError } = await supabase
      .from('combo_products')
      .delete()
      .eq('combo_id', comboId);

    if (deleteError) throw deleteError;

    // If no new products, just return success
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.json({ success: true, message: 'All products removed from combo' });
    }

    // Add new products
    const comboProducts = products.map((p: any) => ({
      combo_id: comboId,
      product_id: p.product_id,
      quantity: p.quantity || 1
    }));

    const { data, error: insertError } = await supabase
      .from('combo_products')
      .insert(comboProducts)
      .select();

    if (insertError) throw insertError;

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating combo products:', error);
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

// ========== TEST ENDPOINT ========== //
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Admin API is working!' });
});

export default router;