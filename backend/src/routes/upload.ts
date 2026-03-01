import express from 'express';
import multer from 'multer';
import { uploadToCloudinary, uploadMultipleToCloudinary } from '../utils/cloudinary';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload multiple images (for products)
router.post('/multiple', requireAuth, upload.array('images', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const folder = req.body.folder || 'giftshop/products';
    const buffers = files.map(f => f.buffer);
    const urls = await uploadMultipleToCloudinary(buffers, folder);
    
    const images = urls.map((url, index) => ({
      url,
      is_primary: index === 0
    }));

    res.json({ success: true, images });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload single image
router.post('/single', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folder = req.body.folder || 'giftshop/general';
    const url = await uploadToCloudinary(req.file.buffer, folder);
    
    res.json({ success: true, url });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload product images (specific)
router.post('/product-images', requireAuth, upload.array('images', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const buffers = files.map(f => f.buffer);
    const urls = await uploadMultipleToCloudinary(buffers, 'giftshop/products');
    
    const images = urls.map((url, index) => ({
      url,
      is_primary: index === 0
    }));

    res.json({ success: true, images });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload customization image
router.post('/customization', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const productId = req.body.product_id || 'temp';
    const url = await uploadToCloudinary(req.file.buffer, `giftshop/customizations/${productId}`);
    
    res.json({ success: true, image_url: url });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload hero media
router.post('/hero', requireAuth, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const url = await uploadToCloudinary(req.file.buffer, 'giftshop/hero');
    
    res.json({
      success: true,
      media_url: url,
      media_type: isVideo ? 'video' : 'image'
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload logo
router.post('/logo', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const url = await uploadToCloudinary(req.file.buffer, 'giftshop/logos');
    
    res.json({ success: true, url });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;