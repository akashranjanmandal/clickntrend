import express from 'express';
import multer from 'multer';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// ========== PRODUCT IMAGES UPLOAD ==========
router.post('/product-images', requireAuth, upload.array('images', 5), async (req, res) => {
  console.log('📸 POST /api/upload/product-images - Uploading product images');
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`📤 Uploading ${files.length} images`);

    const uploadPromises = files.map(async (file, index) => {
      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('giftshop')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        filename: fileName,
        is_primary: index === 0 // First image is primary by default
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);

    console.log(`✅ Successfully uploaded ${uploadedImages.length} images`);

    res.json({
      success: true,
      images: uploadedImages
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload images',
      details: error.toString()
    });
  }
});

// ========== CUSTOMIZATION IMAGE UPLOAD ==========
router.post('/customization', upload.single('image'), async (req, res) => {
  console.log('🎨 POST /api/upload/customization - Uploading customization image');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const productId = req.body.product_id || 'temp';
    
    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `customizations/${productId}/${Date.now()}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('giftshop')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('giftshop')
      .getPublicUrl(fileName);

    console.log('✅ Customization image uploaded:', publicUrl);

    res.json({
      success: true,
      image_url: publicUrl,
      file_name: fileName
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== HERO MEDIA UPLOAD ==========
router.post('/hero', requireAuth, upload.single('media'), async (req, res) => {
  console.log('🎬 POST /api/upload/hero - Uploading hero media');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const isVideo = file.mimetype.startsWith('video/');
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `hero/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('giftshop')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('giftshop')
      .getPublicUrl(fileName);

    console.log('✅ Hero media uploaded:', publicUrl);

    res.json({
      success: true,
      media_url: publicUrl,
      media_type: isVideo ? 'video' : 'image',
      file_name: fileName
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;