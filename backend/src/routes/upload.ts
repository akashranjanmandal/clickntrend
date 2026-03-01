import express from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadMultiple, upload } from '../middleware/cloudinaryUpload';

const router = express.Router();

// ========== PRODUCT IMAGES UPLOAD ==========
router.post('/product-images', requireAuth, uploadMultiple.array('images', 5), async (req, res) => {
  console.log('📸 POST /api/upload/product-images - Uploading product images to Cloudinary');
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`📤 Uploading ${files.length} images to Cloudinary`);

    // @ts-ignore - Multer-Cloudinary adds these properties
    const uploadedImages = files.map((file: any, index) => ({
      url: file.path,
      public_id: file.filename,
      is_primary: index === 0 // First image is primary by default
    }));

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

// ========== SINGLE IMAGE UPLOAD (General Purpose) ==========
router.post('/single', requireAuth, upload.single('image'), async (req, res) => {
  console.log('📸 POST /api/upload/single - Uploading single image to Cloudinary');
  try {
    const file = req.file as any;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      url: file.path,
      public_id: file.filename
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== CUSTOMIZATION IMAGE UPLOAD ==========
router.post('/customization', upload.single('image'), async (req, res) => {
  console.log('🎨 POST /api/upload/customization - Uploading customization image to Cloudinary');
  try {
    const file = req.file as any;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      image_url: file.path,
      public_id: file.filename
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== HERO MEDIA UPLOAD ==========
router.post('/hero', requireAuth, upload.single('media'), async (req, res) => {
  console.log('🎬 POST /api/upload/hero - Uploading hero media to Cloudinary');
  try {
    const file = req.file as any;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if it's video by looking at the format or path
    const isVideo = file.path?.includes('video') || file.mimetype?.startsWith('video/');

    res.json({
      success: true,
      media_url: file.path,
      media_type: isVideo ? 'video' : 'image',
      public_id: file.filename
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== LOGO UPLOAD ==========
router.post('/logo', requireAuth, upload.single('image'), async (req, res) => {
  console.log('🎯 POST /api/upload/logo - Uploading logo to Cloudinary');
  try {
    const file = req.file as any;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      url: file.path,
      public_id: file.filename
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;