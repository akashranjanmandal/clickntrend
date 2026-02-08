import express from 'express';
import multer from 'multer';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Configure multer for file upload (5MB max)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Add multer types to Request
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// ========== IMAGE UPLOAD ========== //

// Upload product image
router.post('/upload-image', requireAuth, upload.single('image'), async (req: express.Request, res: express.Response) => {
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
      .from('giftshop')  // Your bucket name
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
router.get('/products', requireAuth, async (req: express.Request, res: express.Response) => {
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
router.post('/products', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { 
      name, description, category, price, original_price, 
      discount_percentage, image_url, stock_quantity 
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
        is_active: true
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
router.put('/products/:id', requireAuth, async (req: express.Request, res: express.Response) => {
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
router.delete('/products/:id', requireAuth, async (req: express.Request, res: express.Response) => {
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

// ========== ORDERS ========== //

// Get all orders for admin
router.get('/orders', requireAuth, async (req: express.Request, res: express.Response) => {
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
router.get('/orders/:id', requireAuth, async (req: express.Request, res: express.Response) => {
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
router.put('/orders/:id', requireAuth, async (req: express.Request, res: express.Response) => {
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
router.get('/combos', requireAuth, async (req: express.Request, res: express.Response) => {
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

// Create new combo
router.post('/combos', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { 
      name, description, discount_percentage, discount_price,
      image_url, products 
    } = req.body;

    console.log('Creating combo:', { name, products: products?.length });

    // Create combo
    const { data: combo, error: comboError } = await supabase
      .from('combos')
      .insert({
        name,
        description,
        discount_percentage: discount_percentage ? parseInt(discount_percentage) : null,
        discount_price: discount_price ? parseFloat(discount_price) : null,
        image_url,
        is_active: true
      })
      .select()
      .single();

    if (comboError) throw comboError;

    // Add products to combo
    if (products && products.length > 0) {
      const comboProducts = products.map((product: any) => ({
        combo_id: combo.id,
        product_id: product.id,
        quantity: product.quantity || 1
      }));

      const { error: productsError } = await supabase
        .from('combo_products')
        .insert(comboProducts);

      if (productsError) throw productsError;
    }

    console.log('Combo created:', combo.id);
    res.json({ success: true, combo });
  } catch (error: any) {
    console.error('Create combo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update combo
router.put('/combos/:id', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('combos')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, combo: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete combo
router.delete('/combos/:id', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('combos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Combo deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TEST ENDPOINT ========== //
router.get('/test', (req: express.Request, res: express.Response) => {
  res.json({ message: 'Admin API is working!' });
});

export default router;